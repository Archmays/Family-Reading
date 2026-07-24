# FR-P5 build, Pages artifact and performance report

## Outcome and evidence boundary

`BUILD_PAGES_PERFORMANCE_STATUS: PASS_WITH_PREDEPLOY_BOUNDARY`

The FR-P5 build now follows one exact release plan, publishes responsive derivatives instead of source originals, and remains a static GitHub Pages site under `/Family-Reading-Codex/`. The validated local result is:

```text
DIST_FILES_AFTER: 2857
DIST_BYTES_AFTER: 706989895
IMAGE_BYTES_AFTER: 612771379
AUDIO_BYTES_AFTER: 85545615
COMPRESSED_PAGES_ARTIFACT_BYTES: 694029530
COMPRESSED_PAGES_ARTIFACT_SHA256: 12f584e6ebc7d136e0706b7214e1179e4fd6e971c222963c39af0e5ca681d60a
UNEXPECTED_ORIGINALS_IN_DIST: 0
```

This report binds local build and artifact evidence only. Upload duration, deploy duration, artifact id, exact deployed SHA, CDN propagation, and live byte equality remain `PENDING_POSTDEPLOY_FINAL_HANDOFF`. No local result is presented as a live Pages PASS.

## Exact release-plan closure

The canonical plan is `reports/portfolio/fr-p5/fr-p5-media-release-plan.json`:

```text
RELEASE_PLAN_BYTES: 1948752
RELEASE_PLAN_SHA256: d7ade6dcc4499b9b62163878c2a86e75438a0eb6ca97401312e4304359db4740
PLANNED_FILES: 2857
PLANNED_BYTES: 706989895
MISSING_PLAN_PATHS: 0
EXTRA_DIST_PATHS: 0
DUPLICATE_PLAN_PATHS: 0
```

| Release class | Files | Bytes | Relationship |
|---|---:|---:|---|
| Application shell | 10 | 219,428 | Disjoint |
| Runtime JSON | 98 | 4,686,799 | Disjoint; includes the 43 shard files below |
| Shard index plus owner shards | 43 | 4,039,948 | Informational subset of runtime JSON |
| Carmela audio | 12 | 85,545,615 | Disjoint |
| Media package | 2,736 | 616,538,053 | Disjoint; manifest plus derivatives |
| Responsive derivatives | 2,735 | 612,770,984 | Subset of media package |
| Canonical media manifest | 1 | 3,767,069 | Subset of media package |
| Declared derivative fallback tier | 1,584 | 511,780,628 | Overlapping subset of the 2,735 derivatives |
| Original fallback files | 0 | 0 | Forbidden and absent |
| Exact union | 2,857 | 706,989,895 | Application + runtime JSON + audio + media package |

The apparently overlapping totals are intentional: shard files are already counted within runtime JSON, while manifest, derivatives, and derivative fallback tiers are already counted within the media package. The exact union is therefore `2,857` unique paths, not the sum of overlapping diagnostic rows.

The plan contains the one canonical shard index plus exactly `42` unique route-owner shards, all `12` audio files, the one media manifest, and all `2,735` derivatives. Its integrity section binds every path to exact bytes and SHA-256. `fallbackOriginals=0`; all `1,584` declared fallback-role files are policy-addressed derivatives.

## Build cutover and transaction behavior

`scripts/build.mjs` validates runtime content, inventory, the installed media manifest and derivative tree, owner shards, and the exact release plan before replacing `dist`. Product media is then populated only by `scripts/copy-media-release-plan.mjs`. The copier projects each plan path to the same repository-relative location, verifies its expected byte count and SHA-256, and refuses destinations outside the project and `dist`.

The build transaction has these fail-closed properties:

1. Stale or invalid input stops before a successful release directory can be reported.
2. The previous `dist` is not treated as input and cannot silently supply a missing planned file.
3. Only the release-plan copier writes the product-media closure.
4. Post-copy audit compares the physical tree with the exact unique plan.
5. Failed or partially copied output is not eligible for Pages upload.
6. Old recursive Carmela page trees, Work Cells thumbnails/stations, source originals, and other undeclared media are absent.

One development build correctly failed when the lightbox DPR fix made the application bytes newer than the frozen release plan. The plan was regenerated and checked, then the next build passed. This was a stale-plan rejection, not a weakened gate. Five pre-gate build attempts are recorded; the single final `npm run verify:release` invocation completed the sixth build and passed its exact dist audit. No failed CI job was rerun and no deployment occurred before the post-deploy handoff.

## Before-and-after bytes

The pre-change baseline is the FR-P4B-R1 release at commit `33d07f6e1b29935945d4f7ce13465517c3a6363c`.

| Measurement | Before | After | Absolute reduction | Reduction |
|---|---:|---:|---:|---:|
| Dist files | 1,565 | 2,857 | Not a byte optimization metric | Not applicable |
| Dist bytes | 835,935,148 | 706,989,895 | 128,945,253 | 15.43% |
| Image bytes | 749,565,575 | 612,771,379 | 136,794,196 | 18.25% |
| Audio bytes | 85,545,615 | 85,545,615 | 0 | Audio preserved |

