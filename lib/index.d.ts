import { AxiosResponse } from "axios";
import { Response } from "got";
export declare type ProxyProvider = {
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
export declare const checkProxyIsAlive: (proxyIp: string, { timeout, testingSite, testingFunction, onProxyStatus }: CheckProxyOptions) => Promise<void>;
/**
 * Filters proxyList and return only alive
 *
 * @param proxyList Array of proxy IP (host:port) to test in parallel
 */
export declare const filterAliveProxies: (proxyList: string[], options: CheckProxyOptions) => Promise<string[]>;
interface GetProxiesIpParams {
    proxyProviders: ProxyProvider[];
    onNextProvider?: (name: string) => unknown;
}
export declare const getProxiesIp: ({ proxyProviders, onNextProvider }: GetProxiesIpParams) => Promise<string[] | Iterable<string>>;
export {};
