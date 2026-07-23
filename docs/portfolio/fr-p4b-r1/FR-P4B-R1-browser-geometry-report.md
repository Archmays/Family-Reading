# FR-P4B-R1 browser geometry report

## Outcome

The Work Cells `食物中毒` hero no longer overlaps its copy at the reported reproduction size, across the continuous responsive interval, or at the single/dual-column boundary. Chromium measured 545 geometry cases with zero overlap, containment, overflow, clipped-copy, broken-hero, undersized-control, console, page, request or bad-response findings.

This is browser acceptance of the web candidate based on production tip `4675b5467209fd87a5da71430118298c1ffee47c`, not an inference from its static CSS.

## Subject and evidence boundary

The canonical runtime index resolves the reported topic as:

```text
ROUTE: #/science/work-cells/food-poisoning
TITLE: 食物中毒
CATEGORY: 消化道与病原体
SOURCE: 第2卷 第5话
DETAIL: public/runtime/work-cells/topics/food-poisoning.json
```

The original screenshot was approximately 773×709 image pixels. Its CSS viewport, browser zoom and device scale cannot be recovered from image pixels alone. Acceptance therefore includes an explicit 773×709 CSS viewport at DPR 1 and a reproducible 80%–200% CSS-viewport-equivalent sweep. Native browser zoom was not programmatically changed, and device scale factor remained 1; neither is reported as equivalent to screenshot pixels.

Browser:

```text
ENGINE: Chromium 150.0.7871.181 via @playwright/cli
USER AGENT: HeadlessChrome/150.0.0.0 on Windows
SERVICE WORKERS: 0
PERSISTENT PROFILE: false
```

Physical iOS/Android devices and an external screen reader were unavailable. They are not reported as passed. The bounded evidence is Chromium viewport automation plus semantic, keyboard, focus, accessible-state and mode checks.

## Geometry contract

Every sample reads the hero, media and copy bounding rectangles; computed grid columns and gap; viewport/client/scroll dimensions; DPR and visual viewport scale; media-query state; hero image state; text clipping; H1 count; and control sizes.

Tolerance is 0.5 CSS px:

```text
media.left >= hero.left - 0.5
media.right <= hero.right + 0.5
copy.left >= hero.left - 0.5
copy.right <= hero.right + 0.5

dual column:
media.right + max(0, computed column gap - 0.5) <= copy.left + 0.5

single column:
media.bottom + max(0, computed row gap - 0.5) <= copy.top + 0.5

hero.scrollWidth <= hero.clientWidth + 1
document.scrollWidth <= document.clientWidth + 1
```

Layout mode is determined from the computed `grid-template-columns`, not guessed from viewport width.

## Coverage and results

| Phase | Coverage | Cases | Result |
|---|---|---:|---|
| Continuous width | 7 depth topics; 320–1440 CSS px; step at most 32 px and at most 16 px through 680–1120 | 469 | PASS |
| Named and boundary sizes | 14 sizes including all required sizes and 1088/1089 boundary probes | 14 | PASS |
| Topic endpoints | all 27 runtime topics at 390×844 and 1280×720 | 54 | PASS |
| Zoom equivalent | 80, 90, 100, 110, 125, 150, 175 and 200 percent | 8 | PASS |
| Total | 409 single-column and 136 dual-column | 545 | PASS |

Depth topics are `food-poisoning`, `cancer-cell-ii`, `novel-coronavirus`, `hemorrhagic-shock`, `erythroblast-and-myelocyte`, `left-shift-of-white-blood-cells` and `induced-pluripotent-stem-cells`. Together they cover the reported topic and the runtime-derived extremes for title, category/source, summary/reading focus, tags and detail size.

```text
HERO_OVERLAP_FINDINGS: 0
HORIZONTAL_OVERFLOW_FINDINGS: 0
BROKEN_HERO_FINDINGS: 0
CLIPPED_TEXT_FINDINGS: 0
UNDERSIZED_CONTROL_SAMPLES: 0
CONSOLE_ERRORS: 0
CONSOLE_WARNINGS: 0
PAGE_ERRORS: 0
FAILED_REQUESTS: 0
BAD_RESPONSES: 0
```

The minimum observed separation was 22.39 px against a computed 22.4 px gap at 320×900. It is positive and within subpixel rounding tolerance.

## Reported and boundary geometry

| CSS viewport | Mode | Computed columns | Computed / actual separation | Result |
|---|---|---|---:|---|
| 773×709 | single | `647.375px` | 30.92 / 30.907 px | PASS |
| 1088×400 | single | `918.969px` | 43.52 / 43.515 px | PASS |
| 1089×400 | dual | `240px 636.359px` | 43.56 / 43.547 px | PASS |
| 390×844 | single | `324px` | 22.4 / 22.391 px | PASS |
| 1024×400 | single | `860.094px` | 40.96 / 40.953 px | PASS |
| 844×390 | single | `707px` | 33.76 / 33.75 px | PASS |