The higher file count reflects responsive tiers and route shards; the physical byte total and image byte total are both strictly lower. The new dist is `8,010,105` bytes below the frozen `715,000,000`-byte dist ceiling.

The image total includes the `395`-byte SVG favicon. Media derivatives themselves total `612,770,984` bytes.

## Frozen budgets

The accepted policy froze these ceilings before final measurement:

| Budget | Ceiling | Actual | Headroom | Status |
|---|---:|---:|---:|---|
| Dist | 715,000,000 | 706,989,895 | 8,010,105 | PASS |
| Pages artifact, conservative uncompressed basis | 720,000,000 | 706,989,895 | 13,010,105 | PASS |
| Pages artifact, measured compressed basis | 720,000,000 | 694,029,530 | 25,970,470 | PASS |

All nine cold-route budgets also passed without raising a ceiling:

| Route | Ceiling | Actual encoded body bytes | Headroom | Status |
|---|---:|---:|---:|---|
| Home `#/` | 400,000 | 296,962 | 103,038 | PASS |
| Carmela book 1 | 500,000 | 434,093 | 65,907 | PASS |
| Carmela book 11 | 600,000 | 525,758 | 74,242 | PASS |
| Work Cells `cancer-cell-ii` | 850,000 | 390,288 | 459,712 | PASS |
| Work Cells `food-poisoning` | 900,000 | 416,869 | 483,131 | PASS |
| Work Cells `induced-pluripotent-stem-cells` | 850,000 | 503,712 | 346,288 | PASS |
| Work Cells `novel-coronavirus` | 700,000 | 472,622 | 227,378 | PASS |
| Carmela series | 1,100,000 | 519,775 | 580,225 | PASS |
| Work Cells series | 2,600,000 | 665,365 | 1,934,635 | PASS |

Each warm activation measured `395` encoded bytes, zero shard-index requests, zero owner-shard requests, and one positive cache hit. The full route, LCP, CLS, selected-source and cache records are in `docs/portfolio/fr-p5/FR-P5-browser-visual-network-report.md`.

## Dist audit

The built tree reconciles exactly with the release plan:

```text
MISSING_MEDIA_COUNT: 0
STALE_MEDIA_COUNT: 0
ORPHAN_MEDIA_COUNT: 0
DUPLICATE_OUTPUT_PATHS: 0
UNDECLARED_IMAGES: 0
UNSUPPORTED_IMAGE_FORMATS: 0
FALLBACK_VIOLATIONS: 0
ROLE_MISMATCHES: 0
RECURSIVE_OLD_MEDIA_OUTPUTS: 0
UNEXPECTED_ORIGINALS_IN_DIST: 0
PRIVATE_OR_PROCESSING_PATHS: 0
LOCAL_ABSOLUTE_PATHS: 0
SERVICE_WORKERS: 0
```

The audit also revalidates the `2,735` derivative files, all `778` source closures, policy hash, manifest hash, audio allowlist, runtime hashes, source-path boundary, static project-subpath compatibility, and publication text. No original PDF, EPUB, video, subtitle, source image tree, OCR output, browser profile, HAR, trace, cookie, report, or task scratch file is in `dist`.

## Top-byte records

Recursive top-level release directories:

| Directory | Files | Bytes |
|---|---:|---:|
| `public/media` | 2,779 | 620,578,001 |
| `public/audio` | 12 | 85,545,615 |
| `public/runtime` | 31 | 393,121 |
| `public/books` | 24 | 253,730 |
| `assets` | 9 | 217,263 |
| Root | 2 | 2,165 |

Largest physical files:

| Path | Bytes |
|---|---:|
| `public/audio/carmela-s1/carmela-s1-12.mp3` | 9,124,608 |
| `public/audio/carmela-s1/carmela-s1-11.mp3` | 8,957,843 |
| `public/audio/carmela-s1/carmela-s1-09.mp3` | 8,626,401 |
| `public/audio/carmela-s1/carmela-s1-07.mp3` | 8,599,234 |
| `public/audio/carmela-s1/carmela-s1-08.mp3` | 8,056,096 |
| `public/audio/carmela-s1/carmela-s1-10.mp3` | 7,926,948 |
| `public/audio/carmela-s1/carmela-s1-05.mp3` | 6,685,608 |
| `public/audio/carmela-s1/carmela-s1-02.mp3` | 6,375,482 |
| `public/audio/carmela-s1/carmela-s1-06.mp3` | 6,299,204 |
| `public/audio/carmela-s1/carmela-s1-01.mp3` | 5,208,122 |

Largest responsive derivatives:

| Path | Bytes |
|---|---:|
| `public/media/derived/9289331de034dddc25a6dc13428712ab/7d/a0998ede65c9/dengue-fever__v04_page-044-work-cells-lightbox-1440-webp.webp` | 1,112,332 |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/33/70e7db67fb77/hemorrhagic-shock__v04_page-121-work-cells-lightbox-1440-webp.webp` | 1,071,046 |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/2e/2ba48acff7fc/cancer-cell__v02_page-134-work-cells-lightbox-1440-webp.webp` | 1,067,576 |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/1d/67a983a82081/ips-cells__v06_page-087-work-cells-lightbox-1440-webp.webp` | 1,065,460 |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/06/18321a422023/cancer-cell__v02_page-127-work-cells-lightbox-1440-webp.webp` | 1,048,082 |

