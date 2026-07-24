# FR-P5 Browser, Visual and Network Acceptance Report

## Outcome and evidence boundary

`BROWSER_VISUAL_NETWORK_STATUS: PASS_WITH_BOUNDED_ENVIRONMENT_LIMITATIONS`

FR-P5 was exercised as a static paper-book companion under the GitHub Pages project subpath `/Family-Reading-Codex/`. The retained browser evidence covers nine budgeted routes, 18 cold/warm route measurements, exactly 15 responsive-image cases, 545 geometry samples, all 12 Carmela books, all 27 Work Cells topics, two Lighthouse form factors, local HTTP semantics, interaction behavior, and 12 reviewed screenshots.

The repository base commit at capture time was `f68ba73287f293a61600151b1e118b275b7989e1` on `codex/fr-p5-unified-media-pages-performance`. The capture used the current FR-P5 build tree, which also contained uncommitted generated and measurement artifacts; the base commit is therefore not presented as an exact release commit. The exact measurement identity is the policy, manifest, and evidence-file hashes below. This report is local-build evidence only. It makes no live GitHub Pages or live exact-SHA assertion.

The network and geometry harness used Headless Chrome `150.0.0.0` on Windows (`Win32`). Lighthouse used Lighthouse `13.4.1` with the same Headless Chrome `150.0.0.0` browser family. The server root was the local project-subpath endpoint corresponding to `/Family-Reading-Codex/`; no server-only product dependency was introduced.

### Evidence identity

| Evidence | Bytes | SHA-256 |
|---|---:|---|
| `task-scratch/fr-p5/browser-network-srcset.json` | 168,242 | `4363d7dc44fe344cde1a78933270fc1f8038a47809db6fa3ada7289636e8cbb0` |
| `task-scratch/fr-p5/browser-geometry-interactions.json` | 393,630 | `73fe67550a09a95905e026b22cace271283dc45525c3a8d5ed9c18043468164a` |
| `task-scratch/fr-p5/local-http-exact.json` | 9,498 | `521640524a1f99baa3fc3a190d526525e9147432b108dbbfdc0959e72f351892` |
| `task-scratch/fr-p5/screenshot-records.json` | 3,313 | `3eadc2446e9c93f88d4c49451be2b2b567b40ea44eb5297626cc0bd63f12a8b9` |
| `task-scratch/fr-p5/lighthouse-mobile.json` | 969,675 | `32b12494e362844451d788787481c183a6f0cf0f604190eaa680579fe297eb1f` |
| `task-scratch/fr-p5/lighthouse-desktop.json` | 870,586 | `a7c465fc893766c73846f5d4f7b43929272e70c5d382a1bdbf466f2fcbbfad62` |
| `task-scratch/fr-p5/lighthouse-index.json` | 385 | `1aa745b34c2f7fec3fb4cd58f815a1bf0c5aee46a644347f25e3f16d8c1c3413` |
| `task-scratch/fr-p5/visual-review-input.json` | 4,683 | `4ab4b4fff78458cb8e51ca7700017e62d2d7eaba0d0c7ed4e25985100f03f6d2` |
| `public/media/media-manifest.json` | 3,767,069 | `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` |
| `public/media/media-shard-index.json` | 12,527 | `893d7817bf87379133b43a79e97050e5e729104149195f001655aeb37a8e4828` |
| `reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json` | 2,657,664 | `61f7853a87c1142a9f8d3ae2432cf0a2e6074466392e36151a75c8faf11be20e` |
| `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json` | 11,146 | `16e4dbc05c459a001ff0322e22181451de1d6647d3e2f5b55d6a3d5a3c59e269` |

## Manifest and owner-shard strategy

The accepted canonical policy hash was:

`9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`

The canonical manifest contained `778` logical sources, `2,735` variants, and `3,767,069` raw bytes. A repeatable compression measurement with Node `24.16.0` and zlib `1.3.1-e00f703` produced:

| Form | Parameters | Bytes | SHA-256 |
|---|---|---:|---|
| Raw manifest | exact repository bytes | 3,767,069 | `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` |
| Gzip | level 9, deterministic zero modification time | 242,267 | `cb16d543748b5eff24e2f14894254396e48ab322fa28c1141e1590c44dc5c718` |
| Brotli | quality 11, text mode | 192,029 | `3affa9fdcd0738ce5a415be628d250d8f7eb8cfeaeea40bfabb44cdd327ce406` |

The runtime used one `12,527`-byte shard index and `42` owner shards. The index totals of `820` source memberships and `2,898` variant memberships intentionally include media shared by more than one route owner; they do not change the canonical `778` source and `2,735` variant totals.

