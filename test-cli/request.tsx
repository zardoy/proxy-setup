// todo into separate package

import { readFile } from "jsonfile";
import path from "path";

import { requestSiteWithProxies } from "../src/filmomania/request";

(async () => {
    console.log("start");
    const proxies = process.argv[2] ? [process.argv[2]] : await readFile(
        path.join(__dirname, "proxies.json")
    );
    if (!Array.isArray(proxies)) throw new TypeError(`proxies.json is not an array`);

    const numberOfProxyCompanions = 4;

    console.time("request");
    const successfulRequest = await requestSiteWithProxies(proxies.slice(0, numberOfProxyCompanions), "http://rutor.info/top", undefined, proxy => console.log("Won", proxy));
    console.timeEnd("request");
    const { status, statusText } = successfulRequest;
    console.log(status, statusText);

    // your proxy companions gave up
})();
