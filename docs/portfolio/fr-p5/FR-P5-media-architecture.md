# FR-P5 unified responsive media architecture

## Objective

FR-P5 replaces directory-wide media publishing with a deterministic, runtime-derived responsive-media system for all 12 Carmela books and 27 Work Cells topics. It preserves the paper-book companion product, all content/media use sites, on-demand disclosure behavior, grouped lightboxes, Carmela audio and protected Source immutability.

The phase is one continuous implementation. Inventory, quality experiments, derivative generation, runtime integration, build allowlisting, Pages optimization and final release are internal milestones rather than separate tasks.

## Existing boundary

At the FR-P4B-R1 baseline:

- dist: `1,565 files / 835,935,148 B`;
- build recursively copies all Carmela book folders;
- build recursively copies Work Cells page thumbnails and science-station directories;
- Carmela page media is predominantly original PNG;
- Work Cells media is WebP but has a single size per source;
- runtime JSON is already route-scoped;
- Work Cells cold detail remains `3 JSON / 1 hero / 0 station / 0 manga`;
- Carmela and Work Cells detail media mounts only after disclosure;
- continuous responsive geometry is accepted across 545 samples.

FR-P5 must not exchange these working properties for smaller files.

## Canonical sources

### Content truth

- `public/runtime/carmela/books.json`
- 12 Carmela `book-assets.json`
- 12 Carmela `companion.json`
- `public/runtime/work-cells/topics.json`
- 27 Work Cells detail JSON files

### Media reference inventory

`scripts/inventory-runtime-media.mjs` derives:

- `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json`
- `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json`

The inventory distinguishes:

- referenced media and every semantic use site;
- all available images under current publishable roots;
- current available-but-unreferenced files;
- missing referenced files;
- Carmela audio, which is recorded but excluded from image derivation.

The local enrichment pass adds decoded dimensions, mode, alpha, orientation, corruption status and duplicate/pixel hashes. Web-side code intentionally leaves those fields pending rather than inventing values.

## Media roles

### Carmela

- `carmela-series-cover`
- `carmela-book-cover`
- `carmela-page-preview`
- `carmela-explanation-preview`
- `carmela-lightbox`

### Work Cells

- `work-cells-series-thumbnail`
- `work-cells-topic-hero`
- `work-cells-station-preview`
- `work-cells-manga-preview`
- `work-cells-lightbox`

One source can have multiple roles and use sites. The source is inventoried once; derivatives are selected from the union of accepted profiles for its roles.

## Quality policy

The accepted policy is tracked at:

- `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json`

It must record:

- exact encoder name and version;
- sorted deterministic profiles;
- width, format, quality/lossless settings and role coverage;
- transparency strategy;
- fallback profile decision;
- representative visual-acceptance sample ids;
- frozen dist and route budgets derived from real experiments.

The accepted environment is Python 3.12.7, Pillow 10.4.0 and libwebp 1.3.2.
The canonical accepted policy hash is
`9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`.

No quality profile may be accepted only because it is smaller. Manga text, thin linework, color fidelity, alpha and lightbox readability are hard quality gates.

## Derivative generation

`scripts/generate-responsive-media.py`:

- uses Pillow after the exact version is frozen in the policy;
- reads the accepted inventory and policy;
- normalizes EXIF orientation without mutating the source;
- never upscales above source width;
- writes deterministic paths under `public/media/derived/`;
- writes `public/media/media-manifest.json`;
- supports write, check, dry-run, sample, role and safe output modes;
- performs atomic installation;
- never writes to `source/**`, `source-private/**` or current product originals.

Local Codex must review and, if required, harden the candidate generator before the first production write. In particular it must confirm Pillow option support, deterministic output on the active platform, fallback selection and policy-hash parity between Python and Node.

## Public media manifest

The manifest is deterministic and contains no timestamps, machine paths or user identity.

Each source entry includes:

```text
sourcePath
sourceHash
sourceWidth
sourceHeight
sourceBytes
sourceFormat
sourceMode
hasAlpha
roles[]
fallbackPath
variants[]
```

Each variant includes:

```text
profileId
path
width
height
format
bytes
sha256
roles[]
sourceHash
lossless
quality, when applicable
```

The manifest is validated by `scripts/media-manifest-policy.mjs` and `scripts/validate-responsive-media.mjs`.

Validation fails on:

- source missing/stale;
- variant missing/stale;
- duplicate source or derivative path;
- uncovered role;
- extra/orphan derivative;
- invalid dimensions, hash, format or path;
- nondeterministic/private keys;
- manifest totals mismatch.

## Browser resolution

`assets/media-resolver.js` is a pure resolver. It can:

- index manifest sources;
- select variants by semantic role;
- emit `<picture>`, `srcset`, `sizes`, width and height;
- choose a role-appropriate largest path for lightbox;
- fail closed without emitting a source-original URL when no validated derivative entry or semantic role is active.

The module is directly wired into the Carmela and Work Cells renderers. Canonical rendering uses derivative-only `<picture>` markup with centralized role `sizes`, intrinsic dimensions, stable aspect ratio and role-specific loading priority. Missing or invalid route media does not expose an original image URL.