The browser measured `globalManifestRequests=0`. Each cold route requested exactly one shard index and one owner shard; each warm route requested neither. On the uncompressed local HTTP basis used by `PerformanceResourceTiming`, index plus owner-shard bytes ranged from `22,021` to `267,226`, versus `3,767,069` bytes for a global manifest. That measured route-local byte closure, plus zero global-manifest requests, is the reason the owner-shard strategy beats loading the global manifest on route activation. The gzip and Brotli figures above are recorded separately for deployment-transfer planning and are not substituted for the browser's encoded-body measurements.

## Content parity

The inventory and browser passes reconciled without omissions:

- Carmela: `12/12` books loaded their covers; every book retained `initialMountedMedia=0` and `initialAudioRequests=0`.
- Work Cells: `27/27` topics loaded their Hero; every topic retained `initialMountedMedia=0` and `initialAudioRequests=0`.
- Corrected Work Cells content: `27` topics, `108` stations, `162` questions, and `286` page references, including `hemorrhagic-shock`.
- Media inventory: all `778` referenced logical images and all `3,338` inventoried use-sites were represented by the `778` manifest source records; missing and corrupt referenced images were both `0`.
- Audio: all `12` Carmela audio files remained represented, with initial route audio requests held at `0` and byte-range service verified separately below.

## Nine route records and 18 measurements

The table below contains exactly nine route records. `Cold/budget/headroom` uses encoded body bytes, the frozen pre-measurement route ceiling, and remaining bytes.

| ID | Route | Owner shard and raw bytes | Cold / budget / headroom | Result |
|---|---|---|---:|---|
| R1 | Home — `#/` | `public/media/shards/home.json` — 9,494 | 296,962 / 400,000 / 103,038 | PASS |
| R2 | Carmela series — `#/series/carmela-season-1` | `public/media/shards/carmela-series.json` — 42,193 | 519,775 / 1,100,000 / 580,225 | PASS |
| R3 | Carmela book 1 — `#/book/carmela-s1-01` | `public/media/shards/carmela-book/carmela-s1-01.json` — 157,581 | 434,093 / 500,000 / 65,907 | PASS |
| R4 | Carmela book 11 — `#/book/carmela-s1-11` | `public/media/shards/carmela-book/carmela-s1-11.json` — 254,699 | 525,758 / 600,000 / 74,242 | PASS |
| R5 | Work Cells series — `#/series/work-cells` | `public/media/shards/work-cells-series.json` — 173,926 | 665,365 / 2,600,000 / 1,934,635 | PASS |
| R6 | Food poisoning — `#/science/work-cells/food-poisoning` | `public/media/shards/work-cells-topic/food-poisoning.json` — 66,091 | 416,869 / 900,000 / 483,131 | PASS |
| R7 | Induced pluripotent stem cells — `#/science/work-cells/induced-pluripotent-stem-cells` | `public/media/shards/work-cells-topic/induced-pluripotent-stem-cells.json` — 180,163 | 503,712 / 850,000 / 346,288 | PASS |
| R8 | Cancer cell II — `#/science/work-cells/cancer-cell-ii` | `public/media/shards/work-cells-topic/cancer-cell-ii.json` — 57,082 | 390,288 / 850,000 / 459,712 | PASS |
| R9 | Novel coronavirus — `#/science/work-cells/novel-coronavirus` | `public/media/shards/work-cells-topic/novel-coronavirus.json` — 167,795 | 472,622 / 700,000 / 227,378 | PASS |

R7 was the measured runtime-largest topic route at `503,712` encoded body bytes. All nine cold measurements stayed within the frozen ceilings; no budget was raised after measurement.

The next table contains exactly 18 measurement rows. Byte columns are JSON/image/audio/other/total and use `PerformanceResourceTiming.encodedBodySize`, matching the raw evidence contract. Warm rows contain one cache-served favicon record: `395` encoded bytes, `0` wire bytes, and one cache hit. The selected image `currentSrc` values remained the same derived paths in cold and warm rendering even though warm reactivation did not transfer them.

Every warm SPA reactivation recorded `vitals.lcp=null`: no new `PerformanceObserver` LCP entry was emitted. Warm LCP is therefore recorded truthfully as `NO_NEW_LCP_ENTRY`, no path observed, and `0` new LCP bytes. This is a measured absence, not a synthesized LCP identity.

