import React, { useEffect, useState } from "react";

import { render, Text } from "ink";
import Spinner from "ink-spinner";
import { modifyJsonFile } from "modify-json-file";
import path from "path";

import { getAliveProxies, proxyCheckTimeout, ProxyResult } from "../src/filmomania";

type ProxyStatus = {
    ip: string;
} & ({
    status: "loading";
} | {
    status: "failed";
    error: string;
} | {
    status: "success";
    time: number;
});
// todo use async status

type ProgressBarProps = {
    cells: number;
    value: number;
} & Pick<React.ComponentProps<typeof Text>, "color" | "backgroundColor" | "inverse" | "dimColor" | "wrap">;
const InlineProgressBar: React.FC<ProgressBarProps> = ({ value, cells: cellsMax, ...textProps }) => {
    const symbol = "█";
    const [cells, setCells] = useState(0);

    useEffect(() => {
        setCells(value * cellsMax);
    }, [value, cellsMax]);

    return <Text
        {...textProps}
    >
        [{symbol.repeat(cells).padEnd(cellsMax)}]
    </Text>;
};

const ProxySetter = () => {
    // used in end
    const [startTime] = useState(() => Date.now());
    const [foundProxies, setFoundProxies] = useState(undefined as ProxyResult[] | undefined);

    // provider
    const [activeProvider, setActiveProvider] = useState("");
    const [providerSetted, setProviderSetted] = useState(false);

    // used in every group
    const [iteration, setIteration] = useState(0);
    const [proxies, setProxies] = useState([] as ProxyStatus[]);
    const [passedTime, setPassedTime] = useState(0);

    useEffect(() => {
        let interval: number | undefined;
        (async () => {
            let startGroupTime = 0;
            const foundProxies = await getAliveProxies([], {
                debugHooks: {
                    proxyProviderStart: setActiveProvider,
                    proxyGroupStart: (proxies) => {
                        setProviderSetted(true);
                        setIteration(n => n + 1);
                        setProxies(
                            proxies.map(proxy => ({
                                ip: proxy,
                                // todo fix ts no suggestions and no refactoring support
                                status: "loading"
                            }))
                        );
                        startGroupTime = Date.now();
                        setPassedTime(0);
                        interval && clearInterval(interval);
                        interval = setInterval(() => setPassedTime(n => n + 500), 500) as any;
                    },
                    proxyStatus: (proxyIp, success, err) => {
                        setProxies(proxiesOld => {
                            const proxies = [...proxiesOld];
                            const proxyIndex = proxies.findIndex(p => p.ip === proxyIp);
                            const time = Date.now() - startGroupTime;
                            proxies[proxyIndex] = {
                                ip: proxies[proxyIndex]!.ip,
                                ...success ? {
                                    status: "success",
                                    time
                                } : {
                                    status: "failed",
                                    error: err!
                                }
                            };
                            return proxies;
                        });
                    }
                }
            });
            await modifyJsonFile<string[]>(path.join(__dirname, "proxies.json"), proxies => {
                return foundProxies.map(p => p.ip);
            }, { tabSize: 4 });
            setFoundProxies(foundProxies);
            clearInterval(interval);
        })();
        return () => clearInterval(interval);
    }, []);

    return <>
        <Text bold>{!providerSetted && <Spinner />} Provider: {activeProvider}</Text>
        {iteration ? <Text>Iteration: {iteration} * 12 = {iteration * 12}.Timeout: <InlineProgressBar
            cells={proxyCheckTimeout / 1000}
            value={passedTime / proxyCheckTimeout}
        /></Text> : null}
        {
            proxies.map(proxy => {
                return <Text
                    key={proxy.ip}
                    color={proxy.status === "success" ? "green" : proxy.status === "failed" ? "red" : undefined}
                >
                    {proxy.status === "loading" ? <Spinner /> : " "} {proxy.ip}{" "}
                    {proxy.status === "failed" ? proxy.error : proxy.status === "success" ? <Text bold>+{proxy.time / 1000}s</Text> : null}
                </Text>;
            })
        }
        {foundProxies && <Text color="blueBright">
            Done in <Text bold>{(Date.now() - startTime) / 1000}s</Text>. Proxies: <Text bold>{foundProxies.map(p => `${p.ip} (${p.time / 1000}s)`).join(", ")}</Text>
        </Text>}
    </>;
};

render(<ProxySetter />);
