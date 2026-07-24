# FR-P5 manifest-driven build and Pages performance strategy

## Objective

After the real derivative set and browser integration pass, FR-P5 replaces recursive media-directory publishing with an exact allowlist derived from the accepted media manifest and runtime content. The cutover is part of FR-P5, not a later placeholder.

## Safe cutover sequence

1. generate and track the corrected media-reference inventory;
2. freeze and track the accepted quality policy;
3. generate all derivatives and the public media manifest;
4. validate source/variant hashes, dimensions and role coverage;
5. integrate the resolver into Carmela and Work Cells renderers;
6. verify route requests, DPR selection, lightbox quality and R1 geometry;
7. generate and track the media release plan;
8. compare the plan against the current build output;
9. switch `scripts/build.mjs` to the exact-plan copier;
10. run dist audit and browser acceptance;
11. publish exact SHA and verify live bytes/hashes/cache.

The build must not switch before steps 1–7 pass. The renderer must not switch to paths that have not been generated and validated.

## Exact release inputs

The final release plan includes only:

- `index.html`;
- `.nojekyll`;
- current application assets;
- current runtime JSON and runtime manifest;
- 12 Carmela `book-assets.json` and `companion.json` files;
- 12 declared Carmela MP3 files;
- `public/media/media-manifest.json`;
- all derivatives declared by that manifest;
- only the fallback originals explicitly declared by that manifest.

It excludes:

- recursively copied Carmela page/generated directories unless a file is an explicit fallback;
- unreferenced Work Cells thumbnails/station assets;
- orphan or superseded derivatives;
- Source/private/authoring/OCR/review/browser/test artifacts;
- old Work Cells authoring manifest and page map;
- Work Cells audio;
- raw images that are no longer required as fallbacks.

## Build implementation

`scripts/media-release-plan.mjs` creates the stable allowlist.

`scripts/copy-media-release-plan.mjs`:

- validates stable, unique, repository-relative paths;
- rejects evidence/private/source roots;
- cleans the target only after plan validation;
- copies exactly the declared set;
- creates `.nojekyll`;
- audits missing and extra output.

Local Codex must integrate these modules into `scripts/build.mjs` only after a real tracked plan exists. The final build must no longer invoke recursive copying for product images.

Application JavaScript/CSS can remain directory-copied only if an exact application-asset inventory proves that directory contains no task output or stale bundle. A stricter asset plan is preferred if the directory has accumulated obsolete files.

## Dist audit expansion

`scripts/audit-dist-assets.mjs` must gain fail-closed checks for:

- media manifest missing or invalid;
- manifest source/variant hash mismatch;
- media release plan missing/stale;
- derivative missing/stale;
- orphan derivative;
- undeclared image in dist;
- unexpected source original in dist;
- invalid dimensions/format/extension;
- source image copied when fallback is derivative;
- duplicate output path;
- unsupported AVIF if the accepted policy does not enable AVIF;
- `<picture>`/manifest role mismatch;
- current recursive Work Cells/Carmela media roots accidentally copied.

The existing privacy, runtime, OCR, source, Work Cells audio and scratch checks remain unchanged.

## Route loading strategy

The public media manifest may be too large for every route. The local implementation must measure it before choosing one of these strategies:

### Option A: one lazy global manifest

Use only when compressed bytes and route cost are acceptable. Load on the first media-capable route, cache the resolved object, coalesce concurrent loads and isolate failures.

### Option B: generated owner shards

Generate deterministic per-book/per-topic media shards plus a small index. This adds route requests but may reduce bytes. Shards must be declared by the canonical manifest and validated against it.

### Option C: build-time projection

Project only the relevant media entries into existing route payloads without mutating authoring/source content. This preserves request counts but increases runtime JSON. The projection must stay deterministic and route-scoped.

The accepted option is selected from real manifest size, request latency, cache behavior and browser waterfall evidence. It must not silently regress P4A isolation.

## Browser media contracts

Every responsive image must provide:

- valid fallback `src`;
- `srcset` with width descriptors;
- truthful `sizes`;
- intrinsic `width` and `height`;
- stable layout container;
- correct alt semantics;
- role-appropriate loading/decoding/fetch priority;
- no upscaling above source dimensions;
- lightbox path appropriate to text detail.

The browser acceptance records which candidate was actually selected for:

- 390 px mobile at DPR 1 and 2;
- 768 px tablet at DPR 1 and 2;
- 1280/1440 desktop at DPR 1 and 2;
- the 1088/1089 Work Cells boundary;
- representative reflow/zoom equivalents.

Unexpected selection, multiple duplicate downloads or original-source downloads are failures unless explicitly documented as required fallback.

## Performance budgets

FR-P5 does not freeze arbitrary budgets before the sample experiment. After quality profiles are accepted, calculate and commit:

- expected derivative bytes by role/domain;
- expected fallback-original bytes;
- expected dist size;
- expected Pages artifact size;
- route image and total-transfer budgets;
- expected first-load and warm-load request counts;
- build and upload time warnings.

Once frozen, budgets cannot be raised merely to obtain a pass.

## Pages and cache validation

Verify the live exact-SHA site for:

- media manifest and derivative bytes match Git blobs;
- project subpath works;
- MIME is correct;
- ETag/conditional requests behave consistently;
- immutable/hash-based derivative URLs are cacheable;
- warm route navigation avoids duplicate transfer;
- CDN propagation is bounded and retried;
- Carmela MP3 Range remains 206;
- no service worker or private runtime state is introduced.

## Geometry and quality non-regression

The final release repeats the relevant FR-P4B-R1 geometry contract after `<picture>` integration. The accepted result remains:

```text
HERO_OVERLAP_FINDINGS: 0
HORIZONTAL_OVERFLOW_FINDINGS: 0
CLIPPED_TEXT_FINDINGS: 0
BROKEN_MEDIA_FINDINGS: 0
```

Image-byte reduction never overrides content readability, layout, accessibility or media interaction.
