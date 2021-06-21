export declare const proxyCheckTimeout = 8000;
export interface ProxyResult {
    ip: string;
    /** always in ms */
    time: number;
}
interface Params {
    debugHooks?: {
        proxyProviderStart: (name: string) => unknown;
        proxyGroupStart: (proxies: string[]) => unknown;
        proxyStatus: (proxy: string, success: boolean, err?: string) => unknown;
    };
}
export declare const getAliveProxies: (previousProxies: string[], { debugHooks }: Params) => Promise<ProxyResult[]>;
export {};
