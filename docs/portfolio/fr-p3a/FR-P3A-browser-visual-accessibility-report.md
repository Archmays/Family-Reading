# FR-P3A browser, visual and accessibility report

## Result

`ACCESSIBILITY_STATUS: PASS`

`RESPONSIVE_STATUS: PASS`

`SHORT_LANDSCAPE_STATUS: PASS`

`PRINT_STATUS: PASS`

`CARMELA_AUDIO_NON_REGRESSION: PASS`

`CARMELA_LIGHTBOX_NON_REGRESSION: PASS`

The current implementation was exercised in the Codex in-app browser and Playwright CLI Chromium on Windows. Browser viewport emulation, not separate physical phones or tablets, is the evidence boundary. The persistent evidence is recorded in `reports/portfolio/fr-p3a/fr-p3a-ui-baseline.json`.

## Coverage

| Coverage set | Checks | Result |
|---|---:|---|
| Book 1 and Book 11 across nine required viewports | 18 | PASS |
| Remaining ten books at 390x844 and 1280x720 | 20 | PASS |
| Book 1 and Book 11 base, eight section routes and invalid section | 20 | PASS |
| Persistent visual baselines | 6 | PASS |

Required viewports: 390x844, 430x932, 768x1024, 1024x768, 1280x720, 1440x900, 1024x400, 844x390 and 667x375.

Every valid direct section route focused its H2, exposed the matching current local-navigation item and announced the route. Base routes focused the single H1. Invalid sections focused the error H1. Back/forward navigation retained the same behavior.

## Representative page metrics

| Metric | Book 1 | Book 11 | Gate |
|---|---:|---:|---|
| DOM nodes | 830 | 936 | reasonable for preserved long-form content |
| Initial real tabbables | 49 | 49 | suggested maximum 80 / 100 |
| Image elements | 87 | 117 | no eager full gallery |
| Eager images | 2 | 2 | PASS |
| Lazy images | 85 | 115 | PASS |
| Duplicate ids | 0 | 0 | must be 0 |
| Nested controls | 0 | 0 | must be 0 |

Real tabbables use browser visibility and native closed-`details` semantics; hidden page thumbnails are not counted merely because their DOM nodes exist.

## Interaction results

| Interaction | Evidence | Result |
|---|---|---|
| Skip link | Keyboard activation focused the current book H1 without changing the route hash | PASS |
| Breadcrumb and local navigation | Correct destinations; section link receives current-location state | PASS |
| Mobile route details | Initially closed; Enter and Space open/close the native summary; 50.4 px high | PASS |
| Story evidence | Closed by default; opening exposes the expected page buttons | PASS |
| Question answers | Stable control/region association, focus retained, expanded label synchronized | PASS |
| Open expression | Uses discussion wording and states there is no unique answer | PASS |
| Answer evidence | Remains independently collapsed and keyboard operable | PASS |
| Background / encyclopedia | Text, generated illustration and evidence disclosure remain usable | PASS |
| Lightbox | Open, arrows, Escape, close and opener-focus restoration all pass | PASS |
| Audio normal path | No autoplay; play, pause, 30-second range seek, ArrowRight seek and time display pass | PASS |
| Audio teardown | Leaving a playing Book 1 route yields paused Book 2 audio at zero | PASS |
| Audio error | Failing either the audio element or its nested source disables controls and announces a safe message while other sections remain usable | PASS |

Audio seek was verified on a local static server with HTTP Range support. The first diagnostic server returned only 200 responses for Range requests and therefore could not seek; replacing that test server resolved the diagnostic without an application change. Chromium may report the intentional end of a `preload="metadata"` byte-range request as `ERR_ABORTED` after metadata is available; it is a media cancellation, not a missing application asset. Unexpected console errors, failed application assets and bad HTTP responses were zero.

## Accessibility and responsive modes

