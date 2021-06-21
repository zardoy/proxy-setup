import cheerio from "cheerio";
import isOnline from "is-online";
import _ from "lodash";

import { checkProxyIsAlive, filterAliveProxies, getProxiesIp } from "../lib";
import debug from "../lib/debug";
import proxyProviders from "./providers";

const testingSite = "http://rutor.info/top";
const testingFunction = ({ data }, proxyIp: string) => {
    let $ = cheerio.load(data);
    const testingElementFound = !!$("div#index > table")[0];
    if (!testingElementFound) {
        debug("Can't find table on working proxy!", proxyIp);
        throw new Error("Can't find testing element, skipping...");
    }
};

export const proxyCheckTimeout = 8_000;

interface GetAliveProxyParams {
    proxies: string[] | Iterable<string>,
    parallel: number,
    hooks: Partial<{
        proxyGroupStart: (proxies: string[]) => unknown;
        proxyStatus: (proxy: string, success: boolean, err?: string) => unknown;
    }>;
    retries: number;
}

export interface ProxyResult {
    ip: string;
    /** always in ms */
    time: number;
}

const getAliveProxiesFromList = async ({
    proxies, parallel, retries, hooks: { proxyGroupStart, proxyStatus }
}: GetAliveProxyParams): Promise<ProxyResult[]> => {
    let aliveProxies: ProxyResult[] = [];
    while (true) {
        const currentProxies: string[] = [];
        let i = 0;
        for (let proxy of proxies) {
            currentProxies.push(proxy);
            if (++i >= parallel) break;
        }
        let proxiesResult: PromiseSettledResult<void>[] = [];
        for (let i = 0; i < retries; i++) {
            proxyGroupStart?.(currentProxies);
            const startTime = Date.now();
            proxiesResult = await Promise.allSettled(
                currentProxies.map(proxyIp =>
                    checkProxyIsAlive(proxyIp, {
                        testingSite,
                        testingFunction,
                        timeout: proxyCheckTimeout,
                        onProxyStatus: (ip, success, err) => {
                            proxyStatus?.(ip, success, err);
                            if (!success) return;
                            aliveProxies.push({
                                ip,
                                time: Date.now() - startTime
                            });
                        }
                    })
                )
            );
        }
        if (aliveProxies.length >= 2) {
            return _.uniqBy(
                _.sortBy(aliveProxies, o => o.time), o => o.ip
            );
        }
        if (currentProxies.length < parallel) {
            const lastResult = proxiesResult.slice(-1)[0]!;
            if (lastResult.status !== "rejected") throw new Error(`never`);
            throw new Error(`All proxies are failed. The error of last one: ${lastResult.reason}`);
        }
    }
};

interface Params {
    debugHooks?: {
        proxyProviderStart: (name: string) => unknown;
        proxyGroupStart: (proxies: string[]) => unknown;
        proxyStatus: (proxy: string, success: boolean, err?: string) => unknown;
    };
}

export const getAliveProxies = async (previousProxies: string[], { debugHooks }: Params): Promise<ProxyResult[]> => {
    debug("Checking internet connection");
    if (await isOnline() === false) {
        //todo show user that internet is down
        throw new Error("Internet is down. Failed to get dns of google.com");
    }
    debug("Internet is up");

    if (previousProxies.length) {
        // todo-low more clear messages?
        debug("Checking proxies from previous session");
        const startTime = Date.now();
        const aliveProxies: ProxyResult[] = [];
        await filterAliveProxies(previousProxies, {
            testingFunction,
            testingSite,
            timeout: 3000,
            onProxyStatus: (ip, success) => {
                if (!success) return;
                aliveProxies.push({
                    ip,
                    time: Date.now() - startTime
                });
            }
        });
        if (aliveProxies.length) return aliveProxies;
        debug("Previous proxies are dead, obtaining new one");
    }

    debug("Fetching list of proxies to check");
    let proxiesProvider: string | undefined;
    let proxies = await getProxiesIp({
        proxyProviders,
        onNextProvider: name => {
            proxiesProvider = name;
            debugHooks?.proxyProviderStart(name);
        }
    });
    debug(`Proxies list fethced from ${proxiesProvider}`);
    let aliveProxies = await getAliveProxiesFromList({
        proxies,
        // todo-moderate remove it and use stable proxy
        parallel: 10,
        hooks: {
            proxyGroupStart: debugHooks?.proxyGroupStart,
            proxyStatus: debugHooks?.proxyStatus
        },
        retries: 1
    });
    debug(`Approved working proxies: ${aliveProxies}`);
    return aliveProxies;
};
