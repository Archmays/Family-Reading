# FR-P3B final report

## Outcome

FR-P3B preserves all 12 Carmela companion records while making book-page media, generated explanations and audio genuinely user initiated. The implementation now has one deterministic per-book media registry, semantic disclosure groups, inert closed-state templates, group-scoped lightbox navigation and a seven-phase audio lifecycle. Local content, browser, accessibility, print, network, source-integrity and release gates pass; the only values a tracked report cannot contain are the SHA of its own commit and the exact-SHA Pages run that follows it.

No FR-P4 or FR-P5 implementation is included.

## Scope delivered

| Changed | Preserved |
|---|---|
| 366 unique registry entries and 333 semantic groups | 12/12 book records and 988 original media use sites |
| Disclosure-triggered thumbnail mounting | P3A companion-page information architecture and content order |
| Group-scoped dynamic lightbox | P2 focus trap, inert background, Escape and scroll restoration |
| User-triggered audio source, phases, seek and retry | Native controls, static Pages model and zero runtime dependencies |
| Focused tests and browser/network evidence | Source files, public media bytes, Work Cells data and publishing workflow |

## Acceptance gates

| Area | Evidence | Status |
|---|---|---|
| Repository | `Archmays/Family-Reading`, repository id 1271691196, public visibility unchanged | PASS |
| Rights and privacy | user authorization honored; public validator has zero findings | `PASS_BY_USER_AUTHORIZATION`; PASS |
| Protected roots | 1,278 files / 7,882,956,334 bytes / identical compact signature | PASS |
| Product boundary | paper-book companion only; no reading state, check-in, ranking, account or ebook flow | PASS |
| Content and media | 12/12; 297 page paths + 69 explanation paths; 988/988 use sites | PASS |
| Registry and groups | deterministic ids; canonical paths; 366 unique entries; 333 ordered groups | PASS |
| On-demand media | closed active tree 0 images/openers; first open exact group; reopen 0 transfer | PASS |
| Lightbox | current group only; no idle source; close clears active state; focus fallback retained | PASS |
| Audio | initial MP3 0; seven phases; custom/native intent; 206 Range; retry; teardown | PASS |
| Accessibility | keyboard, focus, live status, reduced motion and forced colors | PASS |
| Responsive | all six requested sizes for Book 1/11; remaining ten at mobile/desktop ends | PASS |
| Print | Book 11, 11 A4 pages; text and 9/9 answers retained; media requests unchanged | PASS |
| Performance | DOM -24.82% / -32.05%; startup, code and dist budgets below gates | PASS |
| Tests/release | targeted checks pass; one local final release invocation, 90/90 | PASS |
| Pages | exact final SHA workflow and live cold interaction smoke run after the report commit | PENDING POST-COMMIT |

## Tests and release verification

| Stage | Command or method | Result |
|---|---|---|
| New registry/lifecycle tests | `node --test tests/fr-p3b-carmela-media.test.mjs` | 7/7 PASS |
| Legacy doc expectation correction | affected MVP file only | 40/40 PASS |
| P2 shared-shell compatibility | `node --test tests/fr-p2-ui.test.mjs` | 11/11 PASS |
| Final P3A + P3B wiring | two affected files | 16/16 PASS |
| Browser interaction matrix | four representative + 20 remaining-book + eight extra viewport cases | PASS |
| Single local full gate | `npx --yes node@22 scripts/verify-release.mjs` | 90/90 tests PASS; build stopped at the public validator; one invocation |
| Public repository validator | initial full-gate finding, then affected rerun | test-only Windows absolute-path fixture rewritten without a tracked literal; PASS; 0 findings |
| Static build and dist audit | affected dependency-closure rerun only | PASS |

During development, one legacy assertion still expected `preload="metadata"`; the documentation and affected assertion were updated to the P3B `preload="none"` contract and only that dependency closure was rerun. The single local final full-gate invocation then passed all 90 tests before the public validator correctly rejected a Windows absolute-path literal in the unsafe-path test fixture. The fixture now constructs the same input dynamically, so rejection coverage remains intact. Only the affected seven-test file and the validator/build/dist-audit closure were rerun; the full suite was not repeated. No threshold, assertion or coverage was removed.

## Media and request result

| Metric | P3A | FR-P3B | Result |
|---|---:|---:|---|
| Registered book-local media | raw references in content items | 366 unique registry entries | PASS |
| Use sites | 988 | 988 | PASS |
| Repeated use sites retained | 622 | 622 | PASS |
| Semantic groups | 333 | 333 | PASS |
| Missing media paths | 0 | 0 | PASS |
| Book 1 initial active media images/openers | 85 / 85 | 0 / 0 | PASS |
| Book 11 initial active media images/openers | 115 / 115 | 0 / 0 | PASS |
| Initial MP3 requests | 1 | 0 | PASS |
| Idle lightbox placeholder requests | 1 | 0 | PASS |
| Cover requests | 1 | 1 | PASS |

Book 1 and Book 11 first-group disclosure requests were exactly 2 and 5 unique images. Closing added no request, reopening added no network event, and lightbox navigation reused those resources without leaving the group. After leaving and returning in the same context, remounting those groups produced 2/2 and 5/5 complete images with zero media network events or transfer; the only warm-return event was a separate cached favicon. A focused Book 2 browser check also verified that one shared explanation URL receives distinct current-group label and alternative text in its background and encyclopedia groups.

## Performance budgets