| Check | Observation | Result |
|---|---|---|
| Heading structure | One H1, ordered section headings and labelled answer regions | PASS |
| Keyboard-only | Skip, links, native details, answer buttons, lightbox, range and native audio are reachable | PASS |
| Touch target | Zero visible interactive controls below 44x44 CSS px in the required matrix | PASS |
| Forced colors | Active mode detected; visible borders/current state; no overflow or small controls | PASS |
| Reduced motion | Active mode detected; computed document scroll behavior is `auto` | PASS |
| Equivalent 200% reflow | 640 CSS-pixel layout equivalent to a 1280-wide page at 200%; single-column, no horizontal overflow | PASS |
| Text spacing | Injected WCAG-style line, letter and word spacing; no page overflow or material clipping | PASS |
| Short landscape | At 667x375 and the other required landscape sizes, rail is static, details collapsed and no internal rail scroll exists | PASS |
| Focus continuity | Base, direct route, answer and modal close focus targets remained defined | PASS |

The text-spacing diagnostic reported only the intentionally one-pixel offscreen live announcer and a fractional-height kicker difference; neither is visible text loss.

## Print

Playwright generated an A4 Book 11 print artifact and Poppler rendered pages 1, 6 and 11 for visual review.

| Print contract | Observation | Result |
|---|---|---|
| Required companion sections | title, overview, review, scenes, questions, background, encyclopedia and parent guide visible | PASS |
| Collapsed answers | 9/9 print with all talking points | PASS |
| Hidden utility UI | nav, buttons, audio, lightbox and 22 evidence galleries hidden | PASS |
| Pagination | 11 A4 pages; controlled breaks; no empty page | PASS |
| Visual quality | no clipping, overlap, broken glyphs or blank page on first/middle/last review | PASS |

The local-only PDF SHA-256 is `5d48b434d8a98915305ca41d3f2aa23d6fa1b0db4179ecfac58e6e914cff80df`. The PDF and rendered PNGs are test scratch and are not committed or copied to `dist`.

## Persistent screenshots

All six images are viewport screenshots, WebP, at most 1440 pixels on the longest side and individually below 500 KB. Total size is 267,620 bytes. Each was visually reviewed and none enters `dist`.

| Screenshot | Viewport | Bytes | SHA-256 | Review |
|---|---:|---:|---|---|
| `screenshots/book1-desktop-overview.webp` | 1440x900 | 52,874 | `5e474f652f5daca14aa8ef600559adff4cb1fe37a6cca382e95634b29bdac786` | hero, rail and overview hierarchy clear |
| `screenshots/book1-mobile-overview.webp` | 390x844 | 27,342 | `cd81eff928cadb10cf06f9cfd799dfbb08a864fb3f2a9fd4bfab7ec21374badc` | single-column hero, compact cover and collapsed nav |
| `screenshots/book1-questions.webp` | 1280x900 | 37,686 | `7e8d119121b755c138deaf4488d7dd4ff0115ed3078e5d7d4447832974f6eff2` | Chinese question hierarchy and controls clear |
| `screenshots/book11-desktop-story-trail.webp` | 1440x900 | 58,478 | `595c4862ebf72c12a8588f509d54e3845c5877674a916f4e063d9fc2191d1c49` | stitched dense story route remains readable |
| `screenshots/book11-mobile.webp` | 390x844 | 28,532 | `e27f81dc33e59bedbe7dd5859e57b5d362bb31226f2a763c4bba23d5aa85e553` | high-density book still enters calmly on mobile |
| `screenshots/book11-background-encyclopedia.webp` | 1280x900 | 62,708 | `b3c6dcfe4a8dec238f3abdc7a30357209cffc66d1ccd54cda4a9fafb5ddd24a9` | encyclopedia facts and explanatory art balance |

Local-only forced-colors and short-landscape screenshots were also reviewed. Their SHA-256 values are `9fa3f221001936a89d5653390fe4e2d36d1ee917170c0e7c02192d6e055eabef` and `8f51b37bd8117e91082c147da6938b7ff2f630e7aea69ffb17481194a5b81114`.

## Must-be-zero review

| Finding | Count |
|---|---:|
| Unexpected console errors | 0 |
| Failed application requests | 0 |
| Broken images | 0 |
| Horizontal overflow | 0 |
| Heading clipping | 0 |
| Control overlap | 0 |
| Visible controls below 44 px | 0 |
| Duplicate ids | 0 |
| Nested controls | 0 |
| Focus loss | 0 |
| Work Cells regressions | 0 |

No visual or accessibility compromise is carried into the next phase. Media-level refinement remains the named FR-P3B scope, not an FR-P3A defect.
