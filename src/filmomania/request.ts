import axios, { AxiosResponse, CancelToken } from "axios";
import pAny from "p-any";

type SuccessProxyCallback = (proxyIp: string) => unknown;

/** Basic function */
export const requestSiteWithProxy = async (site: string, proxyIp: string, cancelToken: CancelToken, proxySuccessCallback?: SuccessProxyCallback): Promise<AxiosResponse> => {
    const proxyParts = proxyIp.split(":");

    const response = await axios.get(site, {
        proxy: {
            host: proxyParts[0]!,
            port: +proxyParts[1]!
        },
        cancelToken
    });
    proxySuccessCallback?.(proxyIp);
    return response;
};

/**
 * @throws
 * 
 * @param proxies Should be controlled by number of companions
 */
export const requestSiteWithProxies = async (proxies: string[], site: string, timeout = 4000, proxySuccessCallback?: SuccessProxyCallback): Promise<AxiosResponse> => {
    const cancelSource = axios.CancelToken.source();
    const successfulRequest = await pAny<AxiosResponse>(
        [
            ...proxies.map(proxyIp =>
                requestSiteWithProxy(site, proxyIp, cancelSource.token, proxySuccessCallback)
            ),
            new Promise<never>((_, reject) => setTimeout(() => reject("timeout"), timeout))
        ]
    ).finally(() => cancelSource.cancel());
    return successfulRequest;
};