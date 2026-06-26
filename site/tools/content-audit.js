#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const Parser = require("../assets/js/deck-parser.js");

const root = path.resolve(__dirname, "../..");
const failures = [];

function readSource(source) {
    const filePath = path.join(root, source.file);
    const raw = fs.readFileSync(filePath, "utf8");
    return Parser.parseMarkdownSource(source, raw);
}

function expectEqual(label, actual, expected) {
    if (actual !== expected) {
        failures.push(`${label}: expected ${expected}, got ${actual}`);
    }
}

function lineRangeContains(range, line) {
    return range.startLine <= line && line <= range.endLine;
}

function auditInventory(doc) {
    const expected = doc.source.expected;
    const inventory = doc.inventory;

    Object.keys(expected).forEach((key) => {
        expectEqual(`${doc.source.shortTitle} ${key}`, inventory[key], expected[key]);
    });

    if (inventory.codeRanges.length !== inventory.codeBlocks) {
        failures.push(`${doc.source.shortTitle} code range count does not match code block count`);
    }

    if (inventory.mermaidRanges.length !== inventory.mermaidBlocks) {
        failures.push(`${doc.source.shortTitle} mermaid range count does not match mermaid block count`);
    }
}

function auditSlideCoverage(doc, slides) {
    const contentSlides = slides.filter((slide) => slide.sourceId === doc.source.id);
    const slidesByBlock = new Map();
    const coveredLines = new Set();

    contentSlides.forEach((slide) => {
        if (!slide.sourceBlockId) {
            failures.push(`${slide.id} is missing sourceBlockId`);
        }
        if (!slide.sourceFile || !slide.lineStart || !slide.lineEnd) {
            failures.push(`${slide.id} is missing source line metadata`);
        }
        if (!slidesByBlock.has(slide.sourceBlockId)) {
            slidesByBlock.set(slide.sourceBlockId, []);
        }
        slidesByBlock.get(slide.sourceBlockId).push(slide);
        for (let line = slide.lineStart; line <= slide.lineEnd; line += 1) {
            coveredLines.add(line);
        }
        const rendered = Parser.renderMarkdown(slide.lines);
        if (slide.lines.some((line) => line.trim() !== "") && rendered.trim().length === 0) {
            failures.push(`${slide.id} renders empty HTML for non-empty source`);
        }
    });

    doc.blocks.forEach((block) => {
        const blockSlides = slidesByBlock.get(block.id) || [];
        if (blockSlides.length === 0) {
            failures.push(`${doc.source.shortTitle} block not assigned to slides: ${block.title}`);
        }
    });

    doc.lines.forEach((line, index) => {
        const lineNumber = index + 1;
        if (line.trim() !== "" && !coveredLines.has(lineNumber)) {
            failures.push(`${doc.source.shortTitle} non-empty source line ${lineNumber} is not assigned to any slide`);
        }
    });

    const coveredRanges = contentSlides.map((slide) => ({
        startLine: slide.lineStart,
        endLine: slide.lineEnd,
        id: slide.id
    }));

    doc.inventory.headingLines.forEach((heading) => {
        if (!coveredRanges.some((range) => lineRangeContains(range, heading.line))) {
            failures.push(`${doc.source.shortTitle} heading dropped: ${heading.title}`);
        }
    });

    doc.inventory.codeRanges.forEach((range) => {
        if (!coveredRanges.some((slideRange) => slideRange.startLine <= range.startLine && slideRange.endLine >= range.endLine)) {
            failures.push(`${doc.source.shortTitle} code block is split or dropped at lines ${range.startLine}-${range.endLine}`);
        }
    });

    doc.inventory.tableRanges.forEach((range) => {
        if (!coveredRanges.some((slideRange) => slideRange.startLine <= range.startLine && slideRange.endLine >= range.endLine)) {
            failures.push(`${doc.source.shortTitle} table is split or dropped at lines ${range.startLine}-${range.endLine}`);
        }
    });

    doc.inventory.footerLines.forEach((line) => {
        if (!coveredRanges.some((range) => lineRangeContains(range, line))) {
            failures.push(`${doc.source.shortTitle} footer attribution line ${line} is not assigned to a slide`);
        }
    });

    doc.inventory.referenceLinkLines.forEach((line) => {
        if (!coveredRanges.some((range) => lineRangeContains(range, line))) {
            failures.push(`${doc.source.shortTitle} reference link line ${line} is not assigned to a slide`);
        }
    });
}

function auditFaqCards(doc) {
    if (doc.source.id !== "faq") {
        return;
    }
    const faqBlocks = doc.blocks.filter((block) => block.kind === "faq");
    const mockBlocks = doc.blocks.filter((block) => block.kind === "mock");

    expectEqual("FAQ parsed card blocks", faqBlocks.length, doc.source.expected.faqEntries);
    expectEqual("FAQ parsed mock question blocks", mockBlocks.length, doc.source.expected.mockQuestions);

    const missingDifficulty = faqBlocks.filter((block) => !block.difficulty);
    if (missingDifficulty.length > 0) {
        failures.push(`FAQ entries missing difficulty: ${missingDifficulty.map((block) => block.title).join(", ")}`);
    }
}

function main() {
    const docs = Parser.SOURCES.map(readSource);
    const slides = Parser.createSlides(docs);

    docs.forEach((doc) => {
        auditInventory(doc);
        auditSlideCoverage(doc, slides);
        auditFaqCards(doc);
    });

    const systemSlides = slides.filter((slide) => slide.kind.startsWith("system-"));
    if (systemSlides.length < 2) {
        failures.push("Expected cover and workbench system slides");
    }

    if (!slides.some((slide) => slide.kind === "system-workbench")) {
        failures.push("Missing View Graph Workbench slide");
    }

    if (failures.length > 0) {
        console.error("Content audit failed:");
        failures.forEach((failure) => console.error(`- ${failure}`));
        process.exit(1);
    }

    const summary = docs.map((doc) => {
        const inventory = doc.inventory;
        return `${doc.source.shortTitle}: ${inventory.lineCount} lines, ${inventory.h1} H1, ${inventory.h2} H2, ${inventory.h3} H3, ${inventory.codeBlocks} code blocks`;
    });

    console.log("Content audit passed.");
    console.log(summary.join("\n"));
    console.log(`${slides.length} total slides generated.`);
}

main();
