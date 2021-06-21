import { AxiosResponse, CancelToken } from "axios";
declare type SuccessProxyCallback = (proxyIp: string) => unknown;
/** Basic function */
export declare const requestSiteWithProxy: (site: string, proxyIp: string, cancelToken: CancelToken, proxySuccessCallback?: SuccessProxyCallback | undefined) => Promise<AxiosResponse>;
/**
 * @throws
 *
 * @param proxies Should be controlled by number of companions
 */
export declare const requestSiteWithProxies: (proxies: string[], site: string, timeout?: number, proxySuccessCallback?: SuccessProxyCallback | undefined) => Promise<AxiosResponse>;
export {};
