# FR-P5 final report

## Outcome and pre-deploy handoff boundary

FR-P5 completed the local implementation and acceptance of unified responsive-media production, owner-sharded runtime loading, exact release allowlisting, browser/network validation, and the static Pages artifact for `Archmays/Family-Reading-Codex` (repository id `1271691196`). Repository visibility remains public. The product remains a companion beside a physical book; it has not become an ebook reader, progress product, check-in product, statistics product, account system, or administration system. FR-P6 has not started.

The local evidence supports `COMPLETE_WITH_DOCUMENTED_LIMITATIONS`: native browser zoom, physical-device sessions, and external screen-reader sessions were unavailable, while their available browser equivalents and all local media, route, build, accessibility, and performance gates passed.

`PENDING_POSTDEPLOY_FINAL_HANDOFF` has one narrow meaning in this report. It applies only to:

- the live GitHub Pages deployment and exact live-byte verification;
- the self-referential final main commit SHA and proof that local main equals remote main;
- local and remote task-branch retirement without deleting branches outside the authorized task scope;
- server, scratch, worktree, stash, and workspace closeout.

It is not a live Pages PASS. No live URL, live SHA, deployment id, or post-deploy workspace claim is inferred from local evidence.

## Acceptance summary

| Acceptance area | Exact result | Status | Primary evidence |
|---|---|---|---|
| Canonical quality policy | SHA-256 `9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`; Python 3.12.7, Pillow 10.4.0, libwebp 1.3.2 | PASS | `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json`; `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md` |
| Canonical media manifest | `778` sources, `2,735` variants, `612,770,984` derivative bytes; `3,767,069` bytes; SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` | PASS | `public/media/media-manifest.json` |
| Manifest transfer forms | gzip `242,267` bytes; Brotli `192,029` bytes; browser global-manifest requests `0` | PASS | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| Runtime projection | `42` owner shards plus one index; index and shards `4,039,948` bytes | PASS | `public/media/media-shard-index.json`; `docs/portfolio/fr-p5/FR-P5-media-architecture.md` |
| Inventory | `778` logical images across `3,338` use sites; missing/corrupt/duplicate/unexpected-orientation counts `0` | PASS | `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json`; `docs/portfolio/fr-p5/FR-P5-media-inventory-report.md` |
| Determinism | A/B each `2,736` files and `616,538,053` bytes; path, size, SHA-256, manifest-byte, and derivative-byte mismatches `0` | PASS | `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` |
| Content parity | Carmela `12/12`; Work Cells `27/27`; stations `108`; questions `162`; page references `286`; Carmela audio `12` | PASS | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| Network matrix | nine routes, 18 cold/warm measurements; all nine cold budgets pass; all warm measurements `395` bytes | PASS | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| Responsive selection | exactly 15 viewport/DPR cases; original selection, unexpected upscaling, duplicate candidate transfer, and overflow counts `0` | PASS | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| Continuous geometry | `545/545`: `469 + 14 + 54 + 8`; Hero overlap, horizontal overflow, clipped text, and broken media counts `0` | PASS | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| Visual review | `12` unique screenshots, `498,614` bytes; two each for cover, explanation, Hero, lightbox, preview, and text-heavy manga | PASS | `docs/portfolio/fr-p5/screenshots/`; `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| Lighthouse | mobile `82/100/100/100`; desktop `100/100/100/100`; both complete with no runtime error | PASS | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| Local release artifact | dist `2,857` files / `706,989,895` bytes; compressed artifact `694,029,530` bytes | PASS | `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| Quality compromise count | `0` | PASS | `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md` |

## Source, rights, privacy, and product boundaries

The same protected-root signature was measured before and after FR-P5:

```text
FILES: 1278
BYTES: 7882956334
SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
TRACKED_PROTECTED_DIFFS: 0
```

The generator wrote only the new derivative tree and canonical manifest. It did not delete, move, rename, overwrite, compress, or re-encode protected Source, private Source, original PDF/MP3/EPUB/video/subtitle resources, Carmela source pages/generated images, or Work Cells source thumbnails/station images. Existing product originals remain intact, and the release plan publishes zero fallback originals.

`RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION` applies throughout the phase. FR-P5 did not restart copyright, licensing, ownership, attribution, or provenance clearance, and it did not narrow the authorized publishing surface for those reasons.

Privacy and public-tree checks passed: the public repository validator found no disallowed private paths, local machine paths, credentials, or processing artifacts; browser inspection found `0` local-storage entries, `0` session-storage entries, `0` IndexedDB databases, and `0` service-worker registrations. Static GitHub Pages compatibility remains intact: no backend, database, login, runtime image service, analytics service, PWA, or service worker was introduced.

The paper-book companion boundary also remains intact:

- no reading progress, last-read, completion, streak, check-in, score, ranking, badge, or account behavior;
- no child-facing OCR full text or ebook-style primary reading experience;
- no persisted audio/media state and no Work Cells audio;
- Carmela audio remains user-triggered and route-scoped;
- Home remains a book-materials entrance rather than a dashboard.

## Media production and runtime acceptance

### Inventory, quality, and generation

The corrected inventory establishes all `27` Work Cells topics, including `hemorrhagic-shock`, and supersedes the historical `26/27` snapshot without altering that historical record. Pillow decoded every one of the `778` referenced logical images. The inventory found `0` missing images, `0` corrupt images, `0` animated images, `0` unexpected orientations, `0` raw duplicate groups, and `0` normalized-pixel duplicate groups.

The accepted quality decision used nine real sources, all ten semantic roles, and `182` encoded candidates. Compact covers use quality 92, previews/stations quality 94, and lightbox detail quality 96. Text crops and native-width inspection passed for Carmela small text, Work Cells vertical labels, speech balloons, fine manga lines, gradients, color, and lightbox detail. No alpha source exists in the current inventory, so alpha applicability is recorded as pass-not-applicable rather than simulated with unrelated media. No budget was raised and no quality setting was reduced after measurement.

Production installation reproduced the A/B identity:

```text
PRODUCTION_MEDIA_FILES: 2736
PRODUCTION_MEDIA_BYTES: 616538053
PRODUCTION_DERIVATIVE_FILES: 2735
PRODUCTION_DERIVATIVE_BYTES: 612770984
PRODUCTION_MANIFEST_BYTES: 3767069
PRODUCTION_MANIFEST_SHA256: b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8
MISSING_DERIVATIVES: 0
STALE_DERIVATIVES: 0
ORPHAN_DERIVATIVES: 0
CORRUPT_DERIVATIVES: 0
DUPLICATE_OUTPUT_PATHS: 0
```

The production write, full regeneration check, Node installed-tree validation, 42/42 shard validation, and five transaction fault cases passed. Python generation and Node validation independently reproduced the same full policy hash.

### Direct renderer and owner-shard integration

Canonical Carmela and Work Cells renderers now emit derivative-only `<picture>` structures with role-specific `srcset`, truthful centralized `sizes`, intrinsic width/height, stable aspect ratio, fallback `src`, alt text, loading/decoding, and Hero-only priority where appropriate. This is direct renderer integration through `assets/media-resolver.js`; there is no monkey patch, HTML interception, or runtime image service.

Preview and lightbox tiers are distinct. Disclosures mount only their exact media group, grouped media is deduplicated, and lightbox close/route cleanup removes candidates. The accepted interaction record confirms Escape, arrows, close controls, focus restoration, route cleanup, and materially larger lightbox selection without original-image fallback.

The runtime does not transfer the `3,767,069`-byte global manifest. A cold full navigation loads exactly one hash-bound shard index and one owner shard; warm SPA reuse loads neither. Index and shard failures are evicted independently. One injected shard failure displayed the path-safe error state, the retry control became visible, and the second request recovered.

### Nine frozen route budgets

Transfer bytes use `PerformanceResourceTiming.encodedBodySize`; wire-transfer bytes remain separately recorded in the machine baseline. Each cold run had zero cache hits, one shard-index request, and one owner-shard request. Each warm run had positive cache evidence, zero shard-index requests, zero owner-shard requests, and `395` measured bytes.

| Route | Cold bytes | Frozen ceiling | Margin | Warm bytes | Status |
|---|---:|---:|---:|---:|---|
| `#/` | 296,962 | 400,000 | 103,038 | 395 | PASS |
| `#/series/carmela-season-1` | 519,775 | 1,100,000 | 580,225 | 395 | PASS |
| `#/book/carmela-s1-01` | 434,093 | 500,000 | 65,907 | 395 | PASS |
| `#/book/carmela-s1-11` | 525,758 | 600,000 | 74,242 | 395 | PASS |
| `#/series/work-cells` | 665,365 | 2,600,000 | 1,934,635 | 395 | PASS |
| `#/science/work-cells/food-poisoning` | 416,869 | 900,000 | 483,131 | 395 | PASS |
| `#/science/work-cells/induced-pluripotent-stem-cells` | 503,712 | 850,000 | 346,288 | 395 | PASS |
| `#/science/work-cells/cancer-cell-ii` | 390,288 | 850,000 | 459,712 | 395 | PASS |
| `#/science/work-cells/novel-coronavirus` | 472,622 | 700,000 | 227,378 | 395 | PASS |