Allowed integration options include:

1. one measured global manifest loaded lazily and cached;
2. deterministic owner shards generated from the canonical manifest;
3. build-time projection into existing route payloads.

The accepted choice is deterministic owner shards:

- one Home shard;
- one Carmela series shard and 12 book shards;
- one Work Cells series shard and 27 topic shards;
- one compact index used by the runtime to bind each route shard to the canonical manifest and exact shard body hash.

The 42 route shards contain exact canonical manifest entries. On a cold full navigation, the runtime fetches one no-store index and exactly one owner shard; validated index and shard data are coalesced in memory for warm SPA navigation. The 3,767,069-byte global manifest remains the canonical generation/build artifact with SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8`, but is never requested by the browser.

The runtime pins that canonical manifest SHA in HTML, validates index identity before route selection, and verifies the owner shard's exact bytes and SHA-256 with Web Crypto before parsing. Stable runtime JSON requests carry a release identity, index requests carry the manifest identity, and shard requests carry the shard identity. Failed index and route-shard loads are independently evicted and retryable. This preserves P4A route isolation without transferring the global manifest or another route's media.

The materialized shard closure is exact:

```text
SHARD_INDEX_FILES: 1
SHARD_INDEX_BYTES: 12527
SHARD_INDEX_SHA256: 893d7817bf87379133b43a79e97050e5e729104149195f001655aeb37a8e4828
OWNER_SHARD_FILES: 42
OWNER_SHARD_BYTES: 4027421
INDEX_AND_SHARD_BYTES: 4039948
SOURCES_ACROSS_ROUTE_SHARDS: 820
VARIANTS_ACROSS_ROUTE_SHARDS: 2898
```

Source and variant counts across shards intentionally exceed the canonical 778/2,735 totals because media shared by more than one route is copied into each owning route shard. The index binds every copy to the same canonical manifest SHA and exact owner-shard body hash.

## Release plan

`scripts/media-release-plan.mjs` derives the exact tracked publishing allowlist from:

- application assets;
- runtime JSON;
- 12 Carmela asset/companion JSON files;
- 12 declared Carmela audio files;
- the media manifest;
- manifest derivatives;
- the deterministic shard index and 42 owner shards;
- explicitly required fallbacks.

`scripts/copy-media-release-plan.mjs` copies exactly that plan and audits missing/extra output.

Production `scripts/build.mjs` now consumes only the validated tracked release plan. The cutover occurred after:

- real derivatives exist;
- manifest validation passes;
- visual quality policy is frozen;
- resolver integration passes;
- release plan is tracked/current;
- fallback-original strategy is accepted.

Recursive media-directory copying is no longer present and remains forbidden.

The accepted release plan contains 2,857 unique files and 706,989,577 bytes:

```text
APPLICATION_FILES: 10 / 219110 B
RUNTIME_JSON_FILES: 98 / 4686799 B
MEDIA_SHARD_FILES: 43 / 4039948 B
AUDIO_FILES: 12 / 85545615 B
MEDIA_FILES: 2736 / 616538053 B
DERIVATIVE_FILES: 2735 / 612770984 B
FALLBACK_ORIGINALS: 0
RELEASE_PLAN_UNIQUE_FILES: 2857
RELEASE_PLAN_TOTAL_BYTES: 706989577
```

`mediaShardFiles` are a named subset of `runtimeJsonFiles`; the unique total does not double-count them. The final total is below the frozen 715,000,000-byte dist ceiling.

## Request and interaction invariants

FR-P5 must preserve:

```text
Work Cells detail JSON: current P4A/P4B contract unless a measured manifest strategy justifies a documented change
Work Cells initial hero: 1
Work Cells initial station media: 0
Work Cells initial manga media: 0
Carmela initial detail media: 0
Carmela initial audio: 0
Work Cells audio: absent
old manifest/page-map: 0
unrelated-domain content: 0
```

Disclosure, group lightbox, focus restoration, route cleanup and audio Range behavior remain hard non-regression gates.

## Geometry and accessibility

The FR-P4B-R1 geometry contract remains active after `<picture>` integration. Source intrinsic dimensions, picture wrappers and selected variants must not reintroduce overlap, overflow, clipping or layout shift.

The final browser matrix covers:

- all 12 Carmela books;
- all 27 Work Cells topics;
- representative continuous widths and the 1088/1089 boundary;
- mobile/tablet/desktop;
- DPR 1/1.5/2;
- reflow/zoom equivalents;
- short landscape;
- forced colors;
- reduced motion;
- print;
- keyboard/focus/lightbox/audio.

Unavailable physical devices or external screen-reader sessions must remain documented limitations, not inferred passes.

## Source and rights

All project resources remain user-authorized. Copyright/licensing is not a blocker.

Independent gates remain:

- Source immutability;
- privacy and secrets;
- public-path safety;
- no local absolute paths;
- deterministic publishing;
- no task scratch or browser artifacts in Git/Pages.

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
SOURCE_PROTECTED_ROOTS_UNCHANGED: REQUIRED
```
