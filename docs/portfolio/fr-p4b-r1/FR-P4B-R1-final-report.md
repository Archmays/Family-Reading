# FR-P4B-R1 final report

## Outcome

FR-P4B-R1 repairs the Work Cells hero-media collision and closes the responsive gap that allowed the media panel to exceed its grid track. Browser acceptance covers the real `食物中毒` route, 545 geometry samples, all 27 Work Cells topics, the exact request budget, Work Cells interactions, Carmela, accessibility modes and A4 print.

The phase stays within the paper-book companion boundary. It changes no JavaScript behavior, runtime content, generator, product media, protected source, Carmela data, dependency or FR-P5 pipeline.

The exact final commit, GitHub Actions run, Pages deployment and live-site attestation can only exist after this tracked report is committed. Those values are resolved in the final handoff rather than written self-referentially into this commit.

## Scope and repair

The production change is limited to:

- `assets/science-companion.css`;
- the stylesheet cache identity in `index.html`.

The test/evidence closure adds the R1 responsive contract to the canonical test runner, hardens its CSS-block parsing, updates one superseded P4B short-landscape expectation, and records browser/release evidence.

The released collision combined:

1. a non-zero minimum first grid track;
2. media `min-height: 16rem` plus `aspect-ratio: 4 / 3`;
3. inherited generic thumbnail padding and image `max-height`;
4. a later short-height rule that could restore two columns without a safe minimum width.

The repair gives both tracks zero minimum, caps the media track, removes the hero media's intrinsic minimum/padding constraints, removes the inherited image-height cap, contains copy/tags/actions, moves to one column at 68rem, and allows the compact short-height dual-column form only above 68.0625rem. The missing-image fallback remains intact. No `overflow: hidden`, z-index cover-up, hidden hero or deleted copy is used.

## Acceptance summary

| Area | Accepted evidence | Status |
|---|---|---|
| Reported reproduction | `#/science/work-cells/food-poisoning` at 773×709 CSS px, DPR 1 | PASS |
| Continuous geometry | 469 depth-topic cases, widths 320–1440 with dense 680–1120 coverage | PASS |
| Named and boundary sizes | 14 cases including all required sizes and 1088/1089 transition | PASS |
| Zoom equivalent | 80, 90, 100, 110, 125, 150, 175 and 200 percent | PASS |
| Topic endpoints | 27/27 topics at 390×844 and 1280×720 | PASS |
| Geometry findings | overlap 0; horizontal overflow 0; clipped text 0; broken hero 0 | PASS |
| Work Cells cold network | 3 JSON / 1 hero / 0 station / 0 manga; unrelated 0 | PASS |
| Work Cells behavior | disclosures, answers, grouped lightbox, focus, history, retry and route cleanup | PASS |
| Carmela | series, Book 1, Book 11, on-demand media, lightbox, audio and 206 range | PASS |
| Accessibility/modes | keyboard, focus, current state, forced colors, reduced motion, text spacing, reflow, landscape and print | DOCUMENTED LIMITATION |
| Runtime | 31 files / 393,121 B, byte-identical, all declared outputs current | PASS |
| Source/media | protected signature unchanged; runtime/product media diff 0 | PASS |
| Targeted tests | R1 and affected closure complete | PASS |
| Final release gate | exactly one invocation; 137/137 tests; build and dist audit | PASS |
| Pages | exact-SHA workflow/deployment/live proof | RESOLVED POST-COMMIT |

The accessibility limitation is explicit: no physical iOS/Android device or external screen-reader session was available. Chromium keyboard, focus, semantic and mode checks passed, but the unavailable environments are not reported as passed. Native browser zoom was not changed; the scale sweep uses reproducible CSS-viewport equivalents.

## Browser geometry

The machine baseline contains all 545 samples:

```text
CONTINUOUS: 469
NAMED VIEWPORTS: 14
TOPIC ENDPOINTS: 54
ZOOM EQUIVALENTS: 8
SINGLE COLUMN: 409
DUAL COLUMN: 136
FAILURES: 0
```

