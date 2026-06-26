# SwiftUI Study Deck

An interactive, local-first slide deck generated from the SwiftUI Foundations guide and the iOS/SwiftUI interview FAQ.

[Open the deck](http://localhost:4173/site/) after starting the local server.

![SwiftUI Study Deck preview](site/assets/images/deck-preview.png)

## Quick Start

```bash
cd /Users/sendo.tjiamis/Workspaces/SwiftUI-Foundation
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/site/
```

Use left/right arrows, swipe, or the on-screen navigation buttons to move through the deck.

## Interactive Controls

<details open>
<summary>Study controls</summary>

- `Left` / `Right`: previous or next slide
- `/`: open search
- `S`: star the current slide
- `Esc`: close search or source modal
- Source filters: all slides, Foundations only, or FAQ only
- Difficulty filters: Beginner, Intermediate, Senior
- Full source: opens the complete markdown block for the current slide
- Expand: opens wide code blocks, tables, or diagrams in a focused view

</details>

<details>
<summary>Content coverage</summary>

The deck treats the markdown files in `docs/` as canonical data sources:

- `docs/swiftui-foundations.md`
- `docs/swift-ios-swiftui-interview-faq.md`

The source files are parsed into 575 slides. Long sections become continuation slides instead of being truncated.

</details>

<details>
<summary>Folder map</summary>

```text
docs/
  swiftui-foundations.md
  swiftui-foundations.pdf
  swift-ios-swiftui-interview-faq.md
  swift-ios-swiftui-interview-faq.pdf

site/
  index.html
  assets/css/deck.css
  assets/js/deck-parser.js
  assets/js/deck-app.js
  assets/images/deck-preview.png
  tools/content-audit.js
  tools/layout-audit.js
  tools/capture-deck-preview.js
```

</details>

## Verification

```bash
node --check site/assets/js/deck-parser.js
node --check site/assets/js/deck-app.js
node --check site/tools/content-audit.js
node --check site/tools/layout-audit.js
node --check site/tools/capture-deck-preview.js
node site/tools/content-audit.js
```

For rendered layout checks, start Chrome with remote debugging, then run the audit:

```bash
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --remote-debugging-port=9222 \
  --user-data-dir=/private/tmp/swiftui-deck-chrome-profile \
  --no-first-run \
  --no-default-browser-check \
  http://localhost:4173/site/

node site/tools/layout-audit.js
```

## Regenerate Preview

With the local server and debug Chrome running:

```bash
node site/tools/capture-deck-preview.js
```

This updates:

```text
site/assets/images/deck-preview.png
```

---
*Generated with AI coding assistant*