| Metric | P3A | FR-P3B | Gate | Result |
|---|---:|---:|---:|---|
| Raw JavaScript | 75,016 B | 89,466 B | warning 105 KiB; hard 125 KiB | PASS |
| Raw CSS | 58,877 B | 60,140 B | warning 64 KiB; hard 70 KiB | PASS |
| New JavaScript modules | - | 0 | no more than 1 | PASS |
| Runtime dependencies | 0 | 0 | 0 | PASS |
| External fonts/scripts | 0 | 0 | 0 | PASS |
| Startup JSON | 28 / 2,810,496 B | unchanged | no more than baseline +1% | PASS |
| Dist | 838,058,575 B | 838,074,288 B | delta no more than 5 MiB | PASS |
| Book 1 initial DOM | 830 | 624 (-24.82%) | reduction at least 15% | PASS |
| Book 11 initial DOM | 936 | 636 (-32.05%) | reduction at least 15% | PASS |

CSS grew by 1,263 bytes from P3A, below both the preferred +2 KiB bound and the 64 KiB warning boundary. The dist delta is 15,713 bytes. Startup data is byte-identical because no JSON input changed.

## Browser, audio and print result

The representative normal audio path observed `idle -> loading -> ready -> playing -> paused -> playing -> ended`; an induced failure entered `error`, kept retry available and recovered to `playing`. Both representative MP3 files returned 206 responses to initial and near-end ranges. Custom and keyboard seek reached finite clamped values, no autoplay or playback state was stored, and a new route started idle.

Teardown removes the authored `src` attribute, pauses and detaches the old element, calls `load()` and leaves no background playback. Chromium may retain the former selected URL in its read-only `currentSrc` diagnostic; this report does not claim that diagnostic becomes empty.

Book 1 and Book 11 passed 390x844, 768x1024, 1280x720, 1440x900, 1024x400 and 667x375. The remaining ten books passed direct-route, disclosure and audio-idle smoke at the mobile and desktop ends. Forced colors, reduced motion and the Work Cells shared shell passed. Book 11 produced 11 A4 pages; first, middle and final pages were visually inspected, media disclosures and audio were absent, and print initiated no page/generated-media requests.

## Source, authorization and privacy

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PROTECTED_ROOT_FILES: 1,278 -> 1,278
PROTECTED_ROOT_BYTES: 7,882,956,334 -> 7,882,956,334
PROTECTED_ROOT_SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae -> ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
```

The signature is SHA-256 over the compact JSON array of sorted protected-root relative paths and byte sizes. Git has no scoped diff under the protected roots, public book data, media, packages or workflows. Persistent reports contain no token, cookie, browser profile, raw HAR or local absolute path.

## Artifact index

| Artifact | Purpose |
|---|---|
| `FR-P3B-media-and-audio-design.md` | registry, disclosure, lightbox and audio contracts |
| `FR-P3B-network-performance-report.md` | cold/warm request, Range, DOM and budget evidence |
| `FR-P3B-browser-accessibility-report.md` | viewport, interaction, alternate-mode and print QA |
| `FR-P3B-final-report.md` | acceptance and closeout index |
| `reports/portfolio/fr-p3b/fr-p3b-media-reference-baseline-before.json` | P3A media and request baseline |
| `reports/portfolio/fr-p3b/fr-p3b-media-reference-baseline-after.json` | 12-book registry, group, use-site and Source parity |
| `reports/portfolio/fr-p3b/fr-p3b-route-network-baseline.json` | compact browser network evidence |
| `reports/portfolio/fr-p3b/fr-p3b-audio-range-baseline.json` | audio phases, Range, seek, retry and teardown evidence |
| `reports/portfolio/fr-p3b/fr-p3b-run-manifest.json` | commands, budgets and closure fields |
| `screenshots/` | three visually reviewed JPEG baselines |

## Final reflection

| # | Question | Result |
|---:|---|---|
| 1 | Any media reference lost? | NO; 988/988 use sites retained |
| 2 | Any resource deleted or re-encoded? | NO |
| 3 | Rights review restarted? | NO |
| 4 | Source touched? | NO |
| 5 | Closed group truly has zero active media request? | YES |
| 6 | Is this merely a lazy attribute change? | NO; closed groups have no active image nodes |
| 7 | Group de-duplication and use-site lineage both preserved? | YES |
| 8 | Lightbox still merges the whole book? | NO; current group only |
| 9 | Close removes the active lightbox source? | YES |
| 10 | Focus fallback safe? | YES |
| 11 | Initial MP3 request zero? | YES |
| 12 | Autoplay introduced? | NO |
| 13 | Playback position saved? | NO |
| 14 | Range and seek measured against real responses? | YES; 206 |
| 15 | Native audio fallback retained? | YES |
| 16 | FR-P4 or FR-P5 started? | NO |
| 17 | CSS above gate? | NO; 60,140 B |
| 18 | Startup JSON increased? | NO |
| 19 | Work Cells regressed? | NO in scoped shared-shell smoke |
| 20 | Print triggered media? | NO |
| 21 | Raw HAR or browser profile saved? | NO |
| 22 | Local final full suite repeated? | NO; exactly one invocation, followed only by one affected-test and failed-job closure rerun |
| 23 | Main, remote and Pages at one SHA? | PENDING POST-COMMIT |
| 24 | Workspace clean? | PENDING CLOSEOUT |
| 25 | Quality compromises? | 0 |

## Tracked-report closeout state

```text
FR_PORTFOLIO_P3B_STATUS: LOCAL_ACCEPTANCE_PASS_PENDING_POST_COMMIT_PAGES
FINAL_TEST_COUNT: 90/90
BUILD_STATUS: PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PASS
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P4 Science Topic and Route-Scoped Data Loading
```