At 773×709, the hero is single-column with a computed 30.92 px gap and 30.907 px measured separation. At the most dangerous short-height boundary, 1088×400 remains single-column, while 1089×400 becomes dual-column with 43.547 px of measured media-to-copy separation. The minimum separation in the complete sweep is 22.39 px.

Three final browser-content-only WebP screenshots total 131,264 B. Their paths, sizes and hashes are recorded in the geometry report and baseline. They are evidence assets, not product media, and are not copied to `dist`.

## Network, interaction and accessibility evidence

The cold Work Cells detail route requested exactly three JSON files and one hero image. Closed station and manga disclosures mounted no media. It requested no audio, other topic detail, Carmela detail, old draft manifest, page map or unrelated origin.

Station illustration and manga, question answers and manga, grouped arrow navigation, Escape/close cleanup, focus restoration, same-topic route reuse, back/forward and injected-failure retry all passed. A corrected fresh direct-section test confirmed focus on `#science-station-title`, one scoped rail link with `aria-current="location"`, a current-page breadcrumb and the route announcement.

Carmela retained 12 series entries, Book 1 and Book 11 content, on-demand mounting, lightbox focus restoration and user-triggered audio. The media request and explicit byte-range probe returned 206.

Keyboard-only skip-link use, route focus, direct section focus, forced colors, reduced motion, WCAG text spacing at desktop/mobile, 200% CSS-viewport-equivalent reflow, short landscape and A4 print all passed without unexpected console, page or request failures. The temporary print PDF was deleted.

## Verification discipline

Targeted work preceded the final gate:

- R1 static contract: 4/4 PASS;
- initial affected closure: 116/117, with the only failure an obsolete P4B literal for the intentionally changed short-landscape rule;
- corrected P4B + R1 affected files: 19/19 PASS;
- tightened CSS helper rerun: 19/19 PASS;
- focused P2/P4B/R1/router/build/validator/release closure: 107/107 PASS;
- runtime staleness: 31 files / 393,121 B, PASS.

The obsolete assertion was updated to the real `min-width: 68.0625rem and max-height: 480px` contract. No coverage, assertion intent, threshold or product boundary was removed or weakened. The final full release gate is invoked once only after the browser, network, runtime, source and targeted checks pass.

```text
FINAL_RELEASE_GATE_COMMAND: npm run verify:release
FINAL_RELEASE_GATE_INVOCATIONS: 1
FINAL_TEST_COUNT: 137/137
```

## Code, dependency and dist budgets

Windows checkout line endings make the old raw baseline unsuitable as a content-growth delta by itself, so both literal filesystem bytes and stable Git blob bytes are recorded.

| Metric | Current evidence | Gate | Status |
|---|---:|---:|---|
| JavaScript filesystem raw | 105,024 B | no R1 behavior growth | PASS |
| JavaScript canonical blob | 102,158 → 102,158 B | delta 0 | PASS |
| CSS filesystem raw | 69,991 B | warning 72 KiB; hard 80 KiB | PASS |
| CSS canonical blob | 66,107 → 66,852 B | +745 B | PASS |
| Runtime JSON | 393,121 B | byte-identical | PASS |
| Runtime dependencies | 0 | 0 | PASS |
| New product media | 0 | 0 | PASS |
| Dist | 1,565 files / 835,935,148 B; +867 B | delta at most 1 MiB | PASS |

The 37 B JavaScript raw difference from the historical 104,987 B release artifact is EOL-only; canonical JavaScript content is unchanged. CSS remains below the warning threshold even in literal Windows filesystem bytes.

## Runtime, source, privacy and evidence integrity

```text
RUNTIME_MANIFEST_SHA256: 4fda8a75bc8118ff0fec2d7ac04f73d832f082522cab78a4d248de5bf5e06c50
RUNTIME_INDEX_SHA256: c53654343e6fb4128a4a77aecef5055146146d0ea78430cc7a49a8da7d996742
WORK_CELLS_INDEX_SHA256: 2b30e2d7ee8099ac6b7adcfbbf0485d790a4b5042c741fe25c89d94e9b3ffa4e
PROTECTED_FILES: 1,278
PROTECTED_BYTES: 7,882,956,334
PROTECTED_SIGNATURE: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
SOURCE_PRIVATE_STATUS: ABSENT_UNCHANGED
PRODUCT_MEDIA_DIFFS: 0
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
```

