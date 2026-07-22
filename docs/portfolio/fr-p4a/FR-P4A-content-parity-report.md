# FR-P4A content parity report

## Result

```text
RUNTIME_CONTENT_PARITY: PASS
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
RUNTIME_AUTHORING_FIELD_EXPOSURE: NONE
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
```

## Authoring inputs

| Input | Bytes | Lines | SHA-256 |
|---|---:|---:|---|
| Work Cells draft manifest | 2,445,765 | 52,213 | `86f6d9d339596085d3cb8cda39ac20b5558afb50be422c3c0d8e42527c088640` |
| Work Cells page map | 104,188 | 1,402 | `0646210b3dd2684e454d093e501a48439062bf8dccdab1981e10cd4ecd708e41` |
| Work Cells manual ranges | 8,721 | 337 | `74c530f9d2e7abf250b60a50f71cefecabad4349409c9e3feb6b1c77dbbd47bc` |

The generator reads these with Node and does not copy the authoring manifest into logs or reports.

## Parity matrix

| Contract | Authoring | Runtime | Result |
|---|---:|---:|---|
| Carmela books | 12 | 12 | PASS |
| Carmela cover references existing | 12 | 12 | PASS |
| Carmela asset references existing | 12 | 12 | PASS |
| Carmela companion references existing | 12 | 12 | PASS |
| Work Cells topics | 27 | 27 | PASS |
| Work Cells categories | 24 | 24 | PASS |
| Body science stations | 108 | 108 | PASS |
| Parent question cards | 162 | 162 | PASS |
| Reduced per-topic page refs | derived from 534 related-page occurrences | 286 | PASS |
| Globally unique related page ids | 285 | 285 | PASS |
| Runtime Work Cells image refs | 400 unique / 421 occurrences | 400/400 exist | PASS |
| Duplicate topic ids/slugs | 0 / 0 | 0 / 0 | PASS |
| Work Cells audio | false | false | PASS |
| Authoring-only key exposure | 3,543 source occurrences across 24 denylisted keys | 0 | PASS |

The one-count difference between 286 per-topic page refs and 285 global ids is an intentional cross-topic reference; the resolver is global, so it is retained without merging topic identities.

## Field projection

The draft manifest contains 133 unique field names, 18,520 object-field occurrences, 991 page annotations, 991 repeated page-image paths, 108 image prompts, 108 prompt ids, 1,006 internal notes, 991 archive paths and 991 raw annotation source-path keys. Those authoring/review/duplication fields remain in authoring truth and are not emitted into topic details.

All 108 station records retain id, topic id, title, core question, explanation, public image/alt, related page ids, biology concepts, encyclopedia tags and family-visible parent note. All 162 question records retain id, topic id, type/category/title, question, answer, related page ids, parent hint and biology concepts. Parent reading notes and sensitive guidance are retained.

The 96 authoring source-note strings were classified: 37 family-visible notes remain; 59 machine/path/status notes are omitted. The projection removes only authoring mechanics such as range labels, internal path/status tokens and source-media processing notes; it does not discard station, question, guidance or other child/family-visible content.

## Identity and status checks

- `cancer-cell` and `cancer-cell-ii` remain distinct slugs and topic ids.
- The existing hemorrhagic-shock source grouping is preserved rather than recomputed.
- Topic order and category order match authoring truth.
- `manifestStatus: draft` remains unchanged.
- Topic/manifest verification values remain unchanged; no medical verification is upgraded.
- Work Cells remains without audio.
- No full EPUB/video/subtitle/transcript or OCR body is emitted.

## Protected roots

```text
PROTECTED_ROOT_FILES: 1,278 -> 1,278
PROTECTED_ROOT_BYTES: 7,882,956,334 -> 7,882,956,334
PROTECTED_ROOT_SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae -> ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
TRACKED_PROTECTED_DIFFS: 0
```

The signature is SHA-256 over compact JSON containing sorted protected-root relative paths and byte sizes. No source, protected media, Carmela content/media, Work Cells authoring manifest/page map or public media byte was changed.
