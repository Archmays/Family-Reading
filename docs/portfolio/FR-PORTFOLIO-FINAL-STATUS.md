# Family Reading portfolio status

## Current status

```text
PORTFOLIO_STATUS: FR_P6_IN_PROGRESS
PROJECT_MODE: ACTIVE_DEVELOPMENT
LAST_COMPLETED_PHASE: FR-P5
CURRENT_MAIN_BASE: f55859186f69e98a1cae689f77d7162f1bf565e0
NEXT_RECOMMENDED_PHASE: FR-P6 Final Acceptance and Project Seal
```

This file is a provisional final-status surface. It must not be changed to `SEALED` until the local FR-P6 final artifacts exist, the portfolio seal validator passes in final mode, the complete release gate passes once, and the post-commit exact-SHA Pages handoff succeeds.

## Product identity

Family Reading is a static companion beside physical books. It provides:

- 12 `不一样的卡梅拉` companion books with user-triggered audio;
- 27 `工作细胞` science topics;
- story review, questions, background, encyclopedia, science stations and parent guidance;
- on-demand responsive media and grouped lightboxes;
- A4 companion printing.

It is not:

- an ebook reader;
- a reading-progress or check-in product;
- a score, ranking or badge product;
- an account, login or administration system;
- a child-facing OCR full-text reader.

## Canonical locations

```text
REPOSITORY: Archmays/Family-Reading-Codex
REPOSITORY_ID: 1271691196
PAGES: https://archmays.github.io/Family-Reading-Codex/
DEFAULT_BRANCH: main
VISIBILITY: public
```

The former repository name `Archmays/Family-Reading` is historical only.

## Current technical truth

```text
CARMELA_BOOKS: 12
CARMELA_AUDIO: 12
WORK_CELLS_TOPICS: 27
WORK_CELLS_CATEGORIES: 24
WORK_CELLS_STATIONS: 108
WORK_CELLS_QUESTIONS: 162
WORK_CELLS_PAGE_REFS: 286
RUNTIME_FILES: 31
RUNTIME_BYTES: 393121
MEDIA_SOURCES: 778
MEDIA_VARIANTS: 2735
MEDIA_DERIVATIVE_BYTES: 612770984
FR_P5_DIST_FILES: 2857
FR_P5_DIST_BYTES: 706989895
```

The machine validator derives current content and media counts from runtime and media artifacts rather than trusting an old inventory summary.

## Current limitations to probe in FR-P6

- native browser zoom;
- physical iOS and Android sessions;
- external screen reader;
- Lighthouse temporary-directory cleanup on Windows;
- CDN observation beyond one POP;
- platform-controlled cache and MP3 MIME headers.

Unavailable environments must remain documented limitations, not fabricated passes.

## Seal conditions

After FR-P6 acceptance this document must state:

```text
PORTFOLIO_STATUS: SEALED
PROJECT_MODE: MAINTENANCE
LAST_COMPLETED_PHASE: FR-P6
NEXT_RECOMMENDED_PHASE: NONE
```

The exact final main SHA and Pages deployment cannot be self-recorded by the commit that creates them. They are resolved by the post-commit final handoff.