Two pre-existing FR-P4B inventory files declare 27 topics but contain 26 rows and omit order 16 `hemorrhagic-shock`. R1 does not mutate those historical artifacts or expand into a content-audit phase. They are not used as R1 topic truth. The canonical runtime index contains 27 unique topics, includes `hemorrhagic-shock`, has 27 existing detail files, and all 54 topic endpoint browser cases passed.

```text
LEGACY_FR_P4B_INVENTORY_STATUS: DOCUMENTED_PRE_EXISTING_EVIDENCE_DEFECT_26_OF_27
LEGACY_FR_P4B_INVENTORY_RUNTIME_IMPACT: NONE
LEGACY_FR_P4B_INVENTORY_R1_IMPACT: NONE
```

## Final reflection

| # | Question | Answer |
|---:|---|---|
| 1 | Is the screenshot collision fixed on the real route and size? | YES |
| 2 | Was acceptance continuous rather than fixed-point only? | YES |
| 3 | Were zoom/equivalent scales covered? | YES, 80%–200% |
| 4 | Were CSS viewport, DPR and screenshot pixels kept distinct? | YES |
| 5 | Does the media box stay inside the hero? | YES, 545/545 |
| 6 | Is there positive media/copy separation in dual mode? | YES |
| 7 | Is there positive vertical separation in single mode? | YES |
| 8 | Was overflow or z-index used to disguise the collision? | NO |
| 9 | Were long title, summary, focus and tags preserved? | YES |
| 10 | Did short landscape regress? | NO |
| 11 | Did the Work Cells series regress? | NO |
| 12 | Did media, answers or lightbox behavior regress? | NO |
| 13 | Did Carmela or audio regress? | NO |
| 14 | Was runtime or product media modified? | NO |
| 15 | Was FR-P5 started? | NO |
| 16 | Are raw browser artifacts retained? | NO |
| 17 | Was the complete suite repeated? | NO; one final invocation only |
| 18 | Quality compromises? | 0 |

## Artifact index

| Artifact | Purpose |
|---|---|
| `docs/portfolio/fr-p4b-r1/FR-P4B-R1-responsive-layout-repair.md` | repair design and local acceptance contract |
| `docs/portfolio/fr-p4b-r1/FR-P4B-R1-browser-geometry-report.md` | browser geometry, network, interaction and mode evidence |
| `docs/portfolio/fr-p4b-r1/FR-P4B-R1-final-report.md` | phase acceptance and release boundary |
| `reports/portfolio/fr-p4b-r1/fr-p4b-r1-web-handoff.json` | web candidate handoff |
| `reports/portfolio/fr-p4b-r1/fr-p4b-r1-geometry-baseline.json` | 545 compact geometry measurements |
| `reports/portfolio/fr-p4b-r1/fr-p4b-r1-run-manifest.json` | machine-readable verification and release closure |

## Tracked-report closeout state

```text
FR_P4B_R1_STATUS: LOCAL_RELEASE_ACCEPTANCE_PASS_PENDING_EXACT_SHA_PAGES
GITHUB_REPOSITORY_IDENTITY: VERIFIED_ARCHMAYS_FAMILY_READING_CODEX
BASE_MAIN_SHA: 0a4932e117632983359fef507c61aa770792f3e4
REPORTED_FOOD_POISONING_ROUTE: #/science/work-cells/food-poisoning
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
WORK_CELLS_DETAIL_JSON_REQUESTS: 3
INITIAL_SCIENCE_HERO_REQUESTS: 1
INITIAL_STATION_MEDIA_REQUESTS: 0
INITIAL_MANGA_MEDIA_REQUESTS: 0
CARMELA_P3B_NON_REGRESSION: PASS
RUNTIME_STALENESS_CHECK: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
TEST_STATUS: PASS
FINAL_TEST_COUNT: 137/137
BUILD_STATUS: PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PASS
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
WORKSPACE_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P5A Responsive Media Pipeline
```
