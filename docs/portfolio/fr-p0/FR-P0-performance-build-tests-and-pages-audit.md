# FR-P0 performance, build, tests, and Pages audit

## Answer first

当前 build/tests 能稳定产出静态 Pages，但发布体系不是 fail-closed：

- 所有 route 首次 render 前加载 28 JSON、2,807,138 raw bytes；
- dist 是 799.16 MiB，Actions 每次整包复制和上传；
- build/workflow 不运行 `audit:dist`；
- audit 是黑名单 + 900 MiB 总量，不是 rights-aware allowlist；
- 本地 Node 24 与 workflow Node 22 不同；
- 没有自动 browser/accessibility/route performance/live Pages tests。

本地 acceptance 已通过；rights/privacy blocker 与性能问题不得混成同一个状态。

## Build baseline

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | 40/40 tests；生成 1,533 files |
| Build duration | 2.487 s | 本地 acceptance retry |
| `npm run audit:dist` | PASS | 837,983,345 B / 799.16 MiB |
| Dist audit duration | 0.574 s | 本地 |
| Source/PDF/EPUB/OCR/animation forbidden scan | PASS in dist | audit output |
| Node | local 24.16.0 | workflow 22 |

两个较早重试不算 acceptance：

- sandbox 首次执行因 `spawn EPERM` 失败；
- storage read-only scan 与 build 删除 dist 同时发生，触发一个 WebP `EBUSY`；
- 释放读锁后的一次正式 build PASS。

这两个是环境/并发现象，没有通过禁用 test 或降低门禁隐藏。

## Build behavior

`scripts/build.mjs`：

1. 先运行 tests；
2. tests PASS 后删除并重建 dist；
3. 复制 12 册 Carmela runtime content、全部 public audio；
4. 复制 Work Cells draft manifest、page map、thumbnails 和 station WebP；
5. 写 `.nojekyll`。

优点：

- tests 失败时旧 dist 保留；
- root/basename guard 限制输出路径；
- 当前排除 source、OCR、raw formats 和 full Work Cells page directory。

风险：

- copy 中途失败会留下半成品 dist；
- directory blacklist 是大小写敏感 exact name；
- 没有 generated manifest、atomic swap、content hash 或 orphan check；
- 当前 Carmela pages/audio 虽通过技术规则，rights 仍失败。

## Test responsibilities

| File | Direct tests | Responsibility |
|---|---:|---|
| `tests/mvp.test.mjs` | 32 | product boundaries、IA/UI copy、Carmela、Work Cells、rights text、media、source/build/Pages source assertions |
| `tests/work-cells-epub-import.test.mjs` | 4 | ZIP/OPF/spine/nav、no-EPUB、multi-part、page-map/manual review |
| `tests/work-cells-visual-annotations.test.mjs` | 4 | merge、27 topics/991 pages、frontend exposure、prompt docs |

`mvp.test.mjs` 导入另两文件，所以 `npm test` 是 40。若未来直接 glob 三文件，导入 suite 会重复为 48。

当前效率问题：

- Work Cells 2.45 MB manifest 在链内至少重复 parse 12 次；
- `publishedBookRecords()` 在 5 tests 重读 series + 24 per-book JSON；
- 991 annotations 触发超过 5,100 次同步 exists check；
- `npm test` 后再 `npm run build` 会重复完整 40 tests。

当前覆盖缺口：

- build/audit 只做 source regex，缺 fixture-driven behavior test；
- 无 browser、keyboard、axe、visual regression；
- 无 route network/Lighthouse；
- 无 live Pages smoke；
- 无 rights approval/allowlist fixture。

未来职责拆分建议：

```text
product-boundaries.test.mjs
content-index-schema.test.mjs
carmela-content.test.mjs
work-cells-content.test.mjs
media-integrity.test.mjs
source-boundary.test.mjs
publish-surface.test.mjs
build.test.mjs
browser-smoke/
accessibility-visual/
```

P0 不执行拆分。P1 先把 source/publish safety 独立为 fail-closed tests，再优化共享 manifest/book cache。

## Startup and route payload

Startup chain：

```text
index.json
→ Carmela series.json
→ 24 Carmela per-book JSON
→ Work Cells draft-manifest.json
→ Work Cells page-map.json
→ first render
```

| Resource class | Requests | Raw bytes |
|---|---:|---:|
| JSON | 28 | 2,807,138 |
| JS | 1 | 46,477 |
| CSS | 1 | 17,432 |

任何首页、Carmela 或 Work Cells direct route 都等待另一领域数据。首页失败一个无关 per-book companion JSON 也会阻塞全站，这应在 P4 通过 route-scoped fetch 和 per-domain fallback 修复。

