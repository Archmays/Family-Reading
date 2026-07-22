# FR-P4A final report

## Outcome

FR-P4A delivers deterministic tracked runtime content, a fail-closed publish boundary, and route-scoped loading for the existing Family Reading UI. Local generator, parity, loader, browser, media, source/privacy and build evidence passes. The exact final commit, Pages run and live deployment are resolved after this tracked report is committed.

No FR-P4B topic-page redesign or FR-P5 media work is included.

## Acceptance summary

| Area | Evidence | Status |
|---|---|---|
| Repository | `Archmays/Family-Reading`, repository id 1271691196, public visibility unchanged | PASS |
| Rights/privacy/source | user authorization; public validator; protected 1,278 files / 7,882,956,334 bytes / identical signature | PASS |
| Runtime generator | stable JSON, staged swap/restore, safe output boundary, stale/missing/extra checks | PASS |
| Runtime parity | 12 books, 27 topics, 24 categories, 108 stations, 162 questions, 286 page refs | PASS |
| Runtime exposure | 0 authoring-only keys; 400/400 unique Work Cells images exist | PASS |
| Route requests | home 1, series 2, Carmela detail 4, Work Cells detail 3; unrelated 0 | PASS |
| Cache/race/errors | coalescing, abort, stale-response guard, isolation, retry and back/forward reuse | PASS |
| Current UI | P2/P3A/P3B and current Work Cells render compatibility | PASS |
| Media/audio | closed media 0, group disclosure/lightbox, audio intent and 206 | PASS |
| Build/dist | runtime hashes match; draft manifest/page map absent; dist -2,153,380 B | PASS |
| Actions warning | five affected stable Node-24 action lines selected from official evidence | PENDING EXACT-RUN PROOF |
| Tests/release | one local full invocation: 116/117; affected README assertion 1/1; effective 117/117; Node 22 build closure | PASS AFTER AFFECTED RERUN |
| Pages | exact-SHA run and live request smoke follow the report commit | PENDING POST-COMMIT |

## Development and verification discipline

Focused generator and loader suites passed 13/13 and 14/14. The first combined affected closure passed 90/94; four failures were legacy expectations for module count/cache-buster/error copy and the former Work Cells content-version expression. Only those expectations/wiring were corrected, and the four-test affected closure passed 4/4. Browser checks then covered ten cold route cases, two warm journeys, delayed-response race protection, isolated failure/retry, media/audio and alternate modes. No gate or assertion was weakened.

Exactly one final local `npm run verify:release` invocation was executed. It reached 116/117 tests; the sole failure was the README's missing retained OCR-publishing exclusion after its P4A build-description edit. The sentence was restored, the one named assertion passed 1/1 under Node 22, and only the not-yet-run Node 22 build closure followed. That closure passed the public validator (2,824 tracked files, 139 scanned text files, zero findings), runtime staleness check, static build and dist audit. The full suite was not repeated.

## Runtime and performance

| Metric | Value | Gate | Status |
|---|---:|---:|---|
| Runtime files / bytes | 31 / 393,121 B | total at most 2 MiB | PASS |
| Home index | 1,187 B | at most 20 KiB | PASS |
| Carmela index | 5,706 B | at most 50 KiB | PASS |
| Work Cells index | 14,727 B | at most 100 KiB | PASS |
| Topic detail total | 359,247 B | at most 1.75 MiB | PASS |
| Largest topic detail | 19,882 B | at most 150 KiB | PASS |
| JavaScript | 100,696 B | preferred at most 120 KiB | PASS |
| CSS | 60,166 B | no material data-phase growth | PASS |
| Runtime dependencies | 0 | 0 | PASS |
| Dist | 835,920,908 B | explain and preserve content | PASS; -2,153,380 B |

## GitHub Actions warning disposition