Across the nine routes, original selections, duplicate downloads, global-manifest requests, unexpected shard-index requests, unexpected upscaling, request failures, unexpected console errors, and horizontal overflow all equal `0`. Cold CLS ranged from `0.0094001261` to `0.0606496684`, below the `0.1` ceiling.

## Browser, visual, interaction, and accessibility acceptance

The exact srcset matrix covers `390@1/2`, `430@1/2`, `768@1/2`, `1024@1/2`, `1280@1/1.5/2`, `1440@1/2`, `1088@2`, and `1089@2`. All 15 records bind `currentSrc`, profile/path, natural and variant dimensions, object-fit content-box rendered dimensions, transfer/resource bytes, cache state, required pixel width, upscaling ratio, and exactly one transferred candidate.

The geometry rerun passed all `545` samples:

- `469` continuous-width samples across seven deep topics, including every width from 320 to 1440 required by the R1 contract and all 45 dense widths from 680 to 1120;
- `14` named viewports, including 773×709, 1024×400, 390×844, 1440×900, and the 1088/1089×400 boundary;
- `54` topic endpoints: all 27 topics at 390×844 and 1280×720;
- `8` CSS-viewport-equivalent zoom/reflow samples at 80, 90, 100, 110, 125, 150, 175, and 200 percent.

