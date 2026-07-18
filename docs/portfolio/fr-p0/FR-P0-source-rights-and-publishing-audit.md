# FR-P0 source, rights, and publishing audit

## Answer first

```text
PRIVACY_STATUS: BLOCKED
RIGHTS_STATUS: BLOCKED
PUBLISH_SURFACE_STATUS: FAIL
```

当前结构性 dist 黑名单检查通过，但公开仓库与 Pages 的权利/隐私边界失败。FR-P0 不得自行改 visibility、移除 source、重写历史、force push、运行 BFG/filter-repo/LFS migrate，因而本分支不能 merge/push。

机器明细见 [`fr-p0-publish-surface.json`](../../../reports/portfolio/fr-p0/fr-p0-publish-surface.json)。

## Exact blockers

### 1. Public Git tracks explicitly private metadata

`origin/main` 当前跟踪：

- `data-private/cells-at-work/animation/animation-resource-inventory.json`
- `data-private/cells-at-work/animation/animation-topic-map.json`
- `data-private/cells-at-work/animation/scene-notes/*.json`

共 27 文件、284,928 Git blob bytes，其中 25 份 scene notes 为 257,430 B。文件自身包含 `sourceAssetsRemainPrivate`、`sceneNotesRemainPrivateUntilExplicitlyReduced` 等策略；测试也只允许 reduced projection。它们不进入 Pages，但公开 Git 仍可下载，故是 active privacy blocker。

### 2. Complete Carmela source remains in public main history

| Event | Commit |
|---|---|
| 加入完整 source | `b26eefa490ce0993b14952e87d436453062032fa` |
| 从当前 tree 停止跟踪 | `1b43993d3084814c6ba7d98bc70cb1930a08d77e` |

两 commit 均是 main/origin main 祖先。该历史 tree 包含：

- 1 PDF，77,238,646 B；
- 12 MP3，85,545,615 B；
- 合计 13 文件，162,784,261 B。

当前 `public/audio/carmela-s1/*.mp3` 与本地 protected source 逐册 SHA-256 全部 byte-identical。

### 3. Carmela full-work derivatives have no recorded authorization

当前公开 Git：

- 320 个 `pages/*.png`，521,728,595 blob bytes；
- 12 个 `public/audio/*.mp3`，85,545,615 blob bytes；
- 69 个 generated PNG，168,923,162 blob bytes。

Pages 当前发布完整 320 页序列和 12 个整册 MP3。仓库没有 Carmela license、authorization、allowed asset classes、restrictions 或 attribution record。不能用“用户把文件放在 source”推断公开发布权。

### 4. OCR processing artifacts are public Git content

当前公开 Git 跟踪 344 个 Carmela `ocr/**` 文件、864,508 blob bytes，包括：

- 12 个 `full-text.txt`，138,807 B；
- 3 个 OCR report 各含一条本机绝对路径。

它们被 build 排除，仍然是公开仓库内容和完整作品处理派生物。

## Protected roots

| Root | Files | Bytes | Classification |
|---|---:|---:|---|
| `source/` | 55 | 6,947,722,345 | original source |
| `data-private/` | 66 | 123,201,360 | private review / OCR / animation |
| `archived/ocr-experiments/` | 14 | 268,243 | archived intermediate |
| `data/cells-at-work/source-assets/` | 108 | 220,317,818 | raw derived originals |
| `public/assets/cells-at-work/pages-by-volume/` | 1,062 | 591,732,034 | unpublished full-page derivatives |
| Carmela `*/ocr/` | 344 | 900,400 working bytes | processing-only derivatives |

Before/after file count、bytes 和 canonical SHA-256 完全一致。没有读取 raw 内容来做无关分析。

## Rights and provenance matrix

| Asset class | Git | Pages | Repository basis | Verification | Result |
|---|---|---|---|---|---|
| Carmela raw PDF/MP3 | public history | raw path no | none | path/hash/history | **BLOCKER** |
| Carmela page PNG | yes | full sequence | none | count/reference only | **BLOCKER** |
| Carmela MP3 | yes | 12 full books | none | byte-identical source copy | **BLOCKER** |
| Carmela OCR | yes | no | none | build exclusion only | **BLOCKER** |
| Carmela companion text | yes | yes | none | schema/content tests | limitation |
| Carmela generated art | yes | yes | no asset-level manifest | existence/reference | limitation |
| Work Cells EPUB/MP4/SRT | no current/reachable source history found | no | recorded user assertion; full works forbidden | extension/path guards | boundary pass, legal limitation |
| Work Cells full-page WebP | yes | no | recorded user assertion | dist exclusion | high limitation |
| Work Cells thumbnails | yes | yes | recorded user assertion | path/existence | limitation |
| Work Cells draft manifest | yes | yes | recorded user assertion | schema/content tests | over-broad authoring payload |
| Work Cells station WebP | yes | yes | user-provided/confirmed docs | 108/108 existence/status | pass with provenance gap |
| Reduced animation refs | yes | yes, summary only | recorded user assertion | no transcript/dialogue fields | pass with review limitation |
| Private animation metadata | yes | no | explicitly private | tests only prove no dist | **BLOCKER** |

