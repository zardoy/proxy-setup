"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAliveProxies = exports.proxyCheckTimeout = void 0;
const cheerio_1 = __importDefault(require("cheerio"));
const is_online_1 = __importDefault(require("is-online"));
const lodash_1 = __importDefault(require("lodash"));
const lib_1 = require("../lib");
const debug_1 = __importDefault(require("../lib/debug"));
const providers_1 = __importDefault(require("./providers"));
const testingSite = "http://rutor.info/top";
const testingFunction = ({ data }, proxyIp) => {
    let $ = cheerio_1.default.load(data);
    const testingElementFound = !!$("div#index > table")[0];
    if (!testingElementFound) {
        debug_1.default("Can't find table on working proxy!", proxyIp);
        throw new Error("Can't find testing element, skipping...");
    }
};
exports.proxyCheckTimeout = 8000;
const getAliveProxiesFromList = async ({ proxies, parallel, retries, hooks: { proxyGroupStart, proxyStatus } }) => {
    let aliveProxies = [];
    while (true) {
        const currentProxies = [];
        let i = 0;
        for (let proxy of proxies) {
            currentProxies.push(proxy);
            if (++i >= parallel)
                break;
        }
        let proxiesResult = [];
        for (let i = 0; i < retries; i++) {
            proxyGroupStart?.(currentProxies);
            const startTime = Date.now();
            proxiesResult = await Promise.allSettled(currentProxies.map(proxyIp => lib_1.checkProxyIsAlive(proxyIp, {
                testingSite,
                testingFunction,
                timeout: exports.proxyCheckTimeout,
                onProxyStatus: (ip, success, err) => {
                    proxyStatus?.(ip, success, err);
                    if (!success)
                        return;
                    aliveProxies.push({
                        ip,
                        time: Date.now() - startTime
                    });
                }
            })));
        }
        if (aliveProxies.length >= 2) {
            return lodash_1.default.uniqBy(lodash_1.default.sortBy(aliveProxies, o => o.time), o => o.ip);
        }
        if (currentProxies.length < parallel) {
            const lastResult = proxiesResult.slice(-1)[0];
            if (lastResult.status !== "rejected")
                throw new Error(`never`);
            throw new Error(`All proxies are failed. The error of last one: ${lastResult.reason}`);
        }
    }
};
const getAliveProxies = async (previousProxies, { debugHooks }) => {
    debug_1.default("Checking internet connection");
    if (await is_online_1.default() === false) {
        //todo show user that internet is down
        throw new Error("Internet is down. Failed to get dns of google.com");
    }
    debug_1.default("Internet is up");
    if (previousProxies.length) {
        // todo-low more clear messages?
        debug_1.default("Checking proxies from previous session");
        const startTime = Date.now();
        const aliveProxies = [];
        await lib_1.filterAliveProxies(previousProxies, {
            testingFunction,
            testingSite,
            timeout: 3000,
            onProxyStatus: (ip, success) => {
                if (!success)
                    return;
                aliveProxies.push({
                    ip,
                    time: Date.now() - startTime
                });
            }
        });
        if (aliveProxies.length)
            return aliveProxies;
        debug_1.default("Previous proxies are dead, obtaining new one");
    }
    debug_1.default("Fetching list of proxies to check");
    let proxiesProvider;
    let proxies = await lib_1.getProxiesIp({
        proxyProviders: providers_1.default,
        onNextProvider: name => {
            proxiesProvider = name;
            debugHooks?.proxyProviderStart(name);
        }
    });
    debug_1.default(`Proxies list fethced from ${proxiesProvider}`);
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
    debug_1.default(`Approved working proxies: ${aliveProxies}`);
    return aliveProxies;
};
exports.getAliveProxies = getAliveProxies;