| ID | Phase | Requests | JSON | Image | Audio | Other | Total | LCP identity | LCP kind | LCP bytes | CLS | Duplicates | Cache hits | Selected `currentSrc` IDs | Index | Owner |
|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---|---:|---:|
| R1 | cold | 15 | 23,208 | 54,721 | 0 | 219,033 | 296,962 | CS2 | RESOURCE | 36,674 | 0.06064966837565104 | 0 | 0 | CS1, CS2 | 1 | 1 |
| R1 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS1, CS2 | 0 | 0 |
| R2 | cold | 26 | 61,613 | 239,129 | 0 | 219,033 | 519,775 | `#/series/carmela-season-1` | TEXT_ELEMENT_IN_DOCUMENT (`H1`) | 2,165 | 0.019851515028211805 | 0 | 0 | CS1, CS3–CS13 | 1 | 1 |
| R2 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS1, CS3–CS13 | 0 | 0 |
| R3 | cold | 17 | 197,013 | 18,047 | 0 | 219,033 | 434,093 | CS1 | RESOURCE | 17,652 | 0.009400126139322916 | 0 | 0 | CS1 | 1 | 1 |
| R3 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.050546875000000005 | 0 | 1 | CS1 | 0 | 0 |
| R4 | cold | 17 | 298,296 | 8,429 | 0 | 219,033 | 525,758 | `#/book/carmela-s1-11` | TEXT_ELEMENT_IN_DOCUMENT (`P`) | 2,165 | 0.009400126139322916 | 0 | 0 | CS12 | 1 | 1 |
| R4 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.050546875000000005 | 0 | 1 | CS12 | 0 | 0 |
| R5 | cold | 21 | 202,367 | 243,965 | 0 | 219,033 | 665,365 | `#/series/work-cells` | TEXT_ELEMENT_IN_DOCUMENT (`H1`) | 2,165 | 0.019851515028211805 | 0 | 0 | CS2, CS14–CS19 | 1 | 1 |
| R5 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS2, CS14–CS19 | 0 | 0 |
| R6 | cold | 16 | 107,071 | 90,765 | 0 | 219,033 | 416,869 | CS20 | RESOURCE | 90,370 | 0.020313178168402776 | 0 | 0 | CS20 | 1 | 1 |
| R6 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS20 | 0 | 0 |
| R7 | cold | 16 | 228,486 | 56,193 | 0 | 219,033 | 503,712 | `#/science/work-cells/induced-pluripotent-stem-cells` | TEXT_ELEMENT_IN_DOCUMENT (`P`) | 2,165 | 0.020313178168402776 | 0 | 0 | CS21 | 1 | 1 |
| R7 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS21 | 0 | 0 |
| R8 | cold | 16 | 100,320 | 70,935 | 0 | 219,033 | 390,288 | `#/science/work-cells/cancer-cell-ii` | TEXT_ELEMENT_IN_DOCUMENT (`P`) | 2,165 | 0.020313178168402776 | 0 | 0 | CS22 | 1 | 1 |
| R8 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS22 | 0 | 0 |
| R9 | cold | 16 | 215,352 | 38,237 | 0 | 219,033 | 472,622 | `#/science/work-cells/novel-coronavirus` | TEXT_ELEMENT_IN_DOCUMENT (`P`) | 2,165 | 0.020313178168402776 | 0 | 0 | CS23 | 1 | 1 |
| R9 | warm | 1 | 0 | 395 | 0 | 0 | 395 | no path observed | NO_NEW_LCP_ENTRY | 0 | 0.03931423611111111 | 0 | 1 | CS23 | 0 | 0 |

All 18 CLS values were at or below `0.1`; the maximum was `0.06064966837565104`.

### Selected derived `currentSrc` dictionary

All paths below share the fixed repository-relative root:

`public/media/derived/9289331de034dddc25a6dc13428712ab/`