P3B run `29803791008` named checkout v4, setup-node v4, configure-pages v5, nested upload-artifact v4 and deploy-pages v4 in Node 20 deprecation annotations. Each affected direct action was moved to a stable Node-24 line, while the application remains on Node 22. Upload Pages artifact required v5 because v4 still nested the Node-20 upload-artifact line. Exact-run warning absence is a release acceptance condition, not assumed from YAML alone.

## Final reflection

| # | Question | Result |
|---:|---|---|
| 1 | Any Carmela detail lost? | NO; selected details remain 12/12 |
| 2 | Any Work Cells topic lost? | NO; 27/27 |
| 3 | Any station/question/guidance/page ref lost? | NO; exact projection counts pass |
| 4 | Cancer topics merged? | NO |
| 5 | Draft/verification state upgraded? | NO |
| 6 | Work Cells audio added? | NO |
| 7 | Draft manifest merely split without projection? | NO; 3,543 authoring-only occurrences are excluded |
| 8 | Runtime prompt/internal/private fields remain? | NO |
| 9 | All page refs resolve? | YES |
| 10 | Output deterministic and current? | YES |
| 11 | Build publishes draft manifest/page map? | NO |
| 12 | Home requests one JSON? | YES |
| 13 | Carmela detail loads the other 11 details? | NO |
| 14 | Work Cells topic loads the other 26 details? | NO |
| 15 | Stale route render observed? | NO |
| 16 | Unrelated domain failure blocks current domain? | NO |
| 17 | P3B media/audio broken? | NO |
| 18 | Work Cells UI redesigned? | NO |
| 19 | Media conversion/P5 started? | NO |
| 20 | Rights review restarted? | NO |
| 21 | Source touched? | NO |
| 22 | Runtime dependency/framework added? | NO |
| 23 | Raw HAR/profile/token saved? | NO |
| 24 | Actions blindly upgraded? | NO; official release/runtime evidence recorded |
| 25 | Final full test repeated? | NO; one invocation, then only the affected 1-test and downstream build closure |
| 26 | Main/remote/Pages same SHA? | RESOLVED POST-COMMIT |
| 27 | Workspace clean? | RESOLVED POST-COMMIT |
| 28 | Quality compromises? | 0 |

## Artifact index

| Artifact | Purpose |
|---|---|
| `FR-P4A-runtime-data-architecture.md` | truth/runtime schema, generator, build, loader and action contracts |
| `FR-P4A-content-parity-report.md` | authoring inventory, projection parity and protected-root proof |
| `FR-P4A-route-network-report.md` | cold/warm route, failure/race, UI and performance evidence |
| `FR-P4A-final-report.md` | phase acceptance and closeout index |
| `reports/portfolio/fr-p4a/fr-p4a-run-manifest.json` | machine-readable run and release closure |
| `reports/portfolio/fr-p4a/fr-p4a-authoring-field-inventory.json` | aggregate authoring/denylist inventory without raw source copy |
| `reports/portfolio/fr-p4a/fr-p4a-runtime-parity.json` | exact content/reference parity |
| `reports/portfolio/fr-p4a/fr-p4a-route-network-baseline.json` | compact request/browser evidence |
| `reports/portfolio/fr-p4a/fr-p4a-runtime-size-budget.json` | runtime/code/dist byte budgets |

## Tracked-report closeout state

```text
FR_PORTFOLIO_P4A_STATUS: LOCAL_ACCEPTANCE_PASS_PENDING_POST_COMMIT_PAGES
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
RUNTIME_GENERATOR_STATUS: PASS
RUNTIME_CONTENT_PARITY: PASS
RUNTIME_AUTHORING_FIELD_EXPOSURE: NONE
ROUTE_REQUEST_CONTRACTS: PASS
TEST_STATUS: PASS_AFTER_AFFECTED_RERUN
FINAL_TEST_COUNT: 117/117
BUILD_STATUS: PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PASS
ACTIONS_NODE_RUNTIME_WARNING: RESOLVED_AFTER_EXACT_RUN
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_TASK: FR-P4B Work Cells Topic Experience and Route-Scoped Interaction
```
