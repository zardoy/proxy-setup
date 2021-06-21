import { Response } from "got";

import { ProxyProvider } from "../lib";

// todo add support for https://gimmeproxy.com/api/getProxy?protocol=http <-- in avarage there're faster
const proxyProviders: ProxyProvider[] = [
    {
        name: "Spys.me",//special thanks to site maintainer!
        url: "http://spys.me/proxy.txt",
        // todo use generator
        parseProxies(response: Response<string>): Iterable<string> {
            if (response.headers["content-type"] !== "text/plain") {
                throw new TypeError("Wrong content-type");
            }
            const regex = /\b(?<ip>(\d+\.){3}\d+:\d+) (?!RU)/gi;
            return {
                [Symbol.iterator]() {
                    // standard regex for proxy but with ignoring russian proxies
                    return {
                        next: () => {
                            const ipEntry = regex.exec(response.body);
                            if (ipEntry) {
                                return {
                                    done: false,
                                    value: ipEntry.groups!.ip!
                                };
                            } else {
                                return { done: true, value: undefined };
                            }
                        }
                    };
                }
            };
        }
    }
];

export default proxyProviders;