| ID | Exact suffix under the fixed root |
|---|---|
| CS1 | `3a/080efe76fce2/001-carmela-cover-240-webp.webp` |
| CS2 | `df/881a1dca817f/pneumococcus__v01_page-006-work-cells-page-240-webp.webp` |
| CS3 | `0f/ae2543be6a8d/001-carmela-cover-240-webp.webp` |
| CS4 | `72/91d2467d3ae8/001-carmela-cover-240-webp.webp` |
| CS5 | `e4/1c7b81ec39f2/001-carmela-cover-240-webp.webp` |
| CS6 | `f1/22f1a6af0a3b/001-carmela-cover-240-webp.webp` |
| CS7 | `bc/37d77438cb73/001-carmela-cover-240-webp.webp` |
| CS8 | `53/b1d4807a77e8/001-carmela-cover-240-webp.webp` |
| CS9 | `91/0873712397ff/001-carmela-cover-240-webp.webp` |
| CS10 | `f9/c0857d8ff983/001-carmela-cover-240-webp.webp` |
| CS11 | `8c/a47fc167000c/001-carmela-cover-240-webp.webp` |
| CS12 | `fa/cf1d660ab18b/001-carmela-cover-240-webp.webp` |
| CS13 | `50/ec1bf4ae6c8e/001-carmela-cover-240-webp.webp` |
| CS14 | `a5/68cb28f97e36/cedar-pollen-allergy__v01_page-063-work-cells-page-240-webp.webp` |
| CS15 | `e1/7d98cafd83a1/influenza__v01_page-105-work-cells-page-240-webp.webp` |
| CS16 | `42/26b3b6f21aae/abrasion__v01_page-139-work-cells-page-240-webp.webp` |
| CS17 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-240-webp.webp` |
| CS18 | `0f/db850c836334/helicobacter-pylori__v05_page-005-work-cells-page-240-webp.webp` |
| CS19 | `64/5afe06dfc98e/heatstroke__v02_page-033-work-cells-page-240-webp.webp` |
| CS20 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-360-webp.webp` |
| CS21 | `79/ef88b9d9b567/ips-cells__v06_page-057-work-cells-page-360-webp.webp` |
| CS22 | `57/972a2fdb67e4/cancer-cell-ii__v05_page-143-work-cells-page-360-webp.webp` |
| CS23 | `67/3ecaa381937a/covid-19__v06_page-126-work-cells-page-360-webp.webp` |

### Route invariants

The complete route set produced:

```text
originalSelections=0
globalManifestRequests=0
expectedShardIndexRequests=9
unexpectedShardIndexRequests=0
unexpectedUpscaling=0
duplicateDownloads=0
requestFailures=0
consoleErrors=0
horizontalOverflow=0
```

The Work Cells topic initial-request boundary was exactly `hero=1`, `station=0`, `manga=0`, `audio=0`, `other-topic-details=0`, `Carmela-details=0`, `old-manifest=0`, and `page-map=0`. The Hero was the only selected image on each measured topic route. The current topic owner shard was the only topic-detail shard. Carmela detail disclosure media and audio remained `0` on initial render across all 12 books.

The intentional `404` probe, intentional conditional `304` cancellation, and one injected `503` retry probe were classified separately as expected test diagnostics. The zero failure/error invariants above refer to unexpected route behavior.

## Exactly 15 responsive-image cases

The matrix below contains exactly the required 15 cases: `390@1/2`, `430@1/2`, `768@1/2`, `1024@1/2`, `1280@1/1.5/2`, `1440@1/2`, `1088@2`, and `1089@2`. All selected paths share the same fixed derived root declared above. Every case used a cold `NETWORK_MISS`, transferred exactly one candidate, selected no original, used the measured `OBJECT_FIT_CONTENT_BOX`, had no horizontal overflow, and kept its upscaling ratio at or below `1.01`.

