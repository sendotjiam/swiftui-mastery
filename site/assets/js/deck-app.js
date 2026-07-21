(function () {
    "use strict";

    const Parser = window.SwiftUIDeckParser;
    const STORAGE_KEY = "swiftui-study-deck-state-v1";

    const state = {
        docs: [],
        slides: [],
        blocksById: new Map(),
        activeIndex: 0,
        direction: "next",
        filters: {
            mode: "all",
            source: "all",
            difficulty: "all",
            query: ""
        },
        saved: {
            activeSlideId: "",
            viewed: [],
            starred: []
        }
    };

    const els = {
        shell: document.querySelector(".app-shell"),
        stage: document.getElementById("stage"),
        thumbList: document.getElementById("thumbList"),
        slideCount: document.getElementById("slideCount"),
        currentNumber: document.getElementById("currentNumber"),
        viewedCount: document.getElementById("viewedCount"),
        starredCount: document.getElementById("starredCount"),
        relatedList: document.getElementById("relatedList"),
        counter: document.getElementById("counter"),
        progressFill: document.getElementById("progressFill"),
        prevSlide: document.getElementById("prevSlide"),
        nextSlide: document.getElementById("nextSlide"),
        openSearch: document.getElementById("openSearch"),
        openSource: document.getElementById("openSource"),
        toggleStar: document.getElementById("toggleStar"),
        clearFilters: document.getElementById("clearFilters"),
        searchModal: document.getElementById("searchModal"),
        searchInput: document.getElementById("searchInput"),
        searchResults: document.getElementById("searchResults"),
        contentModal: document.getElementById("contentModal"),
        contentTitle: document.getElementById("contentTitle"),
        contentEyebrow: document.getElementById("contentEyebrow"),
        contentBody: document.getElementById("contentBody")
    };

    init();

    async function init() {
        restoreState();
        bindEvents();

        try {
            const docs = await loadDocs();
            state.docs = docs;
            state.blocksById = new Map(docs.flatMap((doc) => doc.blocks.map((block) => [block.id, block])));
            state.slides = Parser.createSlides(docs);
            const savedIndex = state.slides.findIndex((slide) => slide.id === state.saved.activeSlideId);
            state.activeIndex = savedIndex >= 0 ? savedIndex : 0;
            els.shell.dataset.loading = "false";
            renderAll();
        } catch (error) {
            renderError(error);
        }
    }

    async function loadDocs() {
        return Promise.all(Parser.SOURCES.map(async (source) => {
            const response = await fetch(source.browserPath, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Could not load ${source.file}: ${response.status} ${response.statusText}`);
            }
            const raw = await response.text();
            return Parser.parseMarkdownSource(source, raw);
        }));
    }

    function restoreState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            state.saved = {
                activeSlideId: parsed.activeSlideId || "",
                viewed: Array.isArray(parsed.viewed) ? parsed.viewed : [],
                starred: Array.isArray(parsed.starred) ? parsed.starred : []
            };
        } catch {
            state.saved = { activeSlideId: "", viewed: [], starred: [] };
        }
    }

    function persistState() {
        const active = getActiveSlide();
        if (active) {
            state.saved.activeSlideId = active.id;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved));
    }

    function bindEvents() {
        els.prevSlide.addEventListener("click", () => goRelative(-1));
        els.nextSlide.addEventListener("click", () => goRelative(1));
        els.openSearch.addEventListener("click", openSearch);
        els.openSource.addEventListener("click", openSourceForActiveSlide);
        els.toggleStar.addEventListener("click", toggleStarForActiveSlide);
        els.clearFilters.addEventListener("click", clearFilters);

        document.querySelectorAll("[data-source-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                state.filters.source = button.dataset.sourceFilter;
                setActiveButton("[data-source-filter]", button);
                renderNavigation();
            });
        });

        document.querySelectorAll("[data-mode-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                state.filters.mode = button.dataset.modeFilter;
                setActiveButton("[data-mode-filter]", button);
                renderNavigation();
            });
        });

        document.querySelectorAll("[data-difficulty-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                state.filters.difficulty = button.dataset.difficultyFilter;
                setActiveButton("[data-difficulty-filter]", button);
                renderNavigation();
            });
        });

        els.thumbList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-slide-id]");
            if (!button) {
                return;
            }
            goToSlideId(button.dataset.slideId);
        });

        els.relatedList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-slide-id]");
            if (!button) {
                return;
            }
            goToSlideId(button.dataset.slideId);
        });

        els.stage.addEventListener("click", (event) => {
            const graphButton = event.target.closest("[data-workbench-query]");
            if (graphButton) {
                jumpByQuery(graphButton.dataset.workbenchQuery);
                return;
            }

            const fullSourceButton = event.target.closest("[data-open-source]");
            if (fullSourceButton) {
                openSourceForActiveSlide();
                return;
            }

            const focusButton = event.target.closest(".focus-trigger");
            if (focusButton) {
                openFocusedPanel(focusButton);
            }
        });

        document.addEventListener("keydown", handleKeyboard);

        document.querySelectorAll("[data-close-modal]").forEach((element) => {
            element.addEventListener("click", closeModals);
        });

        els.searchInput.addEventListener("input", () => {
            state.filters.query = els.searchInput.value.trim();
            renderSearchResults();
            renderNavigation();
        });

        els.searchResults.addEventListener("click", (event) => {
            const button = event.target.closest("[data-slide-id]");
            if (!button) {
                return;
            }
            closeModals();
            goToSlideId(button.dataset.slideId);
        });

        let touchStartX = 0;
        let touchStartY = 0;
        els.stage.addEventListener("touchstart", (event) => {
            const touch = event.changedTouches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        els.stage.addEventListener("touchend", (event) => {
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
                goRelative(deltaX < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    function setActiveButton(selector, activeButton) {
        document.querySelectorAll(selector).forEach((button) => {
            button.classList.toggle("is-active", button === activeButton);
        });
    }

    function handleKeyboard(event) {
        const target = event.target;
        const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

        if (event.key === "Escape") {
            closeModals();
            return;
        }

        if (isTyping) {
            return;
        }

        if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
            event.preventDefault();
            goRelative(1);
        } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            goRelative(-1);
        } else if (event.key === "Home") {
            event.preventDefault();
            goToIndex(0, "prev");
        } else if (event.key === "End") {
            event.preventDefault();
            goToIndex(state.slides.length - 1, "next");
        } else if (event.key === "/") {
            event.preventDefault();
            openSearch();
        } else if (event.key.toLowerCase() === "s") {
            event.preventDefault();
            toggleStarForActiveSlide();
        }
    }

    function renderAll() {
        markViewed();
        renderSlide();
        renderNavigation();
        renderStats();
        persistState();
    }

    function renderSlide() {
        const slide = getActiveSlide();
        if (!slide) {
            return;
        }

        els.stage.innerHTML = slideToHtml(slide);
        const card = els.stage.querySelector(".slide-card");
        if (card) {
            card.classList.add(state.direction === "prev" ? "enter-prev" : "enter-next");
        }
    }

    function renderNavigation() {
        const slides = getFilteredSlides();
        els.thumbList.innerHTML = slides.map((slide) => thumbToHtml(slide)).join("");
        els.slideCount.textContent = `${slides.length} shown`;
        renderRelated();
        renderStats();
    }

    function renderStats() {
        const slide = getActiveSlide();
        const viewed = new Set(state.saved.viewed);
        const starred = new Set(state.saved.starred);
        const percent = state.slides.length ? ((state.activeIndex + 1) / state.slides.length) * 100 : 0;

        els.currentNumber.textContent = slide ? String(slide.number) : "0";
        els.viewedCount.textContent = String(viewed.size);
        els.starredCount.textContent = String(starred.size);
        els.counter.textContent = slide ? `${slide.number} / ${state.slides.length}` : "0 / 0";
        els.progressFill.style.width = `${percent}%`;
        els.toggleStar.textContent = slide && starred.has(slide.id) ? "Starred" : "Star";
        els.toggleStar.setAttribute("aria-pressed", slide && starred.has(slide.id) ? "true" : "false");

        els.prevSlide.disabled = state.activeIndex <= 0;
        els.nextSlide.disabled = state.activeIndex >= state.slides.length - 1;
    }

    function renderRelated() {
        const active = getActiveSlide();
        if (!active) {
            els.relatedList.innerHTML = "";
            return;
        }

        const topic = active.topic || active.title;
        const related = state.slides
            .filter((slide) => slide.id !== active.id)
            .filter((slide) => slide.kind !== "system-cover")
            .filter((slide) => slide.topic === topic || slide.sourceId === active.sourceId)
            .slice(0, 5);

        if (related.length === 0) {
            els.relatedList.innerHTML = `<p class="empty-section">No nearby slides yet.</p>`;
            return;
        }

        els.relatedList.innerHTML = related.map((slide) => [
            `<button type="button" class="related-item" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<strong>${Parser.escapeHtml(slide.baseTitle || slide.title)}</strong>`,
            `<span>${Parser.escapeHtml(slide.sourceShortTitle || "Deck")} / ${Parser.escapeHtml(slide.topic || slide.kind)}</span>`,
            `</button>`
        ].join("")).join("");
    }

    function slideToHtml(slide) {
        if (slide.kind === "system-cover") {
            return coverSlideToHtml(slide);
        }
        if (slide.kind === "system-workbench") {
            return workbenchSlideToHtml(slide);
        }
        return contentSlideToHtml(slide);
    }

    function coverSlideToHtml(slide) {
        return [
            `<article class="slide-card cover-slide" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<div class="slide-body">`,
            `<div class="cover-layout">`,
            `<section class="cover-title">`,
            `<p class="eyebrow">Local markdown deck</p>`,
            `<h1>SwiftUI<br>Study Deck</h1>`,
            `<p>Move left and right through the complete Foundations guide and interview FAQ. Every slide is generated from the markdown sources.</p>`,
            `</section>`,
            `<section class="cover-stats" aria-label="Deck inventory">`,
            `<div class="cover-stat"><strong>${slide.totals.lines}</strong><span>source lines</span></div>`,
            `<div class="cover-stat"><strong>${slide.totals.headings}</strong><span>headings</span></div>`,
            `<div class="cover-stat"><strong>${slide.totals.codeBlocks}</strong><span>code blocks</span></div>`,
            `<div class="cover-stat"><strong>${slide.totals.faqEntries}</strong><span>FAQ entries</span></div>`,
            `</section>`,
            `</div>`,
            `</div>`,
            `<footer class="slide-footer"><span>Use arrow keys, swipe, or the navigation buttons.</span><span>Slide ${slide.number}</span></footer>`,
            `</article>`
        ].join("");
    }

    function workbenchSlideToHtml(slide) {
        const nodes = slide.nodes.map((node) => [
            `<button type="button" class="graph-node" data-workbench-query="${Parser.escapeAttribute(node.query)}">`,
            `<strong>${Parser.escapeHtml(node.label)}</strong>`,
            `<span>${Parser.escapeHtml(node.caption)}</span>`,
            `</button>`
        ].join("")).join("");

        return [
            `<article class="slide-card workbench-slide" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<div class="slide-body">`,
            `<div class="workbench">`,
            `<section class="workbench-copy">`,
            `<p class="eyebrow">Signature slide</p>`,
            `<h1>View Graph Workbench</h1>`,
            `<p>Click a node to jump into the slides that explain that part of SwiftUI's rendering model.</p>`,
            `</section>`,
            `<section class="graph-board" aria-label="SwiftUI render graph nodes">${nodes}</section>`,
            `</div>`,
            `</div>`,
            `<footer class="slide-footer"><span>Generated from ${slide.sourceRefs.map(Parser.escapeHtml).join(" and ")}</span><span>Slide ${slide.number}</span></footer>`,
            `</article>`
        ].join("");
    }

    function contentSlideToHtml(slide) {
        const isStarred = state.saved.starred.includes(slide.id);
        const bodyLines = slide.partIndex === 0 && slide.lines.length > 0 && /^#{1,6}\s+/.test(slide.lines[0])
            ? slide.lines.slice(1)
            : slide.lines;
        const bodyHtml = bodyLines.some((line) => line.trim() !== "")
            ? Parser.renderMarkdown(bodyLines)
            : `<div class="empty-section"><p>This is a section divider slide. Continue right for the content in source order.</p></div>`;
        const difficulty = slide.difficulty ? `<span class="pill pink">${Parser.escapeHtml(slide.difficulty)}</span>` : "";
        const part = slide.partCount > 1 ? `<span class="pill green">Part ${slide.partIndex + 1} of ${slide.partCount}</span>` : "";

        return [
            `<article class="slide-card content-slide kind-${Parser.escapeAttribute(slide.kind)}" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<header class="slide-header">`,
            `<p class="eyebrow">${Parser.escapeHtml(slide.sourceShortTitle || "Source")}</p>`,
            `<h2>${Parser.renderMarkdown([slide.title]).replace(/^<p>|<\/p>$/g, "")}</h2>`,
            `<div class="slide-meta">`,
            `<span class="pill blue">${Parser.escapeHtml(slide.topic || slide.kind)}</span>`,
            difficulty,
            part,
            `<span class="pill">Lines ${slide.lineStart}-${slide.lineEnd}</span>`,
            `</div>`,
            `</header>`,
            `<div class="slide-body markdown-body">${bodyHtml}</div>`,
            `<footer class="slide-footer">`,
            `<span>${Parser.escapeHtml(slide.sourceFile)}</span>`,
            `<div class="footer-actions">`,
            `<button type="button" class="source-link" data-open-source>Full source</button>`,
            `<span class="pill">${isStarred ? "Starred" : `Slide ${slide.number}`}</span>`,
            `</div>`,
            `</footer>`,
            `</article>`
        ].join("");
    }

    function thumbToHtml(slide) {
        const active = getActiveSlide();
        const isActive = active && active.id === slide.id;
        const topic = slide.topic || slide.kind.replace("system-", "");
        return [
            `<button type="button" class="thumb ${isActive ? "is-active" : ""}" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<span class="thumb-number">${String(slide.number).padStart(3, "0")}</span>`,
            `<span>`,
            `<span class="thumb-title">${Parser.escapeHtml(slide.baseTitle || slide.title)}</span>`,
            `<span class="thumb-topic">${Parser.escapeHtml(slide.sourceShortTitle || "Deck")} / ${Parser.escapeHtml(topic)}</span>`,
            `</span>`,
            `</button>`
        ].join("");
    }

    function getFilteredSlides() {
        const query = state.filters.query.toLowerCase();
        return state.slides.filter((slide) => {
            if (state.filters.mode === "study" && (slide.kind === "faq" || slide.kind === "mock")) {
                return false;
            }
            if (state.filters.mode === "faq" && slide.kind !== "faq" && slide.kind !== "mock") {
                return false;
            }

            if (state.filters.source !== "all" && slide.sourceId !== state.filters.source) {
                return false;
            }
            if (state.filters.difficulty !== "all" && slide.difficulty !== state.filters.difficulty) {
                return false;
            }
            if (query && !slide.searchableText.toLowerCase().includes(query)) {
                return false;
            }
            return true;
        });
    }

    function getActiveSlide() {
        return state.slides[state.activeIndex];
    }

    function goRelative(delta) {
        goToIndex(state.activeIndex + delta, delta < 0 ? "prev" : "next");
    }

    function goToSlideId(slideId) {
        const index = state.slides.findIndex((slide) => slide.id === slideId);
        if (index >= 0) {
            goToIndex(index, index < state.activeIndex ? "prev" : "next");
        }
    }

    function goToIndex(index, direction) {
        const bounded = Math.max(0, Math.min(index, state.slides.length - 1));
        if (bounded === state.activeIndex && state.slides.length > 0) {
            return;
        }
        state.direction = direction || (bounded < state.activeIndex ? "prev" : "next");
        state.activeIndex = bounded;
        renderAll();
        els.stage.focus({ preventScroll: true });
    }

    function markViewed() {
        const slide = getActiveSlide();
        if (!slide) {
            return;
        }
        if (!state.saved.viewed.includes(slide.id)) {
            state.saved.viewed.push(slide.id);
        }
    }

    function toggleStarForActiveSlide() {
        const slide = getActiveSlide();
        if (!slide) {
            return;
        }
        const index = state.saved.starred.indexOf(slide.id);
        if (index >= 0) {
            state.saved.starred.splice(index, 1);
        } else {
            state.saved.starred.push(slide.id);
        }
        persistState();
        renderSlide();
        renderNavigation();
        renderStats();
    }

    function openSearch() {
        els.searchModal.hidden = false;
        els.searchInput.focus();
        els.searchInput.select();
        renderSearchResults();
    }

    function renderSearchResults() {
        const results = getFilteredSlides().slice(0, 80);
        if (results.length === 0) {
            els.searchResults.innerHTML = `<p class="empty-section">No matching slides. Clear filters or try another term.</p>`;
            return;
        }
        els.searchResults.innerHTML = results.map((slide) => [
            `<button type="button" class="result-item" data-slide-id="${Parser.escapeAttribute(slide.id)}">`,
            `<strong>${Parser.escapeHtml(slide.baseTitle || slide.title)}</strong>`,
            `<span>${String(slide.number).padStart(3, "0")} / ${Parser.escapeHtml(slide.sourceShortTitle || "Deck")} / ${Parser.escapeHtml(slide.topic || slide.kind)}</span>`,
            `</button>`
        ].join("")).join("");
    }

    function openSourceForActiveSlide() {
        const slide = getActiveSlide();
        if (!slide || !slide.sourceBlockId) {
            openContentModal("Deck slide", slide ? slide.title : "Source", `<p>This slide is generated by the deck shell, not a markdown source block.</p>`);
            return;
        }
        const block = state.blocksById.get(slide.sourceBlockId);
        if (!block) {
            return;
        }
        openContentModal(
            `${block.sourceFile} / lines ${block.lineStart}-${block.endLine}`,
            block.title,
            Parser.renderMarkdown(block.lines)
        );
    }

    function openFocusedPanel(button) {
        const panel = button.closest(".focusable-panel");
        if (!panel) {
            return;
        }
        const clone = panel.cloneNode(true);
        clone.querySelectorAll(".focus-trigger").forEach((focusButton) => focusButton.remove());
        openContentModal("Expanded slide content", "Focus view", clone.outerHTML);
    }

    function openContentModal(eyebrow, title, html) {
        els.contentEyebrow.textContent = eyebrow;
        els.contentTitle.textContent = title;
        els.contentBody.innerHTML = html;
        els.contentModal.hidden = false;
    }

    function closeModals() {
        els.searchModal.hidden = true;
        els.contentModal.hidden = true;
    }

    function clearFilters() {
        state.filters.mode = "all";
        state.filters.source = "all";
        state.filters.difficulty = "all";
        state.filters.query = "";
        els.searchInput.value = "";
        
        document.querySelectorAll("[data-mode-filter]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.modeFilter === "all");
        });
        document.querySelectorAll("[data-source-filter]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.sourceFilter === "all");
        });
        document.querySelectorAll("[data-difficulty-filter]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.difficultyFilter === "all");
        });
        renderNavigation();
    }

    function jumpByQuery(query) {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const match = state.slides.find((slide) => {
            const haystack = slide.searchableText.toLowerCase();
            return terms.some((term) => haystack.includes(term));
        });
        if (match) {
            goToSlideId(match.id);
        }
    }

    function renderError(error) {
        els.stage.innerHTML = [
            `<article class="slide-card error-card">`,
            `<header class="slide-header">`,
            `<p class="eyebrow">Load failed</p>`,
            `<h2>Start the local server</h2>`,
            `</header>`,
            `<div class="slide-body">`,
            `<div>`,
            `<p>The markdown files must be fetched over local HTTP.</p>`,
            `<pre>python3 -m http.server 4173</pre>`,
            `<p>Then open <code>http://localhost:4173/site/</code>.</p>`,
            `<pre>${Parser.escapeHtml(error && error.stack ? error.stack : String(error))}</pre>`,
            `</div>`,
            `</div>`,
            `</article>`
        ].join("");
    }
})();
