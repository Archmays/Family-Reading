# FR-P4B browser, network and accessibility report

## Outcome

The Science Topic Atlas passed the local Chromium and Codex in-app Browser acceptance matrix. The page remains a static project-subpath application and preserves the P4A request contract.

## Measurement boundary

- Browser: Chromium 150 on Windows through Playwright CLI, plus Codex in-app Browser interaction checks.
- Static path: `/Family-Reading-Codex/`.
- Server: HTML and JavaScript MIME PASS; `Cache-Control: max-age=3600`.
- HTTP Range: `bytes=0-31` returned `206` and `Content-Range: bytes 0-31/5208122`.
- No HAR, persistent browser profile, cookies, trace or token output was retained.

## Route and viewport coverage

All 27 topic slugs were direct-loaded at `390×844` and `1280×720`: 54/54 cases passed.

Six depth cases were then checked at nine viewports (`390×844`, `430×932`, `768×1024`, `1024×768`, `1280×720`, `1440×900`, `1024×400`, `844×390`, `667×375`): 54/54 cases passed.

The depth slugs were:

1. `streptococcus-pneumoniae`
2. `cancer-cell-ii`
3. `novel-coronavirus`
4. `hemorrhagic-shock`
5. `induced-pluripotent-stem-cells`
6. `cedar-pollen-allergy`

Across both matrices there were zero horizontal-overflow, heading-clipping, control-overlap, sub-44px visible-control, duplicate-ID, nested-control, broken-image, heading-order or unexpected browser-diagnostic findings.

## Cold request contract

Each of six fresh browser contexts produced the same result:

| Request class | Expected | Actual |
| --- | ---: | ---: |
| JSON | 3 | 3 |
| Hero image | 1 | 1 |
| Station illustration | 0 | 0 |
| Manga page | 0 | 0 |
| Idle lightbox image | 0 | 0 |
| Work Cells audio | 0 | 0 |
| Other topic detail | 0 | 0 |
| Carmela detail | 0 | 0 |
| Old Work Cells manifest | 0 | 0 |
| Page map | 0 | 0 |
| Unrelated origin | 0 | 0 |

Same-topic navigation through all five section routes, then browser back/forward, added zero JSON requests.

## Interaction and accessibility

- Five canonical routes, including `science-parent-guidance`, passed direct load, reload, title, announcement, section-heading focus, history and single-`aria-current` checks.
- The mobile route `<details>` closed and reopened from the keyboard.
- The skip link moved focus to the route heading.
- Answer buttons synchronized label and `aria-expanded`, retained focus, and showed both answer and parent hint only on request.
- Station illustration, station manga and question manga mounted exactly `1 / 2 / 2` items; reopen transfer was zero.
- Lightbox navigation remained inside the active group. Arrow navigation, Escape, source cleanup, body-lock cleanup, and opener focus restoration passed.
- Rapid topic switching ended on the requested topic with no stale markup, mounted media or open lightbox.
- The injected one-time topic failure exposed path-safe copy; retry made two detail requests and recovered. Its one route error and one browser resource error were expected test stimuli; unexpected diagnostics remained zero.

## P4A and Carmela non-regression

| Route | JSON |
| --- | ---: |
| Home | 1 |
| Carmela series | 2 |
| Work Cells series | 2 |
| Carmela detail | 4 |

The Carmela detail made one cover request, zero initial MP3 requests, mounted zero disclosure images initially, and kept audio idle without `src`. Its first disclosure mounted exactly two images.

## Alternate modes and print

- Reduced motion: query matched; animation and transition durations were `0s`.
- Forced colors: five route links remained visible with zero overflow.
- Text spacing and 640px reflow proxy: zero overflow and zero clipped headings.
- Short landscape: passed in both depth matrices and retained screenshot evidence.
- Print: title, overview, four stations, four station parent notes, six questions, six answers, six parent hints, parent guidance and source notes were visible. Navigation, buttons, hero media, disclosures and lightbox were hidden. No media was mounted or newly requested.

## Retained screenshots

- `docs/portfolio/fr-p4b/screenshots/work-cells-heavy-desktop.webp`
- `docs/portfolio/fr-p4b/screenshots/work-cells-cancer-ii-mobile.webp`
- `docs/portfolio/fr-p4b/screenshots/work-cells-short-landscape.webp`

Physical iOS/Android devices and an external screen-reader session were not available. Their absence is not reported as a pass; the substitute evidence is the nine-viewport reflow matrix plus semantic, focus, keyboard and accessible-name browser checks.

## Machine-readable evidence

- `reports/portfolio/fr-p4b/fr-p4b-route-network-baseline.json`
- `reports/portfolio/fr-p4b/fr-p4b-ui-baseline.json`