Referenced raw bytes：

| Route | Total | Images | Notes |
|---|---:|---:|---|
| Home | 3,555,294 | 684,247 | 2 entry images |
| Carmela series | 17,546,127 | 14,675,080 | 12 original covers |
| Carmela book 1 | 45,643,353 | 42,772,306 | audio capability omitted |
| Work Cells series | 3,867,287 | 996,240 | 27 thumbnails |
| Heavy topic | 4,089,265 | 1,218,218 | 12 observed unique images |

该表是 DOM/reference inventory 对应的本地 raw bytes，不是 HAR transfer。详细字段、DOM 和 viewports 在 [`fr-p0-route-performance-baseline.json`](../../../reports/portfolio/fr-p0/fr-p0-route-performance-baseline.json)。

## Media

主要瓶颈：

- 12 cover 原图 14,675,080 B，全部进入 series route references。
- `carmela-s1-11` 约 120 image elements、53 unique assets、73,675,601 raw bytes。
- book 页底部折叠区 4 图没有 `loading=lazy`；最重一册四图约 10,175,201 B。
- 无 `srcset/sizes`、thumbnail/detail 分级、width/height、decoding 或 fetchpriority。
- `<audio preload=metadata>` 可用，但真实 range bytes 未测。
- manifest 991 annotations 和 authoring fields 远大于 runtime 所需。
- 文件名无 content hash，cache invalidation 粗。

不要通过删除 source 或未经批准转换原始资产伪造性能提升。未来顺序应是 rights/allowlist → route scoping → responsive derivatives → cache/versioning。

## Recommended future gates

下列是 proposed gates，不是当前通过条件：

| Gate | Proposed |
|---|---:|
| Initial JSON requests | ≤ 6 |
| Initial JSON raw bytes | ≤ 200,000 |
| Home initial referenced bytes | ≤ 750,000 |
| Series initial image raw bytes | ≤ 1,500,000 |
| Detail initial image raw bytes | ≤ 1,500,000 |
| Dist warning | 500 MiB |
| Dist fail | 600 MiB |
| Route interactive elements | ≤ 80 |

最终 transfer budgets 必须用 cold-cache compressed telemetry；raw references 和 transfer 是两套门禁。

## Pages

Workflow：

- trigger：main push / workflow_dispatch；
- Node 22；
- `npm run build`；
- configure Pages；
- upload `dist`；
- deploy。

当前远端：

| Item | Fact |
|---|---|
| URL | `https://archmays.github.io/Family-Reading/` |
| Source | main `/` via workflow |
| HTTPS | enforced |
| Latest run | `27912960467` |
| Latest run SHA | `9c74e3f26a84ff9d82cb7e664c0314ed87998ef6` |
| Result / duration | success / 122 s |
| Build / deploy jobs | 81 s / 31 s |
| Last 10 | all success；median 122.5 s |
| Latest failure | `27655288886`, Configure Pages |
| Artifact | `7777926862`, 828,688,767 B, expired |

Artifact 比 local dist 小 9,294,578 B（1.1092%），但 artifact 是上传归档 metadata，不能当成 raw directory diff；过期后无法下载文件级比较。

## Browser and live QA

Local representative routes 已验证：

- direct hash reload；
- home、两 series、Carmela book、heavy science topic；
- answer toggle；
- lightbox focus/Escape；
- native audio metadata；
- invalid routes；
- quick-nav、back；
- desktop、mobile、tablet、short landscape；
- console errors 0。

Current live Pages：

- in-app browser 成功加载当前 main 首页；
- title 正确；
- H1 为“选择阅读主题”；
- Carmela 与 Work Cells 两入口均存在；
- GitHub Pages API 与 run metadata 对应 current main。

Shell HEAD probe 在本机 TLS 层失败，未把该环境错误写成站点 404。任务分支未 push，故没有“本任务 commit 的 Pages run”；这是 blocker 导致的正确停止，不是 connector limitation。

## Accessibility and visual performance limitations

没有可用的 Resource Timing / Web Vitals / HAR / throttle；因此没有编造 Lighthouse 分数。以下仅由静态/响应式证据支持：

- no reduced-motion rule；
- no forced-colors rule；
- no print rule；
- 200% zoom 未真实仿真；
- all images lack dimensions；
- 1024×400 sticky sidebar fail；
- lightbox focus return fail；
- color contrast estimates need axe confirmation。

P6 最终验收必须在 rights-cleared build 上运行：

- Lighthouse mobile/desktop；
- axe；
- keyboard/focus script；
- forced-colors/reduced-motion/print；
- Fast 3G/CPU；
- route waterfall；
- Pages MIME/cache/404/audio range；
- visual comparisons。
