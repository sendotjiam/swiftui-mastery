#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const CDP_HOST = "127.0.0.1";
const CDP_PORT = 9222;
const SITE_URL = "http://localhost:4173/site/";
const OUTPUT_PATH = path.resolve(__dirname, "../assets/images/deck-preview.png");
const STORAGE_KEY = "swiftui-study-deck-state-v1";

function getJson(route) {
    return new Promise((resolve, reject) => {
        const request = http.get({ host: CDP_HOST, port: CDP_PORT, path: route }, (response) => {
            let data = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                data += chunk;
            });
            response.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        });
        request.on("error", reject);
    });
}

function connectDebugger(webSocketDebuggerUrl) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketDebuggerUrl);
        const pending = new Map();
        let id = 0;

        socket.addEventListener("open", () => {
            resolve({
                send(method, params = {}) {
                    id += 1;
                    const messageId = id;
                    socket.send(JSON.stringify({ id: messageId, method, params }));
                    return new Promise((messageResolve, messageReject) => {
                        pending.set(messageId, { resolve: messageResolve, reject: messageReject });
                    });
                },
                close() {
                    socket.close();
                }
            });
        });

        socket.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            const waiter = pending.get(message.id);
            if (!waiter) {
                return;
            }
            pending.delete(message.id);
            if (message.error) {
                waiter.reject(new Error(message.error.message));
            } else {
                waiter.resolve(message.result);
            }
        });

        socket.addEventListener("error", reject);
    });
}

async function wait(client, ms) {
    await client.send("Runtime.evaluate", {
        expression: `new Promise((resolve) => setTimeout(resolve, ${ms}))`,
        awaitPromise: true
    });
}

async function main() {
    const targets = await getJson("/json/list");
    const target = targets.find((item) => item.type === "page" && item.url.startsWith(SITE_URL))
        || targets.find((item) => item.type === "page");

    if (!target) {
        throw new Error("No Chrome page target found. Start Chrome with --remote-debugging-port=9222 and open the deck first.");
    }

    const client = await connectDebugger(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 980,
        deviceScaleFactor: 1,
        mobile: false
    });
    await client.send("Page.navigate", { url: `${SITE_URL}?capture=${Date.now()}` });
    await wait(client, 600);
    await client.send("Runtime.evaluate", {
        expression: `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`,
        awaitPromise: true
    });
    await client.send("Page.navigate", { url: `${SITE_URL}?capture=${Date.now() + 1}` });
    await wait(client, 900);

    const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
    });

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, Buffer.from(result.data, "base64"));
    client.close();

    console.log(`Captured ${path.relative(path.resolve(__dirname, "../.."), OUTPUT_PATH)}`);
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});
