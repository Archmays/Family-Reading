# FR-P4A route and network report

## Cold-route result

Counts below are observed JSON requests from isolated Chromium sessions. Raw bytes are deterministic uncompressed file bytes, excluding HTTP headers.

| Route | JSON requests | Raw JSON bytes | Contract | Unrelated domain | Result |
|---|---:|---:|---:|---:|---|
| Home | 1 | 1,187 | exactly 1 | 0 | PASS |
| Carmela series | 2 | 6,893 | at most 2 | 0 | PASS |
| Carmela Book 1 | 4 | 26,905 | at most 4 | 0 | PASS |
| Carmela Book 11 | 4 | 31,070 | at most 4 | 0 | PASS |
| Work Cells series | 2 | 15,914 | at most 2 | 0 | PASS |
| `streptococcus-pneumoniae` | 3 | 27,615 | at most 3 | 0 | PASS |
| `induced-pluripotent-stem-cells` (largest) | 3 | 35,796 | at most 3 | 0 | PASS |
| `cancer-cell-ii` | 3 | 30,711 | at most 3 | 0 | PASS |
| `novel-coronavirus` | 3 | 35,030 | at most 3 | 0 | PASS |

Every Work Cells case requested zero draft-manifest/page-map JSON and zero Carmela detail JSON. Every Carmela case requested zero Work Cells index/detail JSON. Book detail cases requested only the selected asset and companion documents; topic detail cases requested only the selected topic detail. A valid-shape missing book slug loaded only the runtime index and Carmela summary index, then rendered the existing not-found UI without requesting a detail.

## Warm navigation and cache

- Home -> Carmela series -> Book 1 -> section -> back used four unique JSON resources in total; section/back added no JSON request.
- Home -> Work Cells series -> `streptococcus-pneumoniae` -> section -> back used three unique JSON resources in total.
- Browser back/forward between Book 1 and the Carmela series reused the same four JSON resources.
- Concurrent loader tests prove same-path coalescing; failed and aborted work is not retained as a resolved cache entry.
- No local/session storage, service worker or default prefetch is used.

## Race, failure and retry

A delayed Book 1 companion response was followed immediately by navigation to `streptococcus-pneumoniae`. The final title, heading and body remained the science topic after the delayed Carmela response completed; no stale book render or background audio appeared.

An injected 503 for only `streptococcus-pneumoniae.json` produced the scoped family-facing error, no technical/public JSON path, and a working retry. After removing the fault, retry reused the cached home/topic indexes, requested only the selected detail again, and recovered to the topic page. The two console errors in this case were the deliberate HTTP 503 and the intentional route diagnostic; successful primary routes had zero console errors/warnings.

## Current UI and media non-regression

Book 1 initially requested no page-detail media and no MP3. Opening the first page disclosure mounted exactly two complete images, the group lightbox opened on the selected page, and audio remained absent until the play button was used. User intent then produced one MP3 request with HTTP 206, a finite ready state and active playback; playback was paused during cleanup.

The current Work Cells topic page retained its existing sections, four stations, six question cards and reduced page-reference images. Topic category grouping, breadcrumbs, title, focus announcement, hash sections, invalid-route behavior and current visual structure were not redesigned.

## Responsive and alternate modes

Primary routes were exercised at 390x844, 768x1024, 1280x720, 1440x900 and 1024x400. Explicit overflow probes at the mobile, tablet, desktop and short-landscape boundaries found body/document width equal to the viewport. Reduced-motion and forced-colors media queries activated with the correct route heading still present. Print emulation retained the main science content. Direct reload, hash section, back/forward, rapid switching, retry, cache reuse and cross-domain navigation passed.

No raw HAR, cookie, browser profile or persistent screenshot was stored. Playwright CLI working data stayed outside the repository and is removed at closeout.

## Size and build comparison

| Metric | P3B | FR-P4A | Result |
|---|---:|---:|---|
| Startup JSON request count | 28 | home 1; series 2; selected detail 3 or 4 | PASS |
| Startup raw JSON | 2,810,496 B | 1,187 B home; maximum representative 35,796 B | PASS |
| Raw JavaScript | 89,466 B | 100,696 B | below 120 KiB preference |
| Raw CSS | 60,140 B | 60,166 B | +26 B; data-phase design unchanged |
| Runtime dependencies | 0 | 0 | PASS |
| Dist | 838,074,288 B | 835,920,908 B | -2,153,380 B |

The dist reduction comes from removing the draft manifest and page map from publication while adding the 393,121-byte runtime tree. No media or family-visible content was deleted to obtain the reduction.

## Post-commit closure

The exact-SHA GitHub Pages run and live-route request smoke are necessarily performed after the report commit. Their final run id, deployed SHA, warning annotations and live URL are recorded in the final handoff rather than creating a self-referential report commit.