`user_confirmed_authorization` 始终只表述为“仓库记录的用户声明”，不升级为法律结论。

## Current Git versus Pages

不要混淆：

- `source/` 当前 ignored 且不进 dist；
- source 的 Carmela 完整作品仍可从 public history 取得；
- `data-private` 不进 dist；
- 其中 27 JSON 仍在 public current tree；
- Work Cells `pages-by-volume` 不进 Pages；
- 1,062 个完整页 WebP 仍在 public current tree；
- Carmela OCR 不进 Pages；
- 344 个 OCR artifacts 仍在 public current tree。

这也是为什么 `npm run audit:dist` PASS 不能解除 blocker。

## Privacy scan

当前 tracked tree 的 token/API-key regex 没有命中。该检查是 bounded current-tree scan，不是完整 secret-history scanner。

发现的本机路径：

- 三个 tracked Carmela OCR reports 各一条相同项目根式绝对路径；
- ignored `docs/work-cells-epub-raw-directory.json` 另有本机路径，但未 tracked。

未保存 browser profile、cookies、tokens、HAR 或 trace。

## `.gitignore` gaps

当前 `.gitignore` 的主要矛盾：

- 它显式重新放行 `data-private/.../*.json`，与文件自身 private policy 冲突。
- 未覆盖 `test-results/`、`playwright-report/`、HAR、trace、browser profile 和 screenshot scratch。
- 未 fail-closed 阻止 PDF、视频、字幕在 `source/` 之外被误跟踪。
- 未忽略 Carmela `ocr/`、`full-text.txt` 和 OCR reports。
- `.gitignore` 无法保护已经 tracked 或历史中的 blob。

P1 必须把 ignore 与 validator 分开：ignore 处理本地便利，validator 处理 current tree、dist、runtime refs 和 rights approval。

## Current publish surface

Current dist：

| Group | Files | Bytes |
|---|---:|---:|
| Carmela books | 414 | 690,908,101 |
| Carmela audio | 12 | 85,545,615 |
| Work Cells manifest | 1 | 2,445,765 |
| Work Cells thumbnails | 991 | 36,531,228 |
| Work Cells stations | 108 | 22,382,190 |
| Page map | 1 | 104,188 |
| App assets | 2 | 63,909 |
| Total | 1,533 | 837,983,345 |

Current build 是 blacklist，不是 allowlist；`audit:dist` 不在 build 或 Pages workflow 中。当前 audit 也没有显式 rights manifest、runtime reachability、orphan/stale asset、JSON output 或 route budget。

## Future exact allowlist

未来 build 应只从 rights-approved runtime references 生成：

```text
.nojekyll
index.html
assets/app.js
assets/styles.css
public/books/index.json
public/books/content-types.json
public/books/不一样的卡梅拉/series.json
public/books/不一样的卡梅拉/<rights-approved-title>/{book-assets.json,companion.json}
public/books/不一样的卡梅拉/<rights-approved-title>/generated/<referenced-file>
public/books/工作细胞/<reduced-runtime-manifest>.json
public/assets/cells-at-work/science-station/<topicId>/<approved-webp>
public/assets/cells-at-work/page-thumbnails/<runtime-referenced-webp>
data/cells-at-work/<reduced-runtime-page-map>.json
```

卡梅拉 `pages/*.png` 和 `public/audio/*.mp3` 只有在权利证据明确记录后才可进入 allowlist。

永不允许：

```text
source/**  source-private/**  private/**  data-private/**
local-epubs/**  **/ocr/**  **/full-text.txt
public/assets/cells-at-work/pages-by-volume/**
data/**/png-originals/**  docs/**  reports/**
*.pdf  *.epub  *.mp4  *.mov  *.m4v  *.webm
*.srt  *.vtt  *.ass  *.ssa
transcripts/**  scene-notes/**  audio-extracts/**
archives  HAR  trace  browser profiles  logs
```

每个 publishable media 建议要求：

```text
assetId, path, sha256, sourceClass, sourceRef,
transformation, rightsBasis, publicApproved,
fullWorkOrExcerpt, attribution, restrictions, runtimeRefs
```

## Safe recovery sequence

1. **Containment decision**：用户单独决定是否临时调整 visibility；P0 不代替决定。
2. **Current-tree containment**：把 private metadata、OCR processing artifacts 和未经授权 full-work derivatives 移出 public current tree；加 validator。
3. **Rights decision**：为 Carmela 和每类 Work Cells media 建立可审计 approval；不能证明的从 allowlist 排除。
4. **Runtime reduction**：生成 reduced Work Cells runtime manifest，不发布 authoring-only fields 和不引用的 991 pages。
5. **History decision**：另开高风险、可回滚任务，用户明确授权后才评估 filter-repo/BFG/force push、fork/clone 通知和 Pages invalidation。
6. **Re-baseline**：重新验证 current tree、history、dist、artifact、live Pages 和 source integrity。

任何一步都不得用删除本地 `source/` 或降低门禁来“通过”。
