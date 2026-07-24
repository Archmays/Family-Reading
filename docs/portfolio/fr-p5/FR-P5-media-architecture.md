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
- safely fall back to the current original when no manifest entry is active.

The module is not yet wired into the canonical renderer at the web checkpoint. Local Codex must first generate and validate the real manifest, measure its size, and decide the least-cost loading strategy. The accepted integration must not add a large global manifest request to routes that do not need it without evidence.

Allowed integration options include:

1. one measured global manifest loaded lazily and cached;
2. deterministic owner shards generated from the canonical manifest;
3. build-time projection into existing route payloads.

The final choice must preserve route isolation and be documented with request/byte evidence.

## Release plan

`scripts/media-release-plan.mjs` derives the exact tracked publishing allowlist from:

- application assets;
- runtime JSON;
- 12 Carmela asset/companion JSON files;
- 12 declared Carmela audio files;
- the media manifest;
- manifest derivatives;
- explicitly required fallbacks.

`scripts/copy-media-release-plan.mjs` copies exactly that plan and audits missing/extra output.

The web checkpoint does not replace `scripts/build.mjs`. Production build switches only after:

- real derivatives exist;
- manifest validation passes;
- visual quality policy is frozen;
- resolver integration passes;
- release plan is tracked/current;
- fallback-original strategy is accepted.

After cutover, recursive media-directory copying is forbidden.

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