## Local project-subpath HTTP checks

The exact local static server exercised `/Family-Reading-Codex/`, not a root-only path.

| Check | Exact result | Status |
|---|---|---|
| Project subpath | `/Family-Reading-Codex/` | PASS |
| Manifest | `application/json; charset=utf-8`; 3,767,069 bytes; SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` | PASS |
| Carmela cover derivative | `image/webp`; 22,290 bytes; SHA-256 `51bb8bc8e1a343702a00d907d0c292b15976ccf9b4181e487c1a1fa8914f8647` | PASS |
| Carmela explanation derivative | `image/webp`; 198,344 bytes; SHA-256 `d5e927212d72d51da9c97de98594c4e636e9100f247f24e85bdf5353fec3ff25` | PASS |
| Work Cells lightbox derivative | `image/webp`; 815,166 bytes; SHA-256 `de3ae7fe3f13045521baddc24952e21db5fefc86f4d80624743bdde536e4495c` | PASS |
| ETag | `"51bb8bc8e1a343702a00d907d0c292b15976ccf9b4181e487c1a1fa8914f8647"` | PASS |
| Conditional request | HTTP 304 | PASS |
| Missing derivative | HTTP 404 | PASS |
| Carmela audio Range | HTTP 206; `Accept-Ranges: bytes`; `Content-Range: bytes 0-31/5208122`; 32 response bytes | PASS |
| Immutable derivatives | 3 checked; `public, max-age=31536000, immutable`; 0 violations | PASS |
| Source/policy address change | 2 cases; both produced new paths; 0 unchanged-path violations | PASS |
| Route integrity | 9/9 index and owner-shard bodies matched expected bytes/SHA | PASS |
| Service workers | 0 registrations | PASS |
| Private browser state | 0 exposed entries | PASS |
| Orphan closure | missing/stale/orphan all 0 | PASS |

The local checks prove the built bytes and HTTP behavior, not the public CDN. The same manifest and representative derivative/audio checks must be repeated against the deployed exact SHA before `PAGES_STATUS: VERIFIED`.

## Pages artifact

The local archive was created twice from the same built tree with stable ordering and metadata. Both passes produced:

```text
CONSERVATIVE_UNCOMPRESSED_BYTES: 706989895
COMPRESSED_BYTES: 694029530
SHA256: 12f584e6ebc7d136e0706b7214e1179e4fd6e971c222963c39af0e5ca681d60a
DETERMINISTIC_PASSES: 2
PAGES_BUDGET_BYTES: 720000000
COMPRESSED_HEADROOM_BYTES: 25970470
```

Before deployment, the following are deliberately unresolved:

```text
DEPLOYMENT_BOUNDARY: PENDING_POSTDEPLOY_FINAL_HANDOFF
LIVE_VERIFIED: false
UPLOAD_DURATION: PENDING_POSTDEPLOY_FINAL_HANDOFF
DEPLOY_DURATION: PENDING_POSTDEPLOY_FINAL_HANDOFF
ARTIFACT_ID: PENDING_POSTDEPLOY_FINAL_HANDOFF
EXACT_DEPLOYED_SHA: PENDING_POSTDEPLOY_FINAL_HANDOFF
CDN_PROPAGATION: PENDING_POSTDEPLOY_FINAL_HANDOFF
LIVE_EXACT_CHECKS: PENDING_POSTDEPLOY_FINAL_HANDOFF
```

These fields are finalized in the post-deploy handoff rather than guessed from local evidence.

## Performance closure

The persistent browser report and machine baselines bind the performance result:

- Nine cold route budgets: PASS.
- Nine warm cache activations: PASS.
- Exactly 15 viewport/DPR selections: PASS, with zero originals and zero unexpected upscaling.
- Lighthouse mobile: performance 82, accessibility 100, best practices 100, SEO 100.
- Lighthouse desktop: 100/100/100/100.
- Continuous geometry: 545/545, with zero Hero overlap and zero horizontal overflow.
- Carmela parity: 12/12.
- Work Cells parity: 27/27.
- Audio Range: HTTP 206.

Lighthouse wrote complete JSON with no runtime error for both runs. Its command-line process returned nonzero only after report completion because Windows could not remove its temporary browser directory; the reports and scores are valid, and the cleanup issue is documented rather than hidden. Native browser zoom, physical-device sessions, and external screen-reader sessions were unavailable; the browser report records bounded equivalents and does not claim those unavailable environments passed.

Primary persistent evidence:

- `reports/portfolio/fr-p5/fr-p5-media-release-plan.json`
- `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json`
- `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json`
- `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json`
- `reports/portfolio/fr-p5/fr-p5-run-manifest.json`
- `docs/portfolio/fr-p5/FR-P5-browser-visual-network-report.md`
