# FR-P5 media inventory report

## Outcome

The canonical runtime and content projections resolve 778 unique logical images across 3,338 use sites. Pillow 10.4.0 decoded every referenced image. No referenced image is missing, corrupt, animated, unexpectedly oriented, or duplicated by raw or normalized-pixel hash.

```text
CARMELA_BOOKS: 12
WORK_CELLS_TOPICS: 27
WORK_CELLS_CATEGORIES: 24
WORK_CELLS_STATIONS: 108
WORK_CELLS_QUESTIONS: 162
WORK_CELLS_PAGE_REFS: 286
HEMORRHAGIC_SHOCK: PRESENT
MISSING_REFERENCED_IMAGES: 0
CARMELA_AUDIO_FILES: 12
```

The tracked inventory is schema version 2:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json` | 2,657,664 | `61f7853a87c1142a9f8d3ae2432cf0a2e6074466392e36151a75c8faf11be20e` |
| `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json` | 11,146 | `16e4dbc05c459a001ff0322e22181451de1d6647d3e2f5b55d6a3d5a3c59e269` |

## Role and domain coverage

| Role | Unique logical images |
|---|---:|
| Carmela series cover | 12 |
| Carmela book cover | 12 |
| Carmela page preview | 297 |
| Carmela explanation preview | 69 |
| Carmela lightbox | 366 |
| Work Cells series thumbnail | 27 |
| Work Cells topic Hero | 27 |
| Work Cells station preview | 108 |
| Work Cells manga preview | 285 |
| Work Cells lightbox | 393 |

One logical image may have several roles, so role counts intentionally exceed the 778 unique-source count. Carmela contributes 378 logical images. Work Cells contributes 292 page images and 108 science-station images.

## Decode and enrichment

Every logical reference records:

- repository-relative path, bytes and raw SHA-256;
- decoded format, stored and normalized dimensions, mode and alpha;
- EXIF orientation and whether normalization was required;
- animation and frame count;
- normalized-pixel SHA-256;
- every domain, role and runtime use site;
- explicit derivation lineage.

The observed logical and derivation formats are exactly PNG and WebP. There are no referenced alpha images and no animated images. Production policy therefore does not invent an AVIF, GIF or JPEG source-format requirement.

```text
REFERENCED_IMAGES: 778
REFERENCED_USE_SITES: 3338
AVAILABLE_IMAGES_IN_SCANNED_ROOTS: 1488
AVAILABLE_BUT_UNREFERENCED: 710
CORRUPT_IMAGES: 0
MISSING_IMAGES: 0
ANIMATED_IMAGES: 0
UNEXPECTED_ORIENTATION: 0
LOGICAL_RAW_DUPLICATE_GROUPS: 0
LOGICAL_PIXEL_DUPLICATE_GROUPS: 0
DERIVATION_RAW_DUPLICATE_GROUPS: 0
DERIVATION_PIXEL_DUPLICATE_GROUPS: 0
```

The 710 available-but-unreferenced files remain candidate orphans only. FR-P5 does not delete or mutate them; the exact release plan simply excludes them.

## High-resolution derivation lineage

The runtime intentionally refers to 360×512 Work Cells thumbnails. Those files are adequate logical keys but cannot satisfy the accepted DPR and lightbox contract. FR-P5 therefore separates the logical reference from the read-only encoding basis:

- all 292 `public/assets/cells-at-work/page-thumbnails/**` records require an exact same-name counterpart under `public/assets/cells-at-work/pages-by-volume/**`;
- all 292 counterparts exist;
- every counterpart is 1126×1600 and is strictly larger in both dimensions;
- the logical thumbnails total 10,367,242 bytes;
- their high-resolution derivation sources total 162,273,864 bytes;
- all 108 Work Cells station images and all 378 Carmela images use strict self-lineage.

The logical `path/hash/bytes/metadata` and `derivationSource.path/hash/bytes/metadata` remain independently verifiable. The generator reads the high-resolution basis but the manifest keeps the logical path as the renderer lookup key. A missing, renamed, mismatched or non-larger counterpart fails closed. No protected source is copied to the release.

## Corrected Work Cells truth

The historical FR-P4B 26/27 evidence remains unchanged as historical evidence. It is not the FR-P5 source of truth. The corrected runtime-derived artifact records:

```text
TOPICS: 27
CATEGORIES: 24
STATIONS: 108
QUESTIONS: 162
PAGE_REFS: 286
HEMORRHAGIC_SHOCK: PRESENT
```

This satisfies `LEGACY_P4B_EVIDENCE_CORRECTION: PASS`.

## Source and rights boundary

The inventory is read-only over product media and protected roots. It writes only the two tracked reports above. The pre-generation protected-root signature remains:

```text
FILES: 1278
BYTES: 7882956334
COMPACT_PATH_BYTES_SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
```

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
MEDIA_SOURCE_INVENTORY: PASS
MEDIA_DECODE_STATUS: PASS
MEDIA_DUPLICATE_ANALYSIS: PASS
```
