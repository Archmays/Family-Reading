# FR-P4B final report

## Outcome

FR-P4B directly integrates the Work Cells Science Topic Atlas into the canonical application renderer, completes content/media/browser/accessibility acceptance for all 27 topics, and renames the existing public GitHub repository in place from `Archmays/Family-Reading` to `Archmays/Family-Reading-Codex`.

The implementation remains a static paper-book companion. It adds no ebook body, reading tracking, check-in, score, account, Work Cells audio, backend or runtime dependency. FR-P5 responsive-media processing is not included.

The exact final commit, GitHub Actions run, Pages deployment and final task-owned scratch cleanup are resolved after this tracked report is committed; those values belong in the final handoff rather than in a self-referential commit.

## Acceptance summary

| Area | Evidence | Status |
|---|---|---|
| Direct integration | `app.js` imports the pure view model/renderer; no fetch or `innerHTML` interception, auto-install side effect or temporary parent jump remains | PASS |
| Canonical routes | overview, station, questions, parent guidance and source support direct load, reload, history, focus, title, announcement and one `aria-current` | PASS |
| Content parity | 27 topics, 24 categories, 108 stations, 162 questions, 286 page refs and 400 existing images | PASS |
| Media lifecycle | one initial hero; station/manga media remain unmounted until disclosure; group-scoped lightbox and cleanup pass | PASS |
| Questions | four canonical groups; answers and parent hints closed by default; print exposes both; no scoring | PASS |
| Browser matrix | 54 topic/mobile-desktop cases plus 54 deep-topic/viewport cases | PASS |
| Network | Work Cells detail 3 JSON; unrelated 0; old manifest 0; page map 0; initial station/manga/audio 0 | PASS |
| Accessibility/print | keyboard, skip link, focus, headings, 44 px controls, forced colors, reduced motion, text spacing, reflow, short landscape and print contract | PASS |
| Carmela | series/detail requests, on-demand media, lightbox and audio behavior remain compatible | PASS |
| Runtime | 31 files / 393,121 B; runtime manifest and Work Cells projection unchanged and current | PASS |
| Source/privacy/rights | protected roots identical; public validator clean; user authorization applies | PASS |
| Repository rename | same repository id 1271691196, public visibility and `main`; canonical local `origin` updated | PASS |
| Final release gate | exactly one post-rename `npm run verify:release` invocation | PENDING SINGLE INVOCATION |
| Pages | new project URL must deploy and serve the exact final `main` SHA | RESOLVED POST-COMMIT |

## Direct application integration

`assets/app.js` is the only canonical route owner. It directly imports `createScienceTopicViewModel` and `renderScienceTopicAtlas`, adapts the already-loaded topic object, and renders the atlas without another fetch. The previous generic science renderer and its dead styles were removed.

`assets/science-companion.js` is now a pure module. It does not capture fetch, wrap `Response`, intercept element setters, install itself into the browser, or own a competing router. Its five navigation links use the canonical hash routes, including:

```text
#/science/work-cells/<slug>/science-parent-guidance
```

Shared disclosure, answer and lightbox lifecycle wiring remains owned by the application. This leaves one route truth, one lightbox lifecycle and one answer lifecycle.

## Content and media parity

| Metric | Accepted value | Result |
|---|---:|---|
| Topics | 27 | 27 |
| Categories | 24 | 24 |
| Stations | 108 | 108 |
| Questions | 162 | 162 |
| Page references | 286 | 286 |
| Existing unique runtime images | 400 | 400 |
| Topic-local media groups | 378 | 378 |
| Media group use sites | 642 | 642 |
| Work Cells audio | false | false |

`癌细胞` and `癌细胞Ⅱ` remain separate topics. `出血性休克` retains its current identity. No authoring, prompt, internal, rights-review or individualized medical-advice fields are child-facing, and no draft/verification state was promoted.

