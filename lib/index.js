"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxiesIp = exports.filterAliveProxies = exports.checkProxyIsAlive = void 0;
const axios_1 = __importDefault(require("axios"));
const got_1 = __importDefault(require("got"));
const debug_1 = __importDefault(require("./debug"));
const util_1 = require("./util");
const checkProxyIsAlive = async (proxyIp, { timeout, testingSite, testingFunction, onProxyStatus }) => {
    debug_1.default(`Checking proxy: ${proxyIp}`);
    let [host, portStr] = proxyIp.split(":");
    let port = +portStr;
    if (isNaN(port))
        throw TypeError(`Port in ${proxyIp} is not a number. Check the source`);
    const cancelSource = axios_1.default.CancelToken.source(), cancelTimeout = setTimeout(() => cancelSource.cancel("proxy_timeout"), timeout);
    try {
        let response = await axios_1.default.get(testingSite, {
            proxy: {
                host: host,
                port
            },
            cancelToken: cancelSource.token
        });
        await testingFunction(response, proxyIp);
        onProxyStatus?.(proxyIp, true);
        debug_1.default("Found working proxy ", proxyIp);
    }
    catch (err) {
        debug_1.default(`${proxyIp} failed. Reason: ${err.message}`);
        onProxyStatus?.(proxyIp, false, err.message);
        throw err;
    }
    finally {
        clearTimeout(cancelTimeout);
    }
};
exports.checkProxyIsAlive = checkProxyIsAlive;
/**
 * Filters proxyList and return only alive
 *
 * @param proxyList Array of proxy IP (host:port) to test in parallel
 */
const filterAliveProxies = async (proxyList, options) => {
    const result = await Promise.allSettled(proxyList.map(proxyIp => exports.checkProxyIsAlive(proxyIp, options)));
    return util_1.mapAndFilter(result, ({ status }, index) => status === "fulfilled" ? proxyList[index] : undefined);
};
exports.filterAliveProxies = filterAliveProxies;
const getProxiesIp = async ({ proxyProviders, onNextProvider }) => {
    for (let proxyProvider of proxyProviders) {
        onNextProvider?.(proxyProvider.name);
        if ("proxyIp" in proxyProvider)
            return [proxyProvider.proxyIp];
        const { name, url, parseProxies } = proxyProvider;
        try {
            let response = await got_1.default(url, {
                responseType: "text"
            });
            return parseProxies(response);
        }
        catch (err) {
            debug_1.default(`Unable to get proxy list from ${name}: ${err.message}`);
            continue;
        }
    }
    throw new Error("Unable to fetch any proxy list");
};
exports.getProxiesIp = getProxiesIp;
