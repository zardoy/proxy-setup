
import axios, { AxiosResponse } from "axios";
import got, { Response } from "got";

import debug from "./debug";
import { mapAndFilter } from "./util";

export type ProxyProvider = {
    name: string;
    url: string;
    parseProxies: (response: Response<string>) => Iterable<string>;
} | {
    name: string;
    proxyIp: string;
};

interface CheckProxyOptions {
    timeout: number;
    testingSite: string;
    /** Gets content of `testingSite` in `data`. Should throw if check is not successful */
    testingFunction: (axiosRespones: AxiosResponse, proxyIp: string) => void | Promise<void>;
    onProxyStatus?: (proxyIp: string, success: boolean, err?: string) => unknown;
}

export const checkProxyIsAlive = async (proxyIp: string, { timeout, testingSite, testingFunction, onProxyStatus }: CheckProxyOptions) => {
    debug(`Checking proxy: ${proxyIp}`);
    let [host, portStr] = proxyIp.split(":");
    let port = +portStr!;
    if (isNaN(port)) throw TypeError(`Port in ${proxyIp} is not a number. Check the source`);
    const cancelSource = axios.CancelToken.source(),
        cancelTimeout = setTimeout(() => cancelSource.cancel("proxy_timeout"), timeout);
    try {
        let response = await axios.get(testingSite, {
            proxy: {
                host: host!,
                port
            },
            cancelToken: cancelSource.token
        });
        await testingFunction(response, proxyIp);
        onProxyStatus?.(proxyIp, true);
        debug("Found working proxy ", proxyIp);
    } catch (err) {
        debug(`${proxyIp} failed. Reason: ${err.message}`);
        onProxyStatus?.(proxyIp, false, err.message);
        throw err;
    } finally {
        clearTimeout(cancelTimeout);
    }
};

/**
 * Filters proxyList and return only alive
 *
 * @param proxyList Array of proxy IP (host:port) to test in parallel
 */
export const filterAliveProxies = async (proxyList: string[], options: CheckProxyOptions): Promise<string[]> => {
    const result = await Promise.allSettled(
        proxyList.map(proxyIp => checkProxyIsAlive(proxyIp, options))
    );
    return mapAndFilter(result, ({ status }, index) => status === "fulfilled" ? proxyList[index] : undefined);
};

interface GetProxiesIpParams {
    proxyProviders: ProxyProvider[];
    onNextProvider?: (name: string) => unknown;
}
export const getProxiesIp = async ({ proxyProviders, onNextProvider }: GetProxiesIpParams): Promise<string[] | Iterable<string>> => {
    for (let proxyProvider of proxyProviders) {
        onNextProvider?.(proxyProvider.name);
        if ("proxyIp" in proxyProvider) return [proxyProvider.proxyIp];
        const { name, url, parseProxies } = proxyProvider;
        try {
            let response = await got(url, {
                responseType: "text"
            });
            return parseProxies(response);
        } catch (err) {
            debug(`Unable to get proxy list from ${name}: ${err.message}`);
            continue;
        }
    }
    throw new Error("Unable to fetch any proxy list");
};