#!/usr/bin/env node
"use strict";

const http = require("http");

const CDP_HOST = "127.0.0.1";
const CDP_PORT = 9222;
const SITE_URL = "http://localhost:4173/site/";
const STORAGE_KEY = "swiftui-study-deck-state-v1";

function getJson(path) {
    return new Promise((resolve, reject) => {
        const request = http.get({ host: CDP_HOST, port: CDP_PORT, path }, (response) => {
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
            if (!message.id || !pending.has(message.id)) {
                return;
            }
            const waiter = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) {
                waiter.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
            } else {
                waiter.resolve(message.result);
            }
        });

        socket.addEventListener("error", reject);
    });
}

async function findPageTarget() {
    const targets = await getJson("/json/list");
    const page = targets.find((target) => target.type === "page" && target.url.startsWith(SITE_URL))
        || targets.find((target) => target.type === "page");
    if (!page) {
        throw new Error("No Chrome page target found. Open http://localhost:4173/site/ in the debug Chrome instance.");
    }
    return page;
}

function unwrapEvaluation(result) {
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
    }
    return result.result.value;
}

function measurementExpression(label) {
    return `(() => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const doc = document.documentElement;
        const body = document.body;
        const slide = document.querySelector('.slide-card');
        const slideRect = slide ? slide.getBoundingClientRect() : null;
        const intentionalOverflow = ['.slide-body', '.thumb-list', '.study-panel', '.table-scroll', 'pre', '.code-frame pre', '.mini-diagram', '.modal-content', '.search-results'];
        const inspected = [...document.querySelectorAll('button, .pill, .slide-header h1, .slide-header h2, .cover-title h1, .workbench-copy h1, .brand p, .brand span, .counter, .thumb-title, .thumb-topic, .panel-label, .stat-grid span, .stat-grid strong')];
        const clipped = [];
        const offscreen = [];
        const tinyButtons = [];
        for (const el of inspected) {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (rect.width <= 0 || rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') continue;
            const allowed = intentionalOverflow.some((selector) => el.closest(selector));
            const clipsOwnContent = ["hidden", "clip", "scroll", "auto"].includes(style.overflowX)
                || ["hidden", "clip", "scroll", "auto"].includes(style.overflowY);
            if (!allowed && clipsOwnContent && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
                clipped.push({
                    selector: el.className || el.tagName,
                    text: (el.innerText || '').slice(0, 90),
                    rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
                    scroll: { w: el.scrollWidth, h: el.scrollHeight }
                });
            }
            if (!allowed && (rect.left < -1 || rect.right > viewport.width + 1)) {
                offscreen.push({
                    selector: el.className || el.tagName,
                    text: (el.innerText || '').slice(0, 90),
                    left: Math.round(rect.left),
                    right: Math.round(rect.right)
                });
            }
            if (el.tagName === 'BUTTON' && (rect.width < 32 || rect.height < 28)) {
                tinyButtons.push({
                    text: (el.innerText || '').slice(0, 60),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height)
                });
            }
        }
        return {
            label: ${JSON.stringify(label)},
            viewport,
            title: document.querySelector('.slide-header h2, .slide-card h1')?.innerText || '',
            counter: document.querySelector('#counter')?.innerText || '',
            docOverflowX: doc.scrollWidth > doc.clientWidth + 1,
            bodyOverflowX: body.scrollWidth > window.innerWidth + 1,
            slide: slideRect ? {
                x: Math.round(slideRect.x),
                y: Math.round(slideRect.y),
                w: Math.round(slideRect.width),
                h: Math.round(slideRect.height),
                right: Math.round(slideRect.right),
                bottom: Math.round(slideRect.bottom)
            } : null,
            clipped,
            offscreen,
            tinyButtons
        };
    })()`;
}

async function evaluate(client, expression) {
    const result = await client.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
    });
    return unwrapEvaluation(result);
}

async function wait(client, ms) {
    await evaluate(client, `new Promise((resolve) => setTimeout(resolve, ${ms}))`);
}

async function searchJump(client, term) {
    await evaluate(client, `document.querySelector('#openSearch').click()`);
    await wait(client, 80);
    await evaluate(client, `(() => {
        const input = document.querySelector('#searchInput');
        input.value = ${JSON.stringify(term)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await wait(client, 140);
    await evaluate(client, `(() => {
        const results = [...document.querySelectorAll('.result-item')];
        const preferred = results.find((item) => !/TABLE OF CONTENTS/i.test(item.innerText || '')) || results[0];
        preferred?.click();
    })()`);
    await wait(client, 180);
}

async function setViewport(client, width, height, mobile = false) {
    await client.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile
    });
    await wait(client, 180);
}

async function main() {
    const target = await findPageTarget();
    const client = await connectDebugger(target.webSocketDebuggerUrl);
    const measurements = [];

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: `${SITE_URL}?audit=${Date.now()}` });
    await wait(client, 600);
    await evaluate(client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
    await client.send("Page.navigate", { url: `${SITE_URL}?audit=${Date.now() + 1}` });
    await wait(client, 600);

    await setViewport(client, 1440, 980, false);
    measurements.push(await evaluate(client, measurementExpression("desktop cover")));
    await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`);
    await wait(client, 180);
    measurements.push(await evaluate(client, measurementExpression("desktop workbench")));
    await searchJump(client, "NavigationStack");
    measurements.push(await evaluate(client, measurementExpression("desktop long heading")));
    await searchJump(client, "CounterView");
    measurements.push(await evaluate(client, measurementExpression("desktop code")));
    await searchJump(client, "Wrapper decision matrix");
    measurements.push(await evaluate(client, measurementExpression("desktop table")));
    await searchJump(client, "Question 3:");
    measurements.push(await evaluate(client, measurementExpression("desktop mock")));

    await setViewport(client, 834, 1112, false);
    measurements.push(await evaluate(client, measurementExpression("tablet current")));
    await searchJump(client, "GeometryReader");
    measurements.push(await evaluate(client, measurementExpression("tablet geometry")));

    await setViewport(client, 390, 844, true);
    measurements.push(await evaluate(client, measurementExpression("mobile current")));
    await searchJump(client, "matchedGeometryEffect");
    measurements.push(await evaluate(client, measurementExpression("mobile long token")));

    client.close();

    const failures = measurements.filter((item) => item.docOverflowX || item.bodyOverflowX || item.clipped.length || item.offscreen.length || item.tinyButtons.length);
    console.log(JSON.stringify(measurements.map((item) => ({
        label: item.label,
        title: item.title,
        counter: item.counter,
        docOverflowX: item.docOverflowX,
        bodyOverflowX: item.bodyOverflowX,
        slide: item.slide,
        clipped: item.clipped.slice(0, 5),
        offscreen: item.offscreen.slice(0, 5),
        tinyButtons: item.tinyButtons.slice(0, 5)
    })), null, 2));

    if (failures.length > 0) {
        console.error(`Layout audit failed for ${failures.length} viewport/slide checks.`);
        process.exit(1);
    }

    console.log("Layout audit passed.");
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
});
