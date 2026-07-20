# FR-P3A content parity report

## Result

`CARMELA_BOOK_COUNT: 12/12`

`CARMELA_CONTENT_PARITY: PASS`

`INTERNAL_METADATA_EXPOSURE: NONE`

The before inventory was taken from the P2 main SHA `7397effccb417e7fa990490713b0f244fbb5c512`. The after inventory measures the allowlisted view model and renderer. A focused test compares normalized before/after content for every book and independently recomputes the same totals from the live JSON and view-model output.

Machine-readable evidence:

- `reports/portfolio/fr-p3a/fr-p3a-carmela-content-inventory-before.json`
- `reports/portfolio/fr-p3a/fr-p3a-carmela-content-inventory-after.json`

## Aggregate parity

| Content measure | Before | After | Result |
|---|---:|---:|---|
| Books | 12 | 12 | PASS |
| Book pages | 320 | 320 | PASS |
| Story-review beats | 78 | 78 | PASS |
| Character relationships | 64 | 64 | PASS |
| Story scenes | 73 | 73 | PASS |
| Questions | 108 | 108 | PASS |
| Background entries | 36 | 36 | PASS |
| Encyclopedia entries | 40 | 40 | PASS |
| Page-image reference occurrences | 912 | 912 | PASS |
| Book-local unique page-image references | 297 | 297 | PASS |
| Generated-image reference occurrences | 76 | 76 | PASS |
| Repeated media-reference occurrences | 622 | 622 | PASS |
| Available whole-book audio | 12 | 12 | PASS |
| Missing references | 0 | 0 | PASS |
| Empty required fields | 0 | 0 | PASS |
| Local absolute references | 0 | 0 | PASS |

Repeated references are intentional reuse of the same public book page as evidence in more than one companion item. No generated or source media was duplicated to create the new page.

## Per-book content skeleton

`Q` is the total across the three groups and is 9 for every book.

| # | Book | Pages | Beats | Relations | Scenes | Q | Background | Encyclopedia | Audio | Unique page refs |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---:|
| 1 | 我想去看海 | 26 | 5 | 5 | 6 | 9 | 3 | 4 | PASS | 23 |
| 2 | 我想有颗星星 | 27 | 5 | 5 | 6 | 9 | 3 | 4 | PASS | 23 |
| 3 | 我想有个弟弟 | 24 | 5 | 5 | 6 | 9 | 3 | 5 | PASS | 23 |
| 4 | 我去找回太阳 | 24 | 7 | 7 | 6 | 9 | 3 | 3 | PASS | 23 |
| 5 | 我爱小黑猫 | 24 | 7 | 6 | 6 | 9 | 3 | 3 | PASS | 23 |
| 6 | 我能打败怪兽 | 24 | 7 | 6 | 6 | 9 | 3 | 3 | PASS | 23 |
| 7 | 我要找到朗朗 | 24 | 7 | 5 | 6 | 9 | 3 | 3 | PASS | 23 |
| 8 | 我不要被吃掉 | 24 | 7 | 5 | 6 | 9 | 3 | 3 | PASS | 23 |
| 9 | 我好喜欢她 | 24 | 7 | 5 | 6 | 9 | 3 | 3 | PASS | 23 |
| 10 | 我要救出贝里奥 | 27 | 7 | 5 | 6 | 9 | 3 | 3 | PASS | 24 |
| 11 | 我不是胆小鬼 | 48 | 7 | 5 | 7 | 9 | 3 | 3 | PASS | 43 |
| 12 | 我爱平底锅 | 24 | 7 | 5 | 6 | 9 | 3 | 3 | PASS | 23 |

All parent-guide records retain one reading-use paragraph, four suggested-flow items and the original sensitive-point list. All section ids are present: `overview`, `review`, `scenes`, `questions`, `background`, `encyclopedia`, `audio`, `parents`.

## Metadata boundary

The source companion JSON contains authoring evidence and one source-path field per book. Those fields remain untouched in the canonical data but are not admitted to the UI view model.

| Field class | Authoring data | Child-facing model/UI |
|---|---:|---:|
| Source paths / source PDFs | Present | 0 |
| Local absolute paths | 0 | 0 |
| Prompt ids / prompt references | Present where authored | 0 |
| Review/schema/status fields | Present where authored | 0 |
| Public page and generated-image references | Present | Preserved |

The first book's parent guidance includes the ordinary sentence that the paper book should lead and machine-recognized text should not become the reading body. This is preserved family guidance, not a source path or internal authoring label.

## Protected content and source proof

No file under `source`, `data`, `data-private`, `archived`, `public/books`, `public/audio`, `public/assets/cells-at-work/pages-by-volume` or `data/cells-at-work/source-assets` has a working-tree or index diff.

The protected-root aggregate uses the established P2 method: sort recursive `{path, bytes}` records with the `en` locale, compact-serialize them, then SHA-256 the JSON.

```text
ROOTS: source; data-private; public/assets/cells-at-work/pages-by-volume; data/cells-at-work/source-assets; archived
FILES: 1,278 -> 1,278
BYTES: 7,882,956,334 -> 7,882,956,334
COMPACT_JSON_SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae -> ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
```

The aggregate is a continuity proof over paths and byte sizes, not a per-file content hash. Tracked data and public content receive the additional Git-diff proof; both checks pass.

## Product-boundary proof

The implementation does not introduce reading state, check-ins, statistics, rankings, accounts, an ebook body, browser persistence or a new content model. Source facts and causality are not rewritten. Rights remain `PASS_BY_USER_AUTHORIZATION`; no rights audit, media removal or publishing restriction was introduced.