Hero overlap, horizontal overflow, clipped text, broken media, and geometry failures were all `0`. Carmela parity was `12/12` and Work Cells parity `27/27`; initial disclosure media/audio and route overflow stayed at zero, while each Work Cells detail retained one initial Hero and no initial station, manga, audio, other-topic detail, Carmela detail, old manifest, or page-map request.

The 12 reviewed screenshots total `498,614` bytes and have 12 distinct SHA-256 values. The six review roles each have exactly two screenshots. Review passed for text readability, crop, rotation, current alpha applicability, color, line edges, blur/upscale, lightbox clarity, and stable layout.

Keyboard and accessibility observations passed `7/7`: skip-link keyboard activation, route-heading focus and `aria-current`, answer-toggle state, grouped lightbox ArrowRight behavior, WCAG text spacing, 200% reflow equivalent, and short landscape. Reduced motion, forced colors, print, disclosure behavior, focus restoration, one-shot failure/retry, and route cleanup passed. Audio Range returned `206`, `Accept-Ranges: bytes`, `Content-Range: bytes 0-31/5208122`, and 32 response bytes.

Two complete Lighthouse runs covered the Work Cells food-poisoning route:

| Form factor | Performance | Accessibility | Best practices | SEO | Runtime error |
|---|---:|---:|---:|---:|---|
| Mobile | 82 | 100 | 100 | 100 | none |
| Desktop | 100 | 100 | 100 | 100 | none |

## Build, dist, local Pages, and artifact acceptance

The exact release-plan JSON is `1,948,752` bytes with SHA-256 `d7ade6dcc4499b9b62163878c2a86e75438a0eb6ca97401312e4304359db4740`. It contains `2,857` unique files and `706,989,895` bytes:

| Release class | Files | Bytes |
|---|---:|---:|
| Application | 10 | 219,428 |
| Runtime JSON | 98 | 4,686,799 |
| Shard index and owner shards, included in runtime JSON | 43 | 4,039,948 |
| Carmela audio | 12 | 85,545,615 |
| Manifest plus derivatives | 2,736 | 616,538,053 |
| Derivatives only | 2,735 | 612,770,984 |
| Fallback originals | 0 | 0 |
| Unique release total | 2,857 | 706,989,895 |

