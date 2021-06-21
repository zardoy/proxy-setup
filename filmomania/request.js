"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestSiteWithProxies = exports.requestSiteWithProxy = void 0;
const axios_1 = __importDefault(require("axios"));
const p_any_1 = __importDefault(require("p-any"));
/** Basic function */
const requestSiteWithProxy = async (site, proxyIp, cancelToken, proxySuccessCallback) => {
    const proxyParts = proxyIp.split(":");
    const response = await axios_1.default.get(site, {
        proxy: {
            host: proxyParts[0],
            port: +proxyParts[1]
        },
        cancelToken
    });
    proxySuccessCallback?.(proxyIp);
    return response;
};
exports.requestSiteWithProxy = requestSiteWithProxy;
/**
 * @throws
 *
 * @param proxies Should be controlled by number of companions
 */
const requestSiteWithProxies = async (proxies, site, timeout = 4000, proxySuccessCallback) => {
    const cancelSource = axios_1.default.CancelToken.source();
    const successfulRequest = await p_any_1.default([
        ...proxies.map(proxyIp => exports.requestSiteWithProxy(site, proxyIp, cancelSource.token, proxySuccessCallback)),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), timeout))
    ]).finally(() => cancelSource.cancel());
    return successfulRequest;
};
exports.requestSiteWithProxies = requestSiteWithProxies;