| Case | Viewport @ DPR | `currentSrc` suffix / profile / variant | Natural W×H | Rendered content W×H | Basis | Resource / transfer bytes | Cache | Required px W | Upscale ratio | Candidates | Originals | CLS | Overflow |
|---|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---|
| SC1 | 390×844 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-360-webp.webp` / `work-cells-page-360-webp` / 360×512 | 343×488 | 321.881×457.953 | OBJECT_FIT_CONTENT_BOX | 90,370 / 90,670 | NETWORK_MISS | 321.881 | 0.8941 | 1 | 0 | 0.05173217063295973 | PASS |
| SC2 | 390×844 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-960-webp.webp` / `work-cells-page-960-webp` / 960×1,364 | 343×487 | 322.000×457.184 | OBJECT_FIT_CONTENT_BOX | 501,148 / 501,448 | NETWORK_MISS | 644.000 | 0.6708 | 1 | 0 | 0.05173217063295973 | PASS |
| SC3 | 430×932 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 378×537 | 361.909×514.141 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 361.909 | 0.5655 | 1 | 0 | 0.057581085141557214 | PASS |
| SC4 | 430×932 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-960-webp.webp` / `work-cells-page-960-webp` / 960×1,364 | 378×537 | 362.000×514.270 | OBJECT_FIT_CONTENT_BOX | 501,148 / 501,448 | NETWORK_MISS | 724.000 | 0.7542 | 1 | 0 | 0.057581085141557214 | PASS |
| SC5 | 768×1024 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 448×636 | 446.000×633.161 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 446.000 | 0.6969 | 1 | 0 | 0.05867481231689453 | PASS |
| SC6 | 768×1024 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-960-webp.webp` / `work-cells-page-960-webp` / 960×1,364 | 448×636 | 446.000×633.161 | OBJECT_FIT_CONTENT_BOX | 501,148 / 501,448 | NETWORK_MISS | 892.000 | 0.9292 | 1 | 0 | 0.05867481231689453 | PASS |
| SC7 | 1024×768 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 448×636 | 446.000×633.161 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 446.000 | 0.6969 | 1 | 0 | 0.030527432759602867 | PASS |
| SC8 | 1024×768 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-960-webp.webp` / `work-cells-page-960-webp` / 960×1,364 | 448×636 | 446.000×633.161 | OBJECT_FIT_CONTENT_BOX | 501,148 / 501,448 | NETWORK_MISS | 892.000 | 0.9292 | 1 | 0 | 0.030527432759602867 | PASS |
| SC9 | 1280×720 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-360-webp.webp` / `work-cells-page-360-webp` / 360×512 | 320×455 | 318.000×452.156 | OBJECT_FIT_CONTENT_BOX | 90,370 / 90,670 | NETWORK_MISS | 318.000 | 0.8833 | 1 | 0 | 0.020313178168402776 | PASS |
| SC10 | 1280×720 @ 1.5 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 320×454 | 318.000×451.162 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 477.000 | 0.7453 | 1 | 0 | 0.020313178168402776 | PASS |
| SC11 | 1280×720 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 320×454 | 318.000×451.162 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 636.000 | 0.9938 | 1 | 0 | 0.020313178168402776 | PASS |
| SC12 | 1440×900 @ 1 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-360-webp.webp` / `work-cells-page-360-webp` / 360×512 | 320×455 | 318.000×452.156 | OBJECT_FIT_CONTENT_BOX | 90,370 / 90,670 | NETWORK_MISS | 318.000 | 0.8833 | 1 | 0 | 0.03193827160493827 | PASS |
| SC13 | 1440×900 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 320×454 | 318.000×451.162 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 636.000 | 0.9938 | 1 | 0 | 0.03193827160493827 | PASS |
| SC14 | 1088×400 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-960-webp.webp` / `work-cells-page-960-webp` / 960×1,364 | 448×636 | 446.000×633.161 | OBJECT_FIT_CONTENT_BOX | 501,148 / 501,448 | NETWORK_MISS | 892.000 | 0.9292 | 1 | 0 | 0.0031066176470588235 | PASS |
| SC15 | 1089×400 @ 2 | `50/bd020737a455/food-poisoning__v02_page-004-work-cells-page-640-webp.webp` / `work-cells-page-640-webp` / 640×909 | 320×454 | 238.000×337.662 | OBJECT_FIT_CONTENT_BOX | 252,206 / 252,506 | NETWORK_MISS | 476.000 | 0.7438 | 1 | 0 | 0.00310376492194674 | PASS |

`SRCSET_CASES: 15`

`SRCSET_STATUS: PASS_15_OF_15`

## Continuous geometry

The geometry harness passed `545/545` samples:

| Family | Samples | Construction | Result |
|---|---:|---|---|
| Continuous width | 469 | 67 widths spanning 320–1440 across seven dense-content topic routes | PASS |
| Named viewport | 14 | desktop, tablet, mobile, short-landscape, and breakpoint cases | PASS |
| Topic endpoint | 54 | all 27 topics at both 390×844 and 1280×720 | PASS |
| Zoom equivalent | 8 | 80%, 90%, 100%, 110%, 125%, 150%, 175%, and 200% CSS-pixel equivalents | PASS |
| Total | 545 | exact sum | PASS |

The seven continuous-width topics were `food-poisoning`, `cancer-cell-ii`, `novel-coronavirus`, `hemorrhagic-shock`, `erythroblast-and-myelocyte`, `left-shift-of-white-blood-cells`, and `induced-pluripotent-stem-cells`.

The 67-point sweep included all 45 dense widths from 680 through 1120:

```text
680, 696, 704, 712, 728, 736, 744, 760, 768, 776, 792, 800, 808,
824, 832, 840, 856, 864, 872, 888, 896, 904, 920, 928, 936, 952,
960, 968, 984, 992, 1000, 1016, 1024, 1032, 1048, 1056, 1064,
1080, 1087, 1088, 1089, 1090, 1096, 1112, 1120
```

The 14 named viewports were `773×709`, `1024×400`, `900×500`, `844×390`, `800×450`, `768×1024`, `667×375`, `430×932`, `390×844`, `1280×720`, `1440×900`, `1088×400`, `1089×400`, and `1089×481`. The breakpoint changed from single-column at `1088×400` to dual-column at `1089×400`; both passed. The `773×709` boundary also passed.

The zoom-equivalent viewport/scale pairs were `966×886/80%`, `859×788/90%`, `773×709/100%`, `703×645/110%`, `618×567/125%`, `515×473/150%`, `442×405/175%`, and `387×355/200%`. These are responsive CSS-pixel equivalents, not native browser-zoom measurements.