The plan was validated before dist cleanup. Product media was populated only by `scripts/copy-media-release-plan.mjs`, then audited by path, byte count, and SHA-256. The old recursive Carmela, thumbnail, and station-copy paths are absent; stale dist reuse and uploading a failed build are blocked.

The exact before/after comparison is:

| Metric | FR-P4B-R1 before | FR-P5 after | Absolute change | Relative result |
|---|---:|---:|---:|---:|
| Files | 1,565 | 2,857 | +1,292 | derivative variants are explicit |
| Total bytes | 835,935,148 | 706,989,895 | −128,945,253 | 15.425% smaller |
| Image bytes | 749,565,575 | 612,771,379 | −136,794,196 | 18.250% smaller |
| Audio bytes | retained | 85,545,615 | byte-identical declared audio class | PASS |

The after-image total includes `612,770,984` derivative bytes plus the 395-byte application favicon. Final dist is below the frozen `715,000,000`-byte ceiling. The conservative Pages bound equals final dist and is below `720,000,000`.

Dist audit found zero missing, stale, orphan, duplicate-output, undeclared-image, unsupported-format, fallback, role-mismatch, recursive-old-media, unexpected-original, privacy, runtime-staleness, Source, and audio-closure findings.

Local project-subpath HTTP checks passed:

- `/Family-Reading-Codex/` returned the application;
- the manifest returned `application/json; charset=utf-8`, `3,767,069` bytes, and the canonical manifest SHA-256;
- three representative derivative samples returned `image/webp` with exact Git bytes and SHA-256;
- concrete ETag `"51bb8bc8e1a343702a00d907d0c292b15976ccf9b4181e487c1a1fa8914f8647"` revalidated to `304`;
- missing media returned `404`;
- audio returned `206`, byte ranges, and the exact `Content-Range`;
- all three checked derivative responses used `public, max-age=31536000, immutable`, with zero cache violations;
- two source/policy path-change cases produced new content-addressed paths;
- all nine route index/shard bodies matched their exact local hashes;
- service-worker registrations and exposed private-state entries were zero.

The compressed Pages artifact is `694,029,530` bytes with SHA-256 `12f584e6ebc7d136e0706b7214e1179e4fd6e971c222963c39af0e5ca681d60a`. This is local artifact evidence only; upload, deployment, CDN propagation, and live byte equality remain within `PENDING_POSTDEPLOY_FINAL_HANDOFF`.

## Test and execution governance

Targeted tests passed `14/14`. The current affected closure passed `201/201`. No required threshold, assertion, test, route ceiling, image-quality setting, or accessibility expectation was weakened; no test was skipped or converted into an expected failure.

Execution accounting is intentionally single-gate:

```text
TARGETED_TESTS: 14/14
AFFECTED_CLOSURE: 201/201
PRE_GATE_BUILDS: 5
FINAL_FULL_GATE_RUNS: exactly 1
FINAL_GATE_INTERNAL_BUILDS: 1
TOTAL_BUILDS_AFTER_FINAL_GATE: 6
FAILED_CI_JOB_RERUNS_BEFORE_DEPLOY: 0
DEPLOYMENTS_BEFORE_POSTDEPLOY_HANDOFF: 0
```

The one `npm run verify:release` invocation ran as the sole final full gate after this required report existed. It passed every runtime, media, shard, plan, evidence, public-repository, test, build, and dist-audit step; its internal build was the sixth build. Development used targeted or affected closures and did not repeatedly execute the full gate. The final wrapper itself confirmed `201/201`.

Expensive work was reused only when its inputs and identities were unchanged: the accepted 778-source inventory and policy hash bound generation, A/B/prod/check outputs reconciled byte-for-byte, and warm browser routes reused the verified index/shard cache. Required A/B determinism, production installation, full currentness check, browser measurements, and final build were not replaced by cache assertions.

The machine run manifest binds command count, the `14/14` and `201/201` results, exactly one completed final-gate invocation, six builds, and equal protected-root signatures. GitHub Actions failed-job reruns and deployments remain zero before the post-deploy handoff.

## Persistent evidence index

### Required narrative reports