Closed station and manga groups contain templates rather than active image elements. Opening a group mounts only that exact group; reopening does not duplicate media. The lightbox remains within the selected group and releases source, body lock and focus state on Escape, close and route change.

## Browser, network and accessibility evidence

The browser run covered:

- all 27 topics at 390×844 and 1280×720: 54/54;
- six depth topics across nine viewports from 390×844 through 1440×900 and short landscape: 54/54;
- six fresh cold contexts;
- direct/reload/back/forward checks for all five sections;
- mobile navigation, keyboard-only use, skip link, disclosure labels and focus retention;
- station illustration, station manga and question manga mount/reopen behavior;
- group arrows, captions, Escape, route cleanup and focus restoration;
- injected detail failure and successful retry;
- reduced motion, forced colors, text spacing, reflow and print.

Across the accepted cases there were zero unexpected console errors, required-request failures, broken images, overflow, clipped headings, overlapping controls, sub-44 px visible controls, duplicate ids, nested interactive controls, focus loss or stale routes.

Cold Work Cells topic acceptance was exactly 3 JSON requests, 1 hero image, 0 station illustrations, 0 manga pages, 0 lightbox-idle images, 0 audio, 0 other-topic details, 0 Carmela details, 0 old manifest requests, 0 page-map requests and 0 unrelated domains. Five same-topic sections reused the original three JSON responses.

Print exposed the topic title, category, source, overview, four station texts and parent notes, six questions, every answer and parent hint, parent/sensitive guidance and source notes. Navigation, controls, media and lightbox were hidden, and print mounted no media.

Physical iOS/Android devices and an external screen-reader session were unavailable. Their absence is not reported as a pass. The bounded substitute evidence is the nine-viewport Chromium reflow matrix plus semantic, focus, keyboard and accessible-name checks.

## Verification discipline

Targeted work preceded the final gate:

- focused P4B suite: 15/15;
- combined affected closure: 108/110, with two stale P4B JavaScript-budget expectations identified;
- corrected budget expectation closure: 20/20;
- affected P2/P3/P4 closure after direct integration: 82/82;
- the same 82/82 closure after dead-style removal: 82/82;
- runtime staleness: 31 files / 393,121 B, PASS;
- public current-tree validator: zero findings.

No assertion, threshold or product boundary was weakened. The two initial failures were obsolete byte-budget expectations after the intended module addition, and only the affected closure was rerun. The single full release invocation is recorded after it runs; it is not repeated for reporting.

## Code and performance budgets

| Metric | P4B result | Gate | Status |
|---|---:|---:|---|
| JavaScript raw | 104,987 B | hard 155 KiB | PASS |
| CSS raw | 69,166 B | hard 80 KiB | PASS |
| Runtime JSON | 393,121 B | unchanged | PASS |
| New JavaScript modules | 1 | at most 1 | PASS |
| Runtime dependencies | 0 | 0 | PASS |
| Initial Work Cells hero | 1 | exactly 1 | PASS |
| Initial station media | 0 | exactly 0 | PASS |
| Initial manga media | 0 | exactly 0 | PASS |
| Work Cells detail JSON | 3 | exactly 3 | PASS |
| Dist | resolved by final release gate | delta at most 5 MiB | PENDING SINGLE INVOCATION |

No WebP/AVIF generation, `srcset` pipeline, media re-encoding or Pages artifact optimization was started.

## Repository rename and release boundary

The authenticated GitHub operation renamed the existing repository in place. Before and after checks agree on repository id `1271691196`, public visibility, default branch `main`, permissions and branch commit identities. No replacement repository, transfer, archive, history rewrite or force-push was used.

The canonical local remote is:

```text
https://github.com/Archmays/Family-Reading-Codex.git
```

The tracked-tree scan found zero current active old-name references. Historical evidence, explicit transition context, scan literals and validator fixtures remain intact. No external Action consumer references the old repository name.

The release target is only:

```text
https://archmays.github.io/Family-Reading-Codex/
```