```text
geometrySamples=545
geometryFailures=0
heroOverlap=0
horizontalOverflow=0
clippedText=0
brokenMedia=0
```

## Visual-quality review

Exactly 12 repository screenshots were retained and reviewed. Their total was `498,614` bytes. All 12 SHA-256 values were distinct, proving the retained screenshot bytes were unique. Every role had exactly two samples:

| Role | Files | Bytes |
|---|---:|---:|
| cover | 2 | 45,802 |
| hero | 2 | 120,108 |
| explanation | 2 | 161,358 |
| preview | 2 | 9,662 |
| lightbox | 2 | 151,276 |
| text-heavy manga | 2 | 10,408 |
| Total | 12 | 498,614 |

| ID | Role | Repository-relative path | Route | Viewport | Bytes | SHA-256 | Review |
|---|---|---|---|---:|---:|---|---|
| SS1 | cover | `docs/portfolio/fr-p5/screenshots/cover-carmela-series.webp` | `#/` | 1280×820 | 19,210 | `933e94b8d94d4380769f4cbd7d3a606f5477eb2d705fa6a76c9e78e064b90477` | PASS |
| SS2 | cover | `docs/portfolio/fr-p5/screenshots/cover-work-cells-series.webp` | `#/` | 1280×820 | 26,592 | `29be122487304fedf6dfae67e27fea822c2d6582c32e9f04694ecba356f2cdb2` | PASS |
| SS3 | hero | `docs/portfolio/fr-p5/screenshots/hero-carmela-book-01.webp` | `#/book/carmela-s1-01` | 1280×820 | 34,388 | `8901806f7111d844db529b06fe7216a827d668eabf2439b2220e8e97217e8d64` | PASS |
| SS4 | explanation | `docs/portfolio/fr-p5/screenshots/explanation-carmela-book-01.webp` | `#/book/carmela-s1-01` | 1280×820 | 73,692 | `278132f5e7332ba52d6df1c5f8e9ceec49376121093ae56ff55dc9757ac0eb13` | PASS |
| SS5 | preview | `docs/portfolio/fr-p5/screenshots/preview-carmela-page-01.webp` | `#/book/carmela-s1-01` | 1280×820 | 5,038 | `32b305b894ae49c14484967aa78757948e72d40683ba6e6b891611781e46445a` | PASS |
| SS6 | lightbox | `docs/portfolio/fr-p5/screenshots/lightbox-carmela-page-01.webp` | `#/book/carmela-s1-01` | 1280×820 | 75,758 | `4c12e902f0b2633fb64067e9566310b61bea1db1abcda5ec0c4bdabdd66926c8` | PASS |
| SS7 | explanation | `docs/portfolio/fr-p5/screenshots/explanation-carmela-book-11.webp` | `#/book/carmela-s1-11` | 1280×820 | 87,666 | `48db90a6d013f933476e6317fe52315a771ed9c9a6f56241f58a14cb04481076` | PASS |
| SS8 | hero | `docs/portfolio/fr-p5/screenshots/hero-work-cells-food-poisoning.webp` | `#/science/work-cells/food-poisoning` | 1280×820 | 85,720 | `83761ad69469734733e48abb0e143039d0847fb187436ca9cac9dcd4c7e6363a` | PASS |
| SS9 | preview | `docs/portfolio/fr-p5/screenshots/preview-work-cells-station.webp` | `#/science/work-cells/food-poisoning` | 1280×820 | 4,624 | `1560d2573cb99b6758efca38e4877d1afc8ce9550fe580f57af68351f303d1e5` | PASS |
| SS10 | lightbox | `docs/portfolio/fr-p5/screenshots/lightbox-work-cells-station.webp` | `#/science/work-cells/food-poisoning` | 1280×820 | 75,518 | `0eacaf2465a4960540b82fb8af40533e6f5bbdc34e2318b81b28274730d4f0c2` | PASS |
| SS11 | text-heavy manga | `docs/portfolio/fr-p5/screenshots/text-heavy-manga-food-poisoning.webp` | `#/science/work-cells/food-poisoning` | 1280×820 | 6,144 | `520c3bf2b1cec3714a14e4a03903685ddaf326f1cad6769227206c317a09f776` | PASS |
| SS12 | text-heavy manga | `docs/portfolio/fr-p5/screenshots/text-heavy-manga-novel-coronavirus.webp` | `#/science/work-cells/novel-coronavirus` | 1280×820 | 4,264 | `cf6b45eecf0995fa06cb17707f186910f24ad70aa832d04e354e1d32e4412cd0` | PASS |

