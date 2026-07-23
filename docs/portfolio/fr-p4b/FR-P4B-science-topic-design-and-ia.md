# FR-P4B science topic design and IA

## Status

This document began as the ChatGPT web implementation checkpoint for `FR-P4B Work Cells Topic Experience and Route-Scoped Interaction`. The local Codex closeout has since replaced the temporary enhancer with direct `app.js` integration and completed targeted/runtime/browser acceptance. Final release, rename and Pages results are owned by the FR-P4B final report and run manifest.

## Starting truth

- Base repository: `Archmays/Family-Reading`
- Base main: `24fd0787bce84d45e5f71591e6da7201176c4c21`
- Shared branch: `codex/fr-p4b-work-cells-topic-experience`
- Runtime contract: 27 topics, 24 categories, 108 stations, 162 questions, 286 reduced page refs and 400 verified Work Cells images.
- Route JSON contract: home / Carmela series / Carmela detail / Work Cells series / Work Cells detail = `1 / 2 / 4 / 2 / 3`.
- P4A runtime generator, generated JSON and request architecture are not redesigned in this checkpoint.

## Product direction

The Work Cells detail experience is upgraded from the generic `book-layout + content-section + annotation-card` renderer to a domain-specific **Science Topic Atlas / 身体科学主题图册**.

The page remains a paper-manga companion. It is not an ebook, medical diagnostic product, quiz, progress tracker, completion system or account product.

## Information architecture

1. Science topic hero
   - category
   - source label
   - topic title
   - summary
   - reading focus
   - key biology concepts
   - one topic thumbnail
2. Topic companion route
   - 先认识这个主题
   - 身体科学小站
   - 一起聊一聊
   - 家长共读
   - 来源线索
3. Topic overview
4. Four body-science stations
5. Parent question groups
6. Parent and sensitive-content guidance
7. Source notes

Existing route section ids are retained:

- `science-overview`
- `science-station`
- `science-questions`
- `science-parent-guidance`
- `source`

The final local implementation includes all five ids in the `app.js` allowlist. `science-parent-guidance` is a canonical hash route and passed direct load, reload, title, focus, announcement, `aria-current` and history checks.

## View model

`assets/science-companion.js` exports:

- `createScienceTopicViewModel(topic)`
- `renderScienceTopicAtlas(viewModel, options)`

The view model derives UI-only structure from the current P4A runtime topic without modifying generated JSON:

- stable topic identity
- normalized overview
- four station records
- four canonical question groups plus safe fallback
- parent guidance
- source notes
- deterministic topic-local media registry
- station illustration groups
- station manga groups
- question manga groups

The family-facing render excludes publication codes, authoring fields, prompt fields, generator metadata, rights metadata and private/source paths.

## Question grouping

- `observation` → `观察画面`
- `understanding` → `理解身体机制`
- `life-connection` → `联系生活`
- `science-concept` → `说清科学概念`
- unknown types → `继续讨论`

Answers and parent hints are hidden by default and remain associated with a labelled button/region pair. There is no correctness, score, completion or saved answer state.

## Media contract

The implementation reuses the P3B shared disclosure and lightbox contracts:

- closed station/question media groups contain templates, not active image nodes;
- first open mounts only the selected group;
- group paths are de-duplicated while use sites remain distinct;
- lightbox openers carry `data-lightbox-group` and `data-media-id`;
- the existing shared lightbox keeps group isolation, focus trap, inert background, Escape, arrows, focus restoration and active-source cleanup;
- print does not mount media.

Initial science-detail target:

- hero image requests: 1
- station illustration requests: 0
- manga page requests: 0
- idle lightbox image requests: 0
- audio requests: 0

## Local direct integration

The local closeout supersedes the web checkpoint's temporary pre-app enhancer:

1. `app.js` imports the two pure science functions directly;
2. the existing loader remains the only runtime JSON writer and fetch path;
3. `scienceTopicPage()` adapts the selected runtime topic once and calls the Atlas renderer;
4. `index.html` loads only `app.js`; the science module has no browser-side installer or global side effect;
5. the temporary fetch wrapper, `innerHTML` interception and parent jump were removed.

This keeps Work Cells detail at three JSON requests while preserving the existing home, series, Carmela, error, disclosure, answer and lightbox lifecycles.

## Styling

`assets/science-companion.css` adds only science-domain presentation:

- science hero
- route rail
- editorial overview
- numbered station route
- core-question emphasis
- parent-note treatment
- grouped question deck
- answer regions
- on-demand media disclosures
- responsive, short-landscape, reduced-motion, forced-colors and print rules

It inherits existing P2 tokens and does not establish a second site-wide design system.

## Web-side checks completed

- `science-companion.js`: Node syntax check passed.
- `fr-p4b-web-implementation.test.mjs`: Node syntax check passed.
- Pure-function sample smoke produced:
  - stations: 4
  - questions: 6
  - media groups: 14
  - initial active image sources: 1

The full 27-topic test suite was authored but not executed in the web environment because the connected GitHub surface does not provide a runnable checkout.

## Local Codex acceptance results

- 27/27 direct routes: PASS.
- 24 categories, 108/108 stations, 162/162 questions, 286/286 page refs and 400/400 images: PASS.
- Five canonical routes and single `aria-current`: PASS.
- Cold Work Cells detail: 3 JSON, `1 / 0 / 0` hero / station / manga: PASS in six fresh contexts.
- Disclosure request isolation, reopen reuse, grouped lightbox and route cleanup: PASS.
- Carmela P3B browser/request smoke: PASS.
- Responsive, short-landscape, keyboard, forced-colors, reduced-motion, text-spacing and print: PASS.
- Runtime staleness and public-repository validator: PASS.
- In-place repository rename and canonical local `origin`: COMPLETE; final build/dist and exact-SHA Pages results are recorded only after those remaining closeout actions complete.

## Out of scope

- runtime generator changes
- runtime topic edits
- Work Cells audio
- medical content rewrite
- image generation or conversion
- `srcset` / AVIF pipeline
- Pages artifact deep slimming
- FR-P5 or FR-P6