| Report | Purpose |
|---|---|
| `docs/portfolio/fr-p5/FR-P5-media-inventory-report.md` | canonical inventory, decode/duplicate analysis, correction, protected roots |
| `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md` | real-sample visual decision, frozen encoder policy and budgets |
| `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` | A/B determinism, atomic production installation and installed-tree validation |
| `docs/portfolio/fr-p5/FR-P5-browser-visual-network-report.md` | nine routes, 15 srcset cases, 545 geometry samples, screenshots, interaction and accessibility |
| `docs/portfolio/fr-p5/FR-P5-build-pages-performance-report.md` | release closure, dist/artifact, local HTTP and explicit deployment boundary |
| `docs/portfolio/fr-p5/FR-P5-final-report.md` | acceptance synthesis, adversarial reflection and section-23 status |

### Required machine-readable artifacts

| Artifact | Binding |
|---|---|
| `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json` | `2,657,664` bytes; SHA-256 `61f7853a87c1142a9f8d3ae2432cf0a2e6074466392e36151a75c8faf11be20e` |
| `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json` | `11,146` bytes; SHA-256 `16e4dbc05c459a001ff0322e22181451de1d6647d3e2f5b55d6a3d5a3c59e269` |
| `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json` | canonical policy hash `9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`; file SHA-256 `0de9befe026240fa90319e4007cd4f52419eee003b871705af34dc77d65cc075` |
| `public/media/media-manifest.json` | `3,767,069` bytes; SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` |
| `reports/portfolio/fr-p5/fr-p5-media-release-plan.json` | `1,948,752` bytes; SHA-256 `d7ade6dcc4499b9b62163878c2a86e75438a0eb6ca97401312e4304359db4740` |
| `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` | nine cold/warm routes, exact 15-case srcset matrix, Lighthouse and route invariants |
| `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` | 545 geometry samples, 12 hash-bound screenshots, content/interaction/accessibility results |
| `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` | dist, artifact, local exact HTTP checks and deployment boundary |
| `reports/portfolio/fr-p5/fr-p5-run-manifest.json` | commands, tests, one-full-gate/build governance and protected signatures |

No raw HAR, browser trace, browser profile, cookies, candidate derivative set, contact sheet, or duplicate screenshot belongs in persistent evidence or the release artifact.

## Limitations

- The eight zoom records are CSS-viewport-equivalent reflow measurements through 200%; they do not claim native browser-zoom operation.
- Browser emulation and measured responsive viewports do not claim physical-device testing.
- Automated semantics, keyboard, focus, reflow, color-mode, and accessibility checks do not claim an external screen-reader session.
- The local Pages artifact and project-subpath server do not establish public CDN behavior. Live exact-SHA, MIME/cache/ETag/304/404/206 repetition, propagation, and Git-byte equality remain restricted to `PENDING_POSTDEPLOY_FINAL_HANDOFF`.

These limits do not downgrade the proven local media, browser, network, geometry, Lighthouse, build, dist, privacy, Source, or artifact gates.

## Thirty-point adversarial reflection

| # | Required question | Answer | Concrete evidence pointer |
|---:|---|---|---|
| 1 | 是否修改 Source？ | PASS — protected roots retained the same 1,278-file signature and tracked protected diffs are zero. | `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md`; `reports/portfolio/fr-p5/fr-p5-run-manifest.json` |
| 2 | 是否覆盖现有原图？ | PASS — derivatives use a new policy-addressed tree; existing originals were not overwritten and fallback originals are zero. | `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md`; `reports/portfolio/fr-p5/fr-p5-media-release-plan.json` |
| 3 | 是否遗漏任一媒体 use-site？ | PASS — 3,338 inventoried use sites resolve through ten roles and browser parity is 12/12 plus 27/27. | `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json`; `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| 4 | 是否错误使用历史 26/27 inventory？ | PASS — the historical record is retained but the corrected 27-topic runtime-derived artifact is authoritative for FR-P5. | `docs/portfolio/fr-p5/FR-P5-legacy-evidence-correction.md`; `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json` |
| 5 | 是否所有 27 topics 与 hemorrhagic-shock 存在？ | PASS — 27/27 and `hemorrhagic-shock` present in inventory and browser parity. | `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json`; `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| 6 | 是否全部图片可解码？ | PASS — all 778 referenced sources and 2,735 installed derivatives decode; corrupt counts are zero. | `docs/portfolio/fr-p5/FR-P5-media-inventory-report.md`; `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` |
| 7 | 是否 alpha/orientation 保留？ | PASS_NOT_APPLICABLE_TO_CURRENT_ALPHA_SET — alpha sources are zero, unexpected orientation is zero, and the pipeline preserves/normalizes these properties when present. | `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json`; `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md` |
| 8 | 是否 quality policy 基于真实样本？ | PASS — nine real sources, ten roles, and 182 encoded candidates informed the accepted profiles. | `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md`; `reports/portfolio/fr-p5/fr-p5-quality-experiment-summary.json` |
| 9 | 是否为了体积降低漫画文字质量？ | PASS — q88 was rejected for label/line margin; q94/q96 text crops and screenshots passed, with quality compromises zero. | `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md`; `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| 10 | 是否生成两次 byte-identical？ | PASS — A/B have 2,736 files each with zero path, size, SHA-256, manifest-byte, or derivative-byte mismatch. | `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` |
| 11 | policyHash 是否 Python/Node 一致？ | PASS — both independently reproduce `9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`. | `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json`; `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` |
| 12 | 是否有 missing/stale/orphan derivative？ | PASS — installed-tree and dist closure counts are all zero. | `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md`; `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| 13 | 是否 resolver 直接集成而非 monkey patch？ | PASS — canonical renderers call the media resolver and emit derivative-only picture markup. | `assets/media-resolver.js`; `assets/carmela-companion.js`; `assets/science-companion.js` |
| 14 | 是否 global manifest 增加了不必要 route bytes？ | PASS — browser global-manifest requests are zero; cold routes use one index plus one owner shard. | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json`; `docs/portfolio/fr-p5/FR-P5-media-architecture.md` |
| 15 | 是否 `<picture>` 的 sizes truthful？ | PASS — all 15 cases bind authored sizes to measured content-box dimensions and selected profiles. | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| 16 | 是否 currentSrc 符合 DPR/viewport？ | PASS — the exact 15-case matrix has zero unexpected upscaling or original selection and one transferred candidate per case. | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| 17 | 是否预览与 lightbox 分层？ | PASS — preview and lightbox use distinct role profiles; clarity, dedup, focus, close and cleanup passed. | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json`; `docs/portfolio/fr-p5/FR-P5-browser-visual-network-report.md` |
| 18 | 是否 original 仍被大量误发布？ | PASS — fallback originals and unexpected originals in dist are both zero. | `reports/portfolio/fr-p5/fr-p5-media-release-plan.json`; `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| 19 | build 是否真正按 allowlist？ | PASS — 2,857 release-plan paths exactly match the 2,857-file dist; product media is copied only through the release-plan copier. | `reports/portfolio/fr-p5/fr-p5-media-release-plan.json`; `docs/portfolio/fr-p5/FR-P5-build-pages-performance-report.md` |
| 20 | dist 是否包含 undeclared image？ | PASS — undeclared-image, extra-path, and unexpected-original counts are zero. | `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| 21 | R1 geometry 是否回归？ | PASS — 545/545 with all four finding classes at zero. | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json`; `docs/portfolio/fr-p5/FR-P5-browser-visual-network-report.md` |
| 22 | Carmela media/audio 是否回归？ | PASS — 12/12, initial media/audio zero, lightbox behavior passed, and Range returned 206. | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json`; `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| 23 | Work Cells on-demand 是否回归？ | PASS — 27/27, one initial Hero, deferred station/manga, zero Work Cells audio and unrelated detail requests. | `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json`; `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json` |
| 24 | audio Range 是否 206？ | PASS — `bytes 0-31/5208122` returned 206 with byte-range support. | `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json` |
| 25 | cache/ETag/Pages MIME 是否验证？ | PASS locally; live repetition is `PENDING_POSTDEPLOY_FINAL_HANDOFF`. | `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json`; `docs/portfolio/fr-p5/FR-P5-build-pages-performance-report.md` |
| 26 | 是否保存 raw browser artifacts？ | PASS — persistent evidence retains compact JSON and 12 reviewed screenshots only; raw HAR/trace/profile/cookies are absent. | `reports/portfolio/fr-p5/fr-p5-route-network-baseline.json`; `reports/portfolio/fr-p5/fr-p5-visual-quality-baseline.json` |
| 27 | 是否错误重新启动版权审查？ | PASS — rights remain pass-by-user-authorization; no new rights gate was introduced. | `docs/portfolio/fr-p5/FR-P5-media-inventory-report.md`; `docs/portfolio/fr-p5/FR-P5-derivative-generation-report.md` |
| 28 | 是否运行了不必要的重复 full gate？ | PASS_BY_GOVERNANCE — development used targeted/affected closure; exactly one final full gate is allocated. | `reports/portfolio/fr-p5/fr-p5-run-manifest.json` |
| 29 | 是否完成 main/Pages/branch/workspace 收尾？ | `PENDING_POSTDEPLOY_FINAL_HANDOFF` — this is the sole unresolved release boundary and is not reported as live PASS. | `reports/portfolio/fr-p5/fr-p5-pages-performance-baseline.json`; `reports/portfolio/fr-p5/fr-p5-run-manifest.json` |
| 30 | quality compromises 是否 0？ | PASS — exactly zero. | `docs/portfolio/fr-p5/FR-P5-quality-policy-acceptance.md`; `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json` |