The visual review recorded PASS for text readability, crop, rotation, color, line edges, blur/upscale control, lightbox clarity, and stable layout. Alpha handling was `PASS_NOT_APPLICABLE_TO_CURRENT_SOURCES`: the canonical inventory contained zero referenced alpha sources, so no unrelated alpha-edge claim was substituted.

## Interaction and accessibility

### Disclosure, previews, lightboxes, grouping, and cleanup

Both Carmela and Work Cells began with `mountedMedia=0` and no idle lightbox candidates. Opening the first disclosure mounted a preview; opening the preview selected a distinct lightbox tier:

| Flow | Preview `currentSrc` suffix | Preview natural/rendered width | Lightbox `currentSrc` suffix | Lightbox natural/rendered content | DPR / required px / ratio |
|---|---|---|---|---|---|
| Carmela | `fe/40aad317b759/004-carmela-page-480-webp.webp` | 160 / 91.71875 | `fe/40aad317b759/004-carmela-lightbox-1600-webp.webp` | 720×487 / 720×487 | 1 / 720 / 1.0000 |
| Work Cells | `4b/bcaa9b8ea3bf/food-poisoning-v2-station-01-work-cells-station-640-webp.webp` | 160 / 99 | `4b/bcaa9b8ea3bf/food-poisoning-v2-station-01-work-cells-lightbox-1440-webp.webp` | 720×540 / 360×270 | 2 / 720 / 1.0000 |

Each lightbox had exactly one active source candidate, `aria-busy=false`, and focus on its close control. Escape closed both flows, removed all image and source candidates, hid the dialog, and restored focus to the opener.

The grouped Carmela lightbox found exactly one de-duplicated group, `media-group-carmela-s1-01-scene-sea-01`, of size `2`. Keyboard `ArrowRight` moved from:

- `fe/40aad317b759/004-carmela-lightbox-1600-webp.webp`, captioned as image 1 of 2; to
- `73/d47ed8ef14cd/005-carmela-lightbox-1600-webp.webp`, captioned as image 2 of 2.

The two sources and `currentSrc` values differed, focus stayed inside the dialog, Escape closed it, and focus returned to the originating control. The combination of empty initial candidates on each navigated route and zero candidates after closure also verified route cleanup without retaining stale detail media.

One route-shard failure was deliberately injected. The error state became visible, the retry control was used, and recovery succeeded: `injectedFailures=1`, `errorVisible=true`, `retryRecovered=true`.

### Keyboard and semantic checks

All seven recorded accessibility interaction checks passed:

- Skip link: Shift+Tab exposed the `#main-content` link; Enter moved focus to the route `H1` near the viewport top.
- Route focus: the route heading used `tabindex=-1`; section routing focused the target heading and set `aria-current=location`; the breadcrumb current text remained correct.
- Answer disclosure: keyboard Space changed `aria-expanded` from `false` to `true` and back to `false`, kept focus on the button, changed the label, and synchronized the labelled answer region's hidden state.
- Group navigation: keyboard ArrowRight advanced the two-item lightbox group, and Escape closed it with focus restoration.
- Text spacing: line height `1.5`, letter spacing `0.12em`, word spacing `0.16em`, and paragraph spacing `2em` produced no overflow or clipped text at 390×844.
- Reflow: the 200% CSS-pixel equivalent at 320×640 stayed single-column with no overflow, clipping, Hero collision, broken media, or sub-44-pixel controls.
- Short landscape: 667×375 and 1089×400 both passed; the latter correctly used dual-column mode.

Reduced-motion, forced-colors, and print modes each passed the automated mode checks. Audio accessibility and transport passed through the `206` Range response described below. No external screen reader was available, so this report does not claim an external-screen-reader pass.

## Local project-subpath HTTP

The exact local HTTP check passed for `/Family-Reading-Codex/`.

- Canonical manifest: HTTP `200`, `application/json; charset=utf-8`, `3,767,069` bytes, SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8`.
- Shard index: HTTP `200`, `application/json; charset=utf-8`, `12,527` bytes, SHA-256 `893d7817bf87379133b43a79e97050e5e729104149195f001655aeb37a8e4828`, bound to the same canonical manifest SHA-256.
- Route integrity: all nine route records returned the index and their exact owner shard as HTTP `200` JSON.

Representative derivative checks were:

| Path | MIME | Bytes | SHA-256 |
|---|---|---:|---|
| `public/media/derived/9289331de034dddc25a6dc13428712ab/fa/cf1d660ab18b/001-carmela-cover-480-webp.webp` | `image/webp` | 22,290 | `51bb8bc8e1a343702a00d907d0c292b15976ccf9b4181e487c1a1fa8914f8647` |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/88/dc462f21b856/bandit-baba-story-carmela-explanation-1280-webp.webp` | `image/webp` | 198,344 | `d5e927212d72d51da9c97de98594c4e636e9100f247f24e85bdf5353fec3ff25` |
| `public/media/derived/9289331de034dddc25a6dc13428712ab/71/61011a200e4b/abrasion__v01_page-142-work-cells-lightbox-1440-webp.webp` | `image/webp` | 815,166 | `de3ae7fe3f13045521baddc24952e21db5fefc86f4d80624743bdde536e4495c` |

