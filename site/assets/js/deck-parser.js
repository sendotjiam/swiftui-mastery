(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.SwiftUIDeckParser = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const SOURCES = [
        {
            id: "foundations",
            shortTitle: "Foundations",
            title: "SwiftUI Foundations: From Fundamentals to Mastery",
            file: "docs/swiftui-foundations.md",
            browserPath: "../docs/swiftui-foundations.md",
            expected: {
                lineCount: 2210,
                h1: 1,
                h2: 24,
                h3: 200,
                codeBlocks: 37,
                mermaidBlocks: 18
            }
        },
        {
            id: "faq",
            shortTitle: "FAQ",
            title: "Swift, iOS, and SwiftUI Interview FAQ",
            file: "docs/swift-ios-swiftui-interview-faq.md",
            browserPath: "../docs/swift-ios-swiftui-interview-faq.md",
            expected: {
                lineCount: 6754,
                h1: 1,
                h2: 26,
                h3: 159,
                faqEntries: 151,
                codeBlocks: 151,
                mockQuestions: 8
            }
        }
    ];

    const WORKBENCH_NODES = [
        {
            id: "state",
            label: "State",
            caption: "@State, @Binding, @Observable",
            query: "state binding observable source of truth"
        },
        {
            id: "body",
            label: "Body",
            caption: "Cheap value recomposition",
            query: "body recomputation view builder"
        },
        {
            id: "identity",
            label: "Identity",
            caption: "Stable graph keys",
            query: "identity ForEach id state"
        },
        {
            id: "diffing",
            label: "Diffing",
            caption: "Compare, preserve, update",
            query: "diffing changed AnyView EquatableView"
        },
        {
            id: "layout",
            label: "Layout",
            caption: "Propose, measure, place",
            query: "layout frame GeometryReader Grid"
        },
        {
            id: "effects",
            label: "Effects",
            caption: ".task, lifecycle, cancellation",
            query: "task lifecycle cancellation async"
        }
    ];

    function textToLines(raw) {
        const normalized = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        if (normalized.length === 0) {
            return [];
        }
        return normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
    }

    function slugify(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/`/g, "")
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "section";
    }

    function stripHeadingText(line) {
        return line.replace(/^#{1,6}\s+/, "").trim();
    }

    function getHeading(line) {
        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
        if (!match) {
            return null;
        }
        return {
            level: match[1].length,
            title: match[2].trim()
        };
    }

    function isFenceLine(line) {
        return /^```/.test(line);
    }

    function isTableRow(line) {
        return /^\s*\|.*\|\s*$/.test(line);
    }

    function isTableSeparator(line) {
        return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    }

    function isListLine(line) {
        return /^(\s*)([-*+]|\d+\.)\s+/.test(line);
    }

    function isReferenceLinkLine(line) {
        return /^[-*]\s+\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(line.trim());
    }

    function countInventory(lines) {
        const inventory = {
            lineCount: lines.length,
            h1: 0,
            h2: 0,
            h3: 0,
            h4: 0,
            h5: 0,
            h6: 0,
            codeBlocks: 0,
            mermaidBlocks: 0,
            faqEntries: 0,
            mockQuestions: 0,
            tableGroups: 0,
            footerAttributions: 0,
            referenceLinks: 0,
            headingLines: [],
            codeRanges: [],
            mermaidRanges: [],
            tableRanges: [],
            footerLines: [],
            referenceLinkLines: []
        };

        let inFence = false;
        let currentFence = null;
        let tableStart = null;

        function closeTable(endLine) {
            if (tableStart !== null) {
                inventory.tableGroups += 1;
                inventory.tableRanges.push({ startLine: tableStart, endLine });
                tableStart = null;
            }
        }

        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            if (isFenceLine(line)) {
                closeTable(lineNumber - 1);
                if (!inFence) {
                    const language = line.replace(/^```/, "").trim().toLowerCase();
                    currentFence = { startLine: lineNumber, language };
                    inventory.codeBlocks += 1;
                    if (language === "mermaid") {
                        inventory.mermaidBlocks += 1;
                    }
                    inFence = true;
                } else {
                    currentFence.endLine = lineNumber;
                    inventory.codeRanges.push({
                        startLine: currentFence.startLine,
                        endLine: currentFence.endLine,
                        language: currentFence.language
                    });
                    if (currentFence.language === "mermaid") {
                        inventory.mermaidRanges.push({
                            startLine: currentFence.startLine,
                            endLine: currentFence.endLine
                        });
                    }
                    currentFence = null;
                    inFence = false;
                }
                return;
            }

            if (inFence) {
                return;
            }

            const heading = getHeading(line);
            if (heading) {
                closeTable(lineNumber - 1);
                inventory[`h${heading.level}`] += 1;
                inventory.headingLines.push({
                    line: lineNumber,
                    level: heading.level,
                    title: heading.title
                });
                if (/^### \[(Beginner|Intermediate|Senior)\]/.test(line)) {
                    inventory.faqEntries += 1;
                }
                if (/^### Question \d+:/.test(line)) {
                    inventory.mockQuestions += 1;
                }
                return;
            }

            if (isTableRow(line)) {
                if (tableStart === null) {
                    tableStart = lineNumber;
                }
            } else if (tableStart !== null && line.trim() !== "") {
                closeTable(lineNumber - 1);
            } else if (tableStart !== null && line.trim() === "") {
                closeTable(lineNumber - 1);
            }

            if (line.includes("*Generated with AI coding assistant*")) {
                inventory.footerAttributions += 1;
                inventory.footerLines.push(lineNumber);
            }

            if (isReferenceLinkLine(line)) {
                inventory.referenceLinks += 1;
                inventory.referenceLinkLines.push(lineNumber);
            }
        });

        closeTable(lines.length);

        if (currentFence) {
            currentFence.endLine = lines.length;
            inventory.codeRanges.push(currentFence);
        }

        return inventory;
    }

    function parseMarkdownSource(source, raw) {
        const lines = textToLines(raw);
        const inventory = countInventory(lines);
        const headingStack = {};
        const blocks = [];
        let current = null;
        let inFence = false;

        function closeCurrent(endLine) {
            if (!current) {
                return;
            }
            current.endLine = endLine;
            current.lineCount = current.lines.length;
            current.text = current.lines.join("\n");
            current.slug = slugify(`${current.id}-${current.title}`);
            current.kind = classifyBlock(current);
            current.difficulty = detectDifficulty(current.title);
            blocks.push(current);
            current = null;
        }

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const heading = !inFence ? getHeading(line) : null;

            if (heading) {
                closeCurrent(lineNumber - 1);

                headingStack[heading.level] = heading.title;
                Object.keys(headingStack).forEach((key) => {
                    if (Number(key) > heading.level) {
                        delete headingStack[key];
                    }
                });

                current = {
                    id: `${source.id}-${blocks.length + 1}-${slugify(heading.title)}`,
                    sourceId: source.id,
                    sourceFile: source.file,
                    sourceTitle: source.title,
                    sourceShortTitle: source.shortTitle,
                    lineStart: lineNumber,
                    lineEnd: lineNumber,
                    headingLevel: heading.level,
                    title: heading.title,
                    parentTitle: heading.level > 1 ? headingStack[heading.level - 1] || "" : "",
                    topic: headingStack[2] || heading.title,
                    headingPath: Object.keys(headingStack)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((level) => headingStack[level]),
                    lines: []
                };
            }

            if (!current) {
                current = {
                    id: `${source.id}-${blocks.length + 1}-preamble`,
                    sourceId: source.id,
                    sourceFile: source.file,
                    sourceTitle: source.title,
                    sourceShortTitle: source.shortTitle,
                    lineStart: lineNumber,
                    lineEnd: lineNumber,
                    headingLevel: 0,
                    title: "Preamble",
                    parentTitle: "",
                    topic: "Preamble",
                    headingPath: [],
                    lines: []
                };
            }

            current.lines.push(line);

            if (isFenceLine(line)) {
                inFence = !inFence;
            }
        });

        closeCurrent(lines.length);

        return {
            source,
            lines,
            inventory,
            blocks
        };
    }

    function detectDifficulty(title) {
        const match = /^\[(Beginner|Intermediate|Senior)\]/.exec(title || "");
        return match ? match[1] : "";
    }

    function classifyBlock(block) {
        if (block.headingLevel === 1) {
            return "title";
        }
        if (/^\[(Beginner|Intermediate|Senior)\]/.test(block.title)) {
            return "faq";
        }
        if (/^Question \d+:/.test(block.title)) {
            return "mock";
        }
        if (/Common Bad Answers and Better Answers/i.test(block.title)) {
            return "comparison";
        }
        if (/Reference Links Used|Source References/i.test(block.title)) {
            return "references";
        }
        if (/Appendix/i.test(block.title)) {
            return "appendix";
        }
        if (/Table of Contents/i.test(block.title)) {
            return "toc";
        }
        return "content";
    }

    function buildUnits(lines) {
        const units = [];
        let index = 0;

        function pushUnit(type, start, end) {
            units.push({
                type,
                startOffset: start,
                endOffset: end,
                lines: lines.slice(start, end + 1)
            });
        }

        while (index < lines.length) {
            const line = lines[index];

            if (isFenceLine(line)) {
                const start = index;
                index += 1;
                while (index < lines.length && !isFenceLine(lines[index])) {
                    index += 1;
                }
                if (index < lines.length) {
                    index += 1;
                }
                pushUnit("code", start, index - 1);
                continue;
            }

            if (getHeading(line)) {
                pushUnit("heading", index, index);
                index += 1;
                continue;
            }

            if (isTableRow(line)) {
                const start = index;
                index += 1;
                while (index < lines.length && isTableRow(lines[index])) {
                    index += 1;
                }
                pushUnit("table", start, index - 1);
                continue;
            }

            if (/^\s*>/.test(line)) {
                const start = index;
                index += 1;
                while (index < lines.length && (/^\s*>/.test(lines[index]) || lines[index].trim() === "")) {
                    index += 1;
                }
                pushUnit("quote", start, index - 1);
                continue;
            }

            if (isListLine(line)) {
                const start = index;
                index += 1;
                while (index < lines.length && (isListLine(lines[index]) || /^\s{2,}\S/.test(lines[index]) || lines[index].trim() === "")) {
                    index += 1;
                }
                pushUnit("list", start, index - 1);
                continue;
            }

            if (line.trim() === "") {
                pushUnit("blank", index, index);
                index += 1;
                continue;
            }

            const start = index;
            index += 1;
            while (
                index < lines.length &&
                lines[index].trim() !== "" &&
                !getHeading(lines[index]) &&
                !isFenceLine(lines[index]) &&
                !isTableRow(lines[index]) &&
                !isListLine(lines[index]) &&
                !/^\s*>/.test(lines[index])
            ) {
                index += 1;
            }
            pushUnit("paragraph", start, index - 1);
        }

        return units;
    }

    function splitBlockIntoChunks(block) {
        const maxLines = block.kind === "faq" || block.kind === "mock" ? 30 : 34;
        const units = buildUnits(block.lines);
        const chunks = [];
        let current = [];
        let currentLineCount = 0;

        function flush() {
            if (current.length === 0) {
                return;
            }
            const first = current[0];
            const last = current[current.length - 1];
            chunks.push({
                startOffset: first.startOffset,
                endOffset: last.endOffset,
                lines: current.flatMap((unit) => unit.lines)
            });
            current = [];
            currentLineCount = 0;
        }

        units.forEach((unit) => {
            const lineCount = unit.lines.length;
            const isOversizedUnit = lineCount > maxLines;
            if (current.length > 0 && currentLineCount + lineCount > maxLines && currentLineCount > 2) {
                flush();
            }
            current.push(unit);
            currentLineCount += lineCount;
            if (isOversizedUnit) {
                flush();
            }
        });

        flush();

        return chunks.length > 0 ? chunks : [{ startOffset: 0, endOffset: 0, lines: [] }];
    }

    function createSlides(docs) {
        const slides = [];
        const totals = docs.reduce((acc, doc) => {
            acc.lines += doc.inventory.lineCount;
            acc.headings += doc.inventory.h1 + doc.inventory.h2 + doc.inventory.h3;
            acc.codeBlocks += doc.inventory.codeBlocks;
            acc.faqEntries += doc.inventory.faqEntries || 0;
            return acc;
        }, { lines: 0, headings: 0, codeBlocks: 0, faqEntries: 0 });

        slides.push({
            id: "system-cover",
            kind: "system-cover",
            title: "SwiftUI Study Deck",
            subtitle: "Foundations plus interview practice",
            sourceRefs: docs.map((doc) => doc.source.file),
            totals,
            searchableText: "SwiftUI Study Deck Foundations FAQ Interview"
        });

        slides.push({
            id: "system-workbench",
            kind: "system-workbench",
            title: "View Graph Workbench",
            subtitle: "Use the graph to jump into the source material",
            sourceRefs: docs.map((doc) => doc.source.file),
            nodes: WORKBENCH_NODES,
            searchableText: WORKBENCH_NODES.map((node) => `${node.label} ${node.caption} ${node.query}`).join(" ")
        });

        docs.forEach((doc) => {
            doc.blocks.forEach((block) => {
                const chunks = splitBlockIntoChunks(block);
                chunks.forEach((chunk, partIndex) => {
                    const slideId = `${block.id}-part-${partIndex + 1}`;
                    const title = partIndex === 0 ? block.title : `${block.title} (continued ${partIndex + 1})`;
                    const lineStart = block.lineStart + chunk.startOffset;
                    const lineEnd = block.lineStart + chunk.endOffset;
                    slides.push({
                        id: slideId,
                        kind: block.kind,
                        sourceId: doc.source.id,
                        sourceTitle: doc.source.title,
                        sourceShortTitle: doc.source.shortTitle,
                        sourceFile: doc.source.file,
                        sourceBlockId: block.id,
                        title,
                        baseTitle: block.title,
                        subtitle: block.parentTitle || block.topic || doc.source.shortTitle,
                        topic: block.topic,
                        difficulty: block.difficulty,
                        headingLevel: block.headingLevel,
                        headingPath: block.headingPath,
                        lineStart,
                        lineEnd,
                        partIndex,
                        partCount: chunks.length,
                        lines: chunk.lines,
                        fullBlockLines: block.lines,
                        searchableText: `${doc.source.shortTitle} ${block.topic} ${block.title} ${chunk.lines.join(" ")}`
                    });
                });
            });
        });

        slides.forEach((slide, index) => {
            slide.index = index;
            slide.number = index + 1;
        });

        return slides;
    }

    function renderInline(value) {
        let text = escapeHtml(value);
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
            const escapedHref = escapeAttribute(href);
            return `<a href="${escapedHref}" target="_blank" rel="noreferrer">${label}</a>`;
        });
        text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
        text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        return text;
    }

    function splitTableRow(line) {
        return line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim());
    }

    function renderTable(rows) {
        if (rows.length === 0) {
            return "";
        }
        const hasSeparator = rows.length > 1 && isTableSeparator(rows[1]);
        const headerCells = splitTableRow(rows[0]);
        const bodyStart = hasSeparator ? 2 : 1;
        const bodyRows = rows.slice(bodyStart);
        const head = `<thead><tr>${headerCells.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`;
        const body = bodyRows.length > 0
            ? `<tbody>${bodyRows.map((row) => `<tr>${splitTableRow(row).map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`
            : "";

        return [
            `<figure class="table-frame focusable-panel">`,
            `<figcaption><span>Table</span><button type="button" class="focus-trigger">Expand</button></figcaption>`,
            `<div class="table-scroll"><table>${head}${body}</table></div>`,
            `</figure>`
        ].join("");
    }

    function renderCodeBlock(language, code) {
        const langLabel = language || "text";
        if (langLabel.toLowerCase() === "mermaid") {
            return renderMermaidBlock(code);
        }
        return [
            `<figure class="code-frame focusable-panel">`,
            `<figcaption><span>${escapeHtml(langLabel)}</span><button type="button" class="focus-trigger">Expand</button></figcaption>`,
            `<pre><code>${escapeHtml(code)}</code></pre>`,
            `</figure>`
        ].join("");
    }

    function renderMermaidBlock(code) {
        const lines = code.split("\n");
        const nodes = [];
        const nodeMap = new Map();

        lines.forEach((line) => {
            const nodeMatch = /^\s*([A-Za-z0-9_]+)\["(.+)"\]\s*$/.exec(line);
            if (nodeMatch) {
                const node = { id: nodeMatch[1], label: nodeMatch[2] };
                nodeMap.set(node.id, node);
                nodes.push(node);
            }
        });

        const cards = nodes.length > 0
            ? nodes.map((node, index) => [
                `<div class="mini-node">`,
                `<span>${String(index + 1).padStart(2, "0")}</span>`,
                `<strong>${escapeHtml(node.label)}</strong>`,
                `</div>`
            ].join("")).join(`<div class="mini-arrow" aria-hidden="true">-></div>`)
            : `<pre><code>${escapeHtml(code)}</code></pre>`;

        return [
            `<figure class="diagram-frame focusable-panel">`,
            `<figcaption><span>Mermaid diagram</span><button type="button" class="focus-trigger">Expand</button></figcaption>`,
            `<div class="mini-diagram">${cards}</div>`,
            `<details class="diagram-source"><summary>Mermaid source</summary><pre><code>${escapeHtml(code)}</code></pre></details>`,
            `</figure>`
        ].join("");
    }

    function renderMarkdown(lines) {
        const html = [];
        let index = 0;

        function collectParagraph() {
            const start = index;
            index += 1;
            while (
                index < lines.length &&
                lines[index].trim() !== "" &&
                !getHeading(lines[index]) &&
                !isFenceLine(lines[index]) &&
                !isTableRow(lines[index]) &&
                !isListLine(lines[index]) &&
                !/^\s*>/.test(lines[index]) &&
                !/^---+$/.test(lines[index].trim())
            ) {
                index += 1;
            }
            return lines.slice(start, index).join(" ");
        }

        while (index < lines.length) {
            const line = lines[index];

            if (line.trim() === "") {
                index += 1;
                continue;
            }

            if (isFenceLine(line)) {
                const language = line.replace(/^```/, "").trim();
                index += 1;
                const codeLines = [];
                while (index < lines.length && !isFenceLine(lines[index])) {
                    codeLines.push(lines[index]);
                    index += 1;
                }
                if (index < lines.length) {
                    index += 1;
                }
                html.push(renderCodeBlock(language, codeLines.join("\n")));
                continue;
            }

            const heading = getHeading(line);
            if (heading) {
                const level = Math.min(6, Math.max(1, heading.level));
                html.push(`<h${level} id="${escapeAttribute(slugify(heading.title))}">${renderInline(heading.title)}</h${level}>`);
                index += 1;
                continue;
            }

            if (isTableRow(line)) {
                const start = index;
                index += 1;
                while (index < lines.length && isTableRow(lines[index])) {
                    index += 1;
                }
                html.push(renderTable(lines.slice(start, index)));
                continue;
            }

            if (/^\s*>/.test(line)) {
                const quoteLines = [];
                while (index < lines.length && (/^\s*>/.test(lines[index]) || lines[index].trim() === "")) {
                    if (/^\s*>/.test(lines[index])) {
                        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
                    }
                    index += 1;
                }
                html.push(`<blockquote>${quoteLines.map((quoteLine) => `<p>${renderInline(quoteLine)}</p>`).join("")}</blockquote>`);
                continue;
            }

            if (isListLine(line)) {
                const ordered = /^\s*\d+\.\s+/.test(line);
                const tag = ordered ? "ol" : "ul";
                const items = [];
                while (index < lines.length && (isListLine(lines[index]) || /^\s{2,}\S/.test(lines[index]) || lines[index].trim() === "")) {
                    if (isListLine(lines[index])) {
                        items.push(lines[index].replace(/^(\s*)([-*+]|\d+\.)\s+/, ""));
                    } else if (items.length > 0 && lines[index].trim() !== "") {
                        items[items.length - 1] += ` ${lines[index].trim()}`;
                    }
                    index += 1;
                }
                html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
                continue;
            }

            if (/^---+$/.test(line.trim())) {
                html.push("<hr>");
                index += 1;
                continue;
            }

            html.push(`<p>${renderInline(collectParagraph())}</p>`);
        }

        return html.join("\n");
    }

    return {
        SOURCES,
        WORKBENCH_NODES,
        textToLines,
        escapeHtml,
        escapeAttribute,
        slugify,
        countInventory,
        parseMarkdownSource,
        createSlides,
        renderMarkdown
    };
});
