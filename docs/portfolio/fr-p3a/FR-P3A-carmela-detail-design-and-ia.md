# FR-P3A Carmela detail design and information architecture

## Decision

FR-P3A reshapes all 12 Carmela book details into one paper-book companion flow. It keeps the P2 shell, tokens, breadcrumbs, lightbox and static routing, while replacing the old equal-weight long stack with a clear reading path. It does not create an ebook, a learner tracker, a new data source, or a second rendering pipeline.

Baseline: `7397effccb417e7fa990490713b0f244fbb5c512` on `main`.

## Page anatomy

| Order | Stable id | Child-facing label | Purpose | Primary content and interaction |
|---:|---|---|---|---|
| 0 | - | Book hero | Establish book identity and a calm entry point | Cover, series/order, title, one summary, content tags, `从故事总览开始`, `听音频` |
| 1 | - | 这本书的伴读路线 | Make a long page locally navigable | Native `details`, eight hash links, current-section state, mobile collapsed state |
| 2 | `overview` | 快速了解 | Give the minimum orientation before discussion | Characters, places, relationships, conflict and emotional arc |
| 3 | `review` | 故事回顾 | Reconnect the paper-book sequence | One preserved summary and ordered story beats |
| 4 | `scenes` | 故事路线 | Turn scene data into a readable route | Numbered stitched trail, page range, focus points and collapsed page evidence |
| 5 | `questions` | 一起聊一聊 | Move from recall to interpretation and expression | `事实回忆`, `理解故事`, `开放表达`; accessible answer/talking-point controls |
| 6 | `background` | 背景发现 | Extend the story into nearby real-world context | Explanation text, generated explanatory art where available, collapsed source-page evidence |
| 7 | `encyclopedia` | 剧情百科 | Explain story-linked concepts without becoming a general encyclopedia | Appearance, definition, relevance and discussion prompt; optional art/evidence |
| 8 | `audio` | 听一听 | Keep whole-book companion audio available | Play/pause, time, seek, native audio fallback, live status and failure state |
| 9 | `parents` | 家长共读 | Put pacing and sensitive-context guidance at the end | Preserved reading use, suggested flow and sensitive points |

The eight pre-existing section ids remain authoritative. Direct section routes focus the corresponding heading and update `aria-current="location"`; a base route focuses the single H1.

## View-model boundary

`assets/carmela-companion.js` is the only new JavaScript module. `createCarmelaCompanionViewModel()` is a pure, explicit allowlist between the existing 12 book records and the child-facing renderer.

| View-model area | Allowed values |
|---|---|
| `identity` | slug, series title, order, title, cover |
| `summary` | existing companion summary |
| `facts` | characters, places, character relationships, conflict, emotional arc |
| `storyReview` | existing summary and ordered beats |
| `scenes` | sequence, title, narrative, page range, focus labels, public page-image references |
| `questionGroups` | Chinese group identity, prompt, talking points, open-ended flag, page range and public evidence |
| `background` / `encyclopedia` | preserved child-facing text, public page evidence and generated-image references |
| `audio` | public path, title and validated markers only |
| `parents` | reading use, suggested flow and sensitive points |

Authoring and local-only fields do not cross this boundary: prompt identifiers, review state, schema/status metadata, original source paths, source PDFs and local absolute paths are omitted. The adapter does not write data or browser storage.

## Interaction contracts

- Native `details` is used for the companion route, relationships and evidence, preserving browser keyboard behavior.
- Each question control owns one stable, unique answer id. `aria-controls` and `aria-expanded` stay synchronized; the revealed answer is a labelled region.
- Open-expression cards state `没有唯一答案` and expose `查看讨论提示`; the other groups expose `查看参考答案`.
- Evidence thumbnails stay outside the initial tab order while their disclosure is closed. Opening a thumbnail uses the inherited P2 modal, including arrow navigation, Escape and opener-focus restoration.
- Audio has no autoplay and no persisted position. Route teardown pauses the old audio and the new route starts at zero. Both `<audio>` and nested `<source>` failure events enter the same safe error state.
- The skip link focuses the current route heading without changing the SPA hash.

## Visual direction

The design remains the P2 Warm Companion Atlas: paper cream, ink text, Song-style display type, YaHei-style UI type, Carmela coral and restrained blue-green focus states. The distinctive long-page devices are a book-page bookmark in the hero and a stitched story route.

The hierarchy intentionally reduces card soup:

- hero, section headings and the story trail establish the main rhythm;
- facts use light editorial columns rather than a wall of identical cards;
- question and discovery cards are reserved for content that benefits from containment;
- evidence is secondary and collapsed by default;
- the local rail provides orientation on wide screens without becoming a global dashboard.

## Responsive and print rules

| Mode | Contract |
|---|---|
| Wide desktop | Two-column body with a sticky local rail and open route details |
| Tablet | Maintains readable line length and converts dense groups before overflow |
| Mobile at or below 680 px | Single-column hero, compact cover, full-width actions, collapsed route details and 44 px controls |
| Short landscape | Rail becomes static, has no internal scroll, and route details collapse |
| Forced colors | Decorative color is dispensable; borders and current/focus states remain visible |
| Reduced motion | Smooth scrolling is disabled |
| Print | Companion text and all answers print; nav, buttons, audio, lightbox and page-evidence galleries do not |

## Complexity and deployment

- Static GitHub Pages only; no server, database, account or private runtime service.
- Startup data stays at 28 JSON files and 2,810,496 raw bytes.
- Runtime dependencies and external fonts/scripts remain zero.
- Raw JavaScript is 75,016 bytes against a 110 KiB hard gate.
- Raw CSS is 58,877 bytes. This crosses the 55 KiB warning line but remains 12,803 bytes below the 70 KiB hard gate; the additional rules are scoped to the Carmela renderer and its responsive/print modes.
- Only the cover and one visible explanatory image are eager; 85 of 87 Book 1 images and 115 of 117 Book 11 images are lazy.
- No source, data, book JSON, audio or image asset was added or changed.

## Explicit exclusions

FR-P3A does not redesign home, series or Work Cells; does not add reading state, check-ins, statistics, accounts or ebook-style full text; does not perform media refinement; and does not begin FR-P3B, P4 or P5.