The final handoff resolves the exact final `main` SHA, its successful Actions/Pages run, live new-URL smoke, branch deletion and workspace cleanup. The old Pages path is not acceptance evidence.

## Source, privacy and rights

The protected-root compact signature is unchanged:

```text
FILES: 1,278
BYTES: 7,882,956,334
SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
```

No protected source file was deleted, moved, renamed, compressed, overwritten or re-encoded. The public repository validator found no secret, private path or task-scratch exposure. No raw HAR, browser profile, cookie or token is retained.

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
```

## Adversarial reflection

| # | Question | Result |
|---:|---|---|
| 1 | Direct integration instead of a long-lived monkey patch? | YES |
| 2 | Parent-guidance direct route supported? | YES |
| 3 | Two simultaneous `aria-current` links? | NO |
| 4 | Any of 27 topics lost? | NO |
| 5 | Any of 108 stations lost? | NO |
| 6 | Any of 162 questions lost? | NO |
| 7 | Any of 286 page refs or 400 images lost? | NO |
| 8 | `癌细胞` and `癌细胞Ⅱ` merged? | NO |
| 9 | `出血性休克` identity changed? | NO |
| 10 | Draft or verification state promoted? | NO |
| 11 | Work Cells audio added? | NO |
| 12 | Medical facts rewritten or individualized advice added? | NO |
| 13 | Internal, prompt or rights-review fields displayed? | NO |
| 14 | Initial station/manga requests remain 0/0? | YES |
| 15 | On-demand media is template mounting, not lazy-only? | YES |
| 16 | Lightbox crosses media groups? | NO |
| 17 | Answers open by default? | NO |
| 18 | Score, progress or check-in added? | NO |
| 19 | Work Cells detail remains three JSON requests? | YES |
| 20 | Old manifest or page map requested? | NO |
| 21 | Carmela P3B behavior regressed? | NO |
| 22 | Source or protected roots touched? | NO |
| 23 | Copyright review restarted? | NO |
| 24 | P5 work started? | NO |
| 25 | Existing repository renamed in place with same id? | YES |
| 26 | Local `origin` updated? | YES |
| 27 | Current active old-name references equal zero? | YES |
| 28 | Historical evidence rewritten as current truth? | NO |
| 29 | New Pages exact-SHA verified? | RESOLVED POST-COMMIT |
| 30 | Final full suite repeated? | NO |
| 31 | Workspace clean? | RESOLVED POST-COMMIT |
| 32 | Quality compromises? | 0 |

## Mandatory artifact index

| Artifact | Purpose |
|---|---|
| `docs/portfolio/fr-p4b/FR-P4B-content-and-media-parity-report.md` | exact topic, question and media parity |
| `docs/portfolio/fr-p4b/FR-P4B-browser-network-accessibility-report.md` | browser, request, accessibility and print evidence |
| `docs/portfolio/fr-p4b/FR-P4B-final-report.md` | phase acceptance and closeout boundary |
| `reports/portfolio/fr-p4b/fr-p4b-run-manifest.json` | machine-readable run and release closure |
| `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-before.json` | pre-integration content inventory |
| `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-after.json` | post-integration content inventory |
| `reports/portfolio/fr-p4b/fr-p4b-media-reference-baseline.json` | media registry, group and use-site evidence |
| `reports/portfolio/fr-p4b/fr-p4b-route-network-baseline.json` | request and route evidence |
| `reports/portfolio/fr-p4b/fr-p4b-ui-baseline.json` | responsive and visual acceptance evidence |

Three final WebP screenshots are retained under `docs/portfolio/fr-p4b/screenshots/`; they are evidence supplements and are not copied to `dist`.

The earlier `FR-P4B-science-topic-design-and-ia.md`, `FR-P4B-repository-rename-impact.md` and `fr-p4b-web-handoff.json` remain as design, transition and web-checkpoint records. They are intentionally not counted among the nine mandatory final acceptance artifacts.

## Tracked-report closeout state

```text
REPOSITORY_RENAME_STATUS: COMPLETE
REPOSITORY_NAME_BEFORE: Archmays/Family-Reading
REPOSITORY_NAME_AFTER: Archmays/Family-Reading-Codex
REPOSITORY_ID_UNCHANGED: VERIFIED
LOCAL_ORIGIN_STATUS: UPDATED
OLD_NAME_CURRENT_REFERENCES: 0
HISTORICAL_REFERENCES: PRESERVED_WITH_CONTEXT
NEW_PAGES_URL_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FR_PORTFOLIO_P4B_STATUS: LOCAL_ACCEPTANCE_PASS_PENDING_SINGLE_RELEASE_GATE_AND_EXACT_SHA_PAGES
GITHUB_REPOSITORY_IDENTITY: VERIFIED_ARCHMAYS_FAMILY_READING_CODEX
GITHUB_VISIBILITY: PUBLIC_UNCHANGED
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
RUNTIME_STALENESS_CHECK: PASS
RUNTIME_MANIFEST_STATUS: UNCHANGED_AND_VERIFIED
WORK_CELLS_TOPIC_COUNT: 27/27
WORK_CELLS_CATEGORY_COUNT: 24/24
WORK_CELLS_STATION_COUNT: 108/108
WORK_CELLS_QUESTION_COUNT: 162/162
WORK_CELLS_PAGE_REF_COUNT: 286/286
WORK_CELLS_IMAGE_STATUS: 400/400
WORK_CELLS_CONTENT_PARITY: PASS
WORK_CELLS_SCIENCE_IA_STATUS: PASS
WORK_CELLS_HERO_STATUS: PASS
WORK_CELLS_ROUTE_NAV_STATUS: PASS
WORK_CELLS_STATION_EXPERIENCE: PASS
WORK_CELLS_QUESTION_EXPERIENCE: PASS
WORK_CELLS_PARENT_GUIDANCE: PASS
WORK_CELLS_SOURCE_SECTION: PASS
WORK_CELLS_AUDIO_STATUS: NOT_PRESENT_AS_REQUIRED
SCIENCE_MEDIA_REGISTRY_STATUS: PASS
SCIENCE_MEDIA_GROUP_DEDUP_STATUS: PASS
SCIENCE_ON_DEMAND_MEDIA_STATUS: PASS
INITIAL_SCIENCE_HERO_REQUESTS: 1
INITIAL_STATION_MEDIA_REQUESTS: 0
INITIAL_MANGA_MEDIA_REQUESTS: 0
SCIENCE_LIGHTBOX_GROUP_STATUS: PASS
SCIENCE_LIGHTBOX_CLEANUP_STATUS: PASS
SCIENCE_ANSWER_DISCLOSURE_STATUS: PASS
ACCESSIBILITY_STATUS: PASS
RESPONSIVE_STATUS: PASS
SHORT_LANDSCAPE_STATUS: PASS
FORCED_COLORS_STATUS: PASS
REDUCED_MOTION_STATUS: PASS
PRINT_STATUS: PASS
WORK_CELLS_DETAIL_JSON_REQUESTS: 3
UNRELATED_DOMAIN_REQUESTS: 0
OLD_WORK_CELLS_MANIFEST_REQUESTS: 0
PAGE_MAP_REQUESTS: 0
CARMELA_P3B_NON_REGRESSION: PASS
PERFORMANCE_STATUS: PASS
TEST_STATUS: PENDING_SINGLE_FINAL_RELEASE_INVOCATION
FINAL_TEST_COUNT: PENDING_SINGLE_FINAL_RELEASE_INVOCATION
BUILD_STATUS: PENDING_SINGLE_FINAL_RELEASE_INVOCATION
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PENDING_SINGLE_FINAL_RELEASE_INVOCATION
PAGES_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
FINAL_MAIN_SHA: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
WORKSPACE_STATUS: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P5A Responsive Media Pipeline
```