The highest-risk transition is explicit: 1088×400 remains a non-overlapping single column, while 1089×400 becomes a contained dual column with 43.547 px of measured horizontal separation.

## Final screenshots

| Evidence | CSS viewport | Mode | Bytes | SHA-256 |
|---|---:|---|---:|---|
| [`food-poisoning-773x709.webp`](screenshots/food-poisoning-773x709.webp) | 773×709 | single | 43,586 | `f90c647a8300f43934ffdc67b5b0228948cf9fbb4b77a1a7ed8f6e7f43b7cbce` |
| [`food-poisoning-dangerous-dual-1089x400.webp`](screenshots/food-poisoning-dangerous-dual-1089x400.webp) | 1089×400 | dual | 33,202 | `7840a3805224c2a97f10eb27296c0f8d7e5d878edf35958fd2d8ba308c8bc8e6` |
| [`food-poisoning-mobile-390x844.webp`](screenshots/food-poisoning-mobile-390x844.webp) | 390×844 | single | 54,476 | `07e0d2af0e0b47f627e5fa4b9a18446d6de29dd45418764ef5f37b9135364469` |

The three browser-content-only WebP files total 131,264 B. No screenshot is copied to `dist`.

## Network and interaction non-regression

The fresh `食物中毒` route loaded exactly:

```text
JSON: 3
HERO IMAGES: 1
STATION IMAGES: 0
MANGA IMAGES: 0
AUDIO: 0
OTHER TOPIC DETAILS: 0
CARMELA DETAILS: 0
OLD DRAFT MANIFEST: 0
PAGE MAP: 0
UNRELATED ORIGINS: 0
FAILURES: 0
```

Station illustration and manga disclosures, question answers and manga, group-scoped lightbox arrow navigation, Escape/close cleanup, focus restoration, back/forward navigation and same-topic section reuse passed. Same-topic navigation retained one detail request before and after section navigation. Injecting one detail-request failure displayed an isolated error without a local path, and retry recovered on the second request.

An initial evidence script sampled focus immediately after the hash changed and produced a timing false negative. The corrected fresh direct-load check waited through asynchronous render and the next animation frame, then confirmed:

```text
ACTIVE ELEMENT: h2#science-station-title
TABINDEX: -1
RAIL CURRENT: science-station / aria-current="location"
CURRENT RAIL LINKS: 1
BREADCRUMB CURRENT: aria-current="page"
ANNOUNCEMENT: 已到达：身体科学小站
```

Carmela non-regression passed for the 12-book series, Book 1, Book 11, on-demand media, lightbox focus restoration and user-triggered audio. The media request and explicit range probe both returned 206; the probe returned `Content-Range: bytes 0-1023/5208122`.

## Accessibility, modes and print

The browser audit passed:

- keyboard-only skip-link traversal and focus transfer;
- home H1, topic H1 and fresh direct-section route focus;
- scoped rail `aria-current` and breadcrumb current-page semantics;
- answers, disclosures and lightbox keyboard/focus behavior;
- forced-colors media-query activation with visible borders and no overflow;
- reduced-motion media-query activation with zero-duration motion and auto scroll behavior;
- WCAG text-spacing injection at 1280×720 and 390×844 with no clipping, overlap or overflow;
- 200% CSS-viewport-equivalent reflow at 640×360 with no clipping, overlap or overflow;
- short landscape at 844×390 single-column and 1089×400 dual-column;
- A4 print media, hidden navigation/media controls, visible answers and a valid temporary PDF.

The print PDF was inspected as a temporary artifact and deleted. No browser profile, HAR, trace, cookie or raw browser artifact is retained in the repository.

## Persistent machine evidence

`reports/portfolio/fr-p4b-r1/fr-p4b-r1-geometry-baseline.json` contains all 545 compact measurement records, the exact measurement contract, complete coverage arrays, diagnostics, screenshot hashes and failure list.

```text
REPORTED_SCREENSHOT_SIZE_STATUS: DOCUMENTED_EQUIVALENT
CONTINUOUS_WIDTH_SWEEP_STATUS: PASS
ZOOM_SWEEP_STATUS: PASS
WORK_CELLS_TOPIC_COUNT: 27/27
HERO_MEDIA_CONTAINMENT_STATUS: PASS
HERO_COPY_CONTAINMENT_STATUS: PASS
HERO_OVERLAP_FINDINGS: 0
HORIZONTAL_OVERFLOW_FINDINGS: 0
RESPONSIVE_STATUS: PASS
SHORT_LANDSCAPE_STATUS: PASS
ACCESSIBILITY_STATUS: DOCUMENTED_LIMITATION
```