The first derivative returned the concrete ETag `"51bb8bc8e1a343702a00d907d0c292b15976ccf9b4181e487c1a1fa8914f8647"` and a matching conditional request returned `304`. A missing derivative returned `404`.

`public/audio/carmela-s1/carmela-s1-01.mp3` returned HTTP `206`, `Accept-Ranges: bytes`, `Content-Range: bytes 0-31/5208122`, and exactly `32` response bytes.

All three sampled derived responses used `Cache-Control: public, max-age=31536000, immutable`; cache violations were `0`. Two path-addressing checks proved that both a source change and a policy change produce a new derived path; unchanged-path violations were `0`. Service-worker registrations were `0`, and exposed private-state entries were `0`.

## Lighthouse

The retained Lighthouse index classified two complete JSON runs as PASS. Both used `#/science/work-cells/food-poisoning`.

| Form factor | Capture time | Performance | Accessibility | Best practices | SEO | `runtimeError` |
|---|---|---:|---:|---:|---:|---|
| Mobile | 2026-07-24T06:08:40.578Z | 82 | 100 | 100 | 100 | absent |
| Desktop | 2026-07-24T06:09:06.651Z | 100 | 100 | 100 | 100 | absent |

The 0–100 category scores above are the Lighthouse category results. Supporting metric values were:

| Form factor | FCP ms | LCP ms | TBT ms | CLS | Speed Index ms | Interactive ms |
|---|---:|---:|---:|---:|---:|---:|
| Mobile | 2,108.405625 | 4,506.7245 | 87.50000000000011 | 0.05017834759769624 | 2,108.405625 | 4,506.7245 |
| Desktop | 451.270375 | 778.0326 | 12.5 | 0.03783742728504264 | 473.12138841613245 | 778.0326 |

There was one bounded environment limitation on each of the two retained commands: after Lighthouse had written a complete, parseable JSON report, its Windows temporary-browser-profile cleanup returned `EPERM`, causing the CLI process to exit `1`. The error occurred after report production, both reports had no `runtimeError`, and it does not alter the recorded audit scores. This report records that cleanup-phase limitation explicitly rather than reclassifying the CLI exits as clean command exits. The route-transfer ceilings, cache behavior, responsive-image matrix, and continuous-geometry results remain the primary hard browser budgets.

## Limitations and evidence hygiene

- Native browser zoom was unavailable. The eight zoom checks were responsive CSS-pixel equivalents only; no native-zoom PASS is claimed.
- Physical phones and tablets were unavailable. Viewport and DPR coverage used browser emulation; no physical-device PASS is claimed.
- An external screen reader was unavailable. Keyboard, focus, ARIA, forced-colors, text-spacing, reflow, print, audio, and Lighthouse accessibility evidence passed, but no external-screen-reader PASS is claimed.
- Both retained Lighthouse commands had the bounded post-report Windows `EPERM` cleanup limitation documented above.
- The browser capture explicitly retained no raw HAR, trace, or browser profile. A retention scan found no HAR, trace, profile, or cookie artifact. Screenshot retention was exactly `12` files and `498,614` bytes.
- Service-worker registrations were `0`; local storage, session storage, and IndexedDB entries were all `0` in the browser interaction evidence.
- All routes, hashes, and paths in this report are repository-relative or project-subpath identities. No local absolute filesystem path is present.
- This report does not assert a live Pages deployment. Live exact-SHA verification belongs to the separate build/Pages evidence after deployment.

```text
ROUTE_RECORDS: 9
ROUTE_MEASUREMENTS: 18
SRCSET_CASES: 15
GEOMETRY_SAMPLES: 545
GEOMETRY_FAILURES: 0
CARMELA_PARITY: 12/12
WORK_CELLS_PARITY: 27/27
SCREENSHOTS: 12
SCREENSHOT_BYTES: 498614
LIGHTHOUSE_RUNS: 2
GLOBAL_MANIFEST_REQUESTS: 0
QUALITY_COMPROMISES: 0
BROWSER_VISUAL_NETWORK_STATUS: PASS_WITH_BOUNDED_ENVIRONMENT_LIMITATIONS
```
