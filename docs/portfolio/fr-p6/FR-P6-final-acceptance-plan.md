# FR-P6 final acceptance and project-seal plan

## Outcome sought

FR-P6 is the final independent acceptance phase for the Family Reading portfolio. It adds no planned product feature. Its job is to prove that P0–P5 form one coherent current system, record the remaining environment boundaries, publish the exact final commit, and move the repository into maintenance mode.

## Scope

FR-P6 must complete all of the following in one task:

1. reconcile P0–P5 historical reports with current truth;
2. validate repository identity, Source, runtime, media, release plan and product boundaries;
3. exercise all direct Carmela and Work Cells section routes;
4. rerun responsive-image, geometry, cache, audio and representative visual acceptance;
5. probe native zoom, physical-device and external-screen-reader availability without fabricating results;
6. run the final complete release gate once after targeted acceptance passes;
7. merge and deploy the exact final SHA;
8. verify live bytes, cache semantics, 404 and all 12 audio byte-range responses;
9. retire the task branch, server and scratch data;
10. convert the tracked seal state from `PROVISIONAL` to `SEALED` and the project mode from active development to maintenance.

## Direct-route matrix

### Carmela

For each of the 12 books validate the base detail route and these sections:

- overview;
- review;
- scenes;
- questions;
- background;
- encyclopedia;
- audio;
- parents.

This produces at least 108 direct Carmela route checks, in addition to Home and the series route.

### Work Cells

For each of the 27 topics validate:

- science-overview;
- science-station;
- science-questions;
- science-parent-guidance;
- source.

This produces at least 135 direct Work Cells section checks, in addition to the series route.

Invalid route, invalid item, invalid section and one-shot retry isolation must also pass.

## Media and network closure

FR-P6 reuses but independently checks the accepted FR-P5 production tree:

- 778 source records;
- 2,735 derivatives;
- 42 owner shards plus index;
- derivative-only fallbacks;
- exact release plan;
- no original image publication;
- zero missing, stale and orphan derivatives.

The accepted 15-case srcset matrix and the 545 geometry samples must pass again. Additional representative checks must cover Carmela cover, page preview, generated explanation and lightbox, plus Work Cells series thumbnail, Hero, station, manga preview and lightbox.

All 12 audio files must return byte ranges. Book 1 and Book 11 additionally receive full play, pause, seek and route-cleanup checks.

## Evidence model

Local pre-commit evidence and live post-commit evidence must remain separate.

Tracked final files use `RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF` for:

- final main SHA;
- exact-SHA Pages verification;
- workspace and branch closeout.

The post-commit handoff resolves them with immutable GitHub and live-site evidence. No tracked report may claim its own SHA.

## Required final artifacts

Narrative:

- `docs/portfolio/fr-p6/FR-P6-final-acceptance-report.md`
- `docs/portfolio/fr-p6/FR-P6-live-pages-report.md`
- `docs/portfolio/fr-p6/FR-P6-known-limitations.md`

Machine-readable:

- `reports/portfolio/fr-p6/fr-p6-phase-ledger.json`
- `reports/portfolio/fr-p6/fr-p6-seal-state.json`
- `reports/portfolio/fr-p6/fr-p6-content-route-baseline.json`
- `reports/portfolio/fr-p6/fr-p6-media-network-baseline.json`
- `reports/portfolio/fr-p6/fr-p6-live-pages-baseline.json`
- `reports/portfolio/fr-p6/fr-p6-run-manifest.json`

## Seal transition

Before the single final full gate, update the tracked state to:

```text
sealState: SEALED
portfolioStatus: SEALED
projectMode: MAINTENANCE
lastCompletedPhase: FR-P6
nextRecommendedPhase: NONE
finalMainSha: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
pagesStatus: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
workspaceStatus: RESOLVED_POST_COMMIT_IN_FINAL_HANDOFF
qualityCompromises: 0
```

Update the FR-P6 ledger entry to `COMPLETE` or `COMPLETE_WITH_DOCUMENTED_LIMITATIONS` and `CURRENT_FINAL_TRUTH`.

The seal validator then requires all final artifacts and current runtime/media counts before the final release gate can pass.

## Completion criteria

The portfolio may be marked SEALED only when:

- all current content and media truth validates;
- all direct routes pass;
- the 545 geometry baseline has zero failures;
- cache, shard and route budgets pass;
- all 12 audio range checks pass;
- Source and privacy boundaries pass;
- the final full gate passes once;
- exact-SHA Pages and representative live bytes pass;
- branch, server, scratch and workspace closeout pass;
- quality compromises remain zero.