## Section 23 final status

FR_PORTFOLIO_P5_STATUS: COMPLETE_WITH_DOCUMENTED_LIMITATIONS
GITHUB_REPOSITORY_IDENTITY: VERIFIED_ARCHMAYS_FAMILY_READING_CODEX
GITHUB_VISIBILITY: PUBLIC_UNCHANGED
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PRIVACY_STATUS: PASS
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
LEGACY_P4B_EVIDENCE_CORRECTION: PASS
MEDIA_SOURCE_INVENTORY: PASS
MEDIA_DECODE_STATUS: PASS
MEDIA_DUPLICATE_ANALYSIS: PASS
ENCODER_QUALITY_POLICY: PASS
MEDIA_MANIFEST_STATUS: PASS
MEDIA_POLICY_HASH_STATUS: PASS
MEDIA_DETERMINISM_STATUS: PASS
CARMELA_MEDIA_PARITY: PASS
WORK_CELLS_MEDIA_PARITY: PASS
DERIVATIVE_DECODE_STATUS: PASS
DERIVATIVE_VISUAL_QUALITY: PASS
RESPONSIVE_IMAGE_STATUS: PASS
SRCSET_SELECTION_STATUS: PASS
LIGHTBOX_DETAIL_STATUS: PASS
BUILD_MEDIA_ALLOWLIST: PASS
ORPHAN_MEDIA_COUNT: 0
STALE_MEDIA_COUNT: 0
MISSING_MEDIA_COUNT: 0
UNEXPECTED_ORIGINALS_IN_DIST: 0
DIST_FILES_BEFORE: 1565
DIST_BYTES_BEFORE: 835935148
DIST_FILES_AFTER: 2857
DIST_BYTES_AFTER: 706989895
IMAGE_BYTES_AFTER: 612771379
PAGES_ARTIFACT_STATUS: PASS
PAGES_ARTIFACT_BYTES: 694029530
ROUTE_TRANSFER_BUDGETS: PASS
CACHE_STATUS: PASS
LIGHTHOUSE_STATUS: PASS
CONTINUOUS_GEOMETRY_NON_REGRESSION: PASS
HERO_OVERLAP_FINDINGS: 0
HORIZONTAL_OVERFLOW_FINDINGS: 0
CARMELA_NON_REGRESSION: PASS
WORK_CELLS_NON_REGRESSION: PASS
AUDIO_RANGE_STATUS: PASS
RUNTIME_STALENESS_CHECK: PASS
TEST_STATUS: PASS
FINAL_TEST_COUNT: 201/201
BUILD_STATUS: PASS
PUBLIC_REPOSITORY_VALIDATOR: PASS
DIST_AUDIT_STATUS: PASS
PAGES_STATUS: PENDING_POSTDEPLOY_FINAL_HANDOFF
FINAL_MAIN_SHA: PENDING_POSTDEPLOY_FINAL_HANDOFF
MAIN_CURRENT_TRUTH: PENDING_POSTDEPLOY_FINAL_HANDOFF
WORKSPACE_STATUS: PENDING_POSTDEPLOY_FINAL_HANDOFF
QUALITY_COMPROMISES: 0
NEXT_RECOMMENDED_PHASE: FR-P6 Final Acceptance and Project Seal
