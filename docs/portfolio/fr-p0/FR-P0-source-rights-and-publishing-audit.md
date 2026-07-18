# FR-P0 source, rights, and publishing audit

## Answer first

```text
PRIVACY_STATUS: PASS
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
PUBLISH_SURFACE_STATUS: PASS
```

原 P0 的结构性 dist 黑名单检查通过，但按旧规则把公开仓库与 Pages 的 rights/privacy 边界合并为失败。P0R1 已撤销 rights blocker，以 index-only 隔离处理真实 privacy/processing 问题，并通过 Node 22 validator/build/dist acceptance；Pages workflow 在 upload 前调用同一 fail-closed chain。本任务仍不改 visibility、不移除 source、不重写历史、不 force push，也不运行 BFG/filter-repo/LFS migrate。

机器明细见 [`fr-p0-publish-surface.json`](../../../reports/portfolio/fr-p0/fr-p0-publish-surface.json)。

## Original blockers and corrected disposition

### 1. Original P0 public Git tracked explicitly private metadata

原 P0 `origin/main` 跟踪：

- `data-private/cells-at-work/animation/animation-resource-inventory.json`
- `data-private/cells-at-work/animation/animation-topic-map.json`
- `data-private/cells-at-work/animation/scene-notes/*.json`

共 27 文件、284,928 Git blob bytes，其中 25 份 scene notes 为 257,430 B。文件自身包含 `sourceAssetsRemainPrivate`、`sceneNotesRemainPrivateUntilExplicitlyReduced` 等策略；测试也只允许 reduced projection。它们不进入 Pages，但原公开 Git 仍可下载，故当时是 active privacy blocker；P0R1 已从 index 取消跟踪。

### 2. Complete Carmela source remains in public main history — engineering evidence, not a rights blocker

| Event | Commit |
|---|---|
| 加入完整 source | `b26eefa490ce0993b14952e87d436453062032fa` |
| 从当前 tree 停止跟踪 | `1b43993d3084814c6ba7d98bc70cb1930a08d77e` |

两 commit 均是 main/origin main 祖先。该历史 tree 包含：

- 1 PDF，77,238,646 B；
- 12 MP3，85,545,615 B；
- 合计 13 文件，162,784,261 B。

当前 `public/audio/carmela-s1/*.mp3` 与本地 protected source 逐册 SHA-256 全部 byte-identical。

这些 history 与 byte-identity 事实完整保留，用于仓库体积、clone 性能和维护成本分析。用户全局授权已经覆盖历史 full-work blob；本任务不因 rights 重写历史。

### 3. Carmela full-work derivatives — authorized for all project uses

当前公开 Git：

- 320 个 `pages/*.png`，521,728,595 blob bytes；
- 12 个 `public/audio/*.mp3`，85,545,615 blob bytes；
- 69 个 generated PNG，168,923,162 blob bytes。

Pages 当前发布完整 320 页序列和 12 个整册 MP3。仓库没有 Carmela asset-level license manifest 这一原始事实继续保留，但缺少该记录不再是 blocker；用户全局授权已明确覆盖 inspection、OCR、derivatives、publication、deployment 和 redistribution。

### 4. Original P0 OCR processing artifacts were public Git content

原 P0 公开 Git 跟踪 344 个 Carmela `ocr/**` 文件、864,508 blob bytes，包括：

- 12 个 `full-text.txt`，138,807 B；
- 3 个 OCR report 各含一条本机绝对路径。

它们被 build 排除；P0R1 将其判定为 processing-only artifacts，并因 current-tree hygiene 与本机路径泄露从 Git index 取消跟踪。OCR 内容本身及其派生性质不是 rights blocker，本地文件全部保留。

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

## Authorization, privacy, and publishing matrix

| Asset class | Original Git/Pages fact | Rights status | Independent engineering/privacy boundary | Corrected result |
|---|---|---|---|---|
| Carmela raw PDF/MP3 | public history / no raw Pages path | `PASS_BY_USER_AUTHORIZATION` | history retained as size/maintenance evidence | pass |
| Carmela page PNG | Git yes / Pages full sequence | `PASS_BY_USER_AUTHORIZATION` | runtime-reference and performance rules only | pass |
| Carmela MP3 | Git yes / Pages 12 full books | `PASS_BY_USER_AUTHORIZATION` | runtime-reference and audio performance rules only | pass |
| Carmela OCR | original Git yes / Pages no | `PASS_BY_USER_AUTHORIZATION` | processing-only/current-tree/local-path hygiene；removed from index | pass |
| Carmela companion text | Git yes / Pages yes | `PASS_BY_USER_AUTHORIZATION` | schema/content/product tests | pass |
| Carmela generated art | Git yes / Pages yes | `PASS_BY_USER_AUTHORIZATION` | existence/reference tracking；asset-level manifest optional | pass |
| Work Cells EPUB/MP4/SRT | no current/reachable source history found / Pages no | `PASS_BY_USER_AUTHORIZATION` | raw formats remain outside runtime as product/build architecture | boundary pass |
| Work Cells full-page WebP | Git yes / Pages no | `PASS_BY_USER_AUTHORIZATION` | current dist excludes full page directory by runtime design | boundary pass |
| Work Cells thumbnails | Git yes / Pages yes | `PASS_BY_USER_AUTHORIZATION` | path/existence/runtime-reference checks | pass |
| Work Cells draft manifest | Git yes / Pages yes | `PASS_BY_USER_AUTHORIZATION` | over-broad authoring payload remains performance/privacy limitation | documented limitation |
| Work Cells station WebP | Git yes / Pages yes | `PASS_BY_USER_AUTHORIZATION` | 108/108 existence/status | pass |
| Reduced animation refs | Git yes / Pages summary only | `PASS_BY_USER_AUTHORIZATION` | no transcript/dialogue/private scene-note fields | pass |
| Private animation metadata | original Git yes / Pages no | `PASS_BY_USER_AUTHORIZATION` | explicitly private；removed from public Git index | privacy pass |

`user_confirmed_authorization` 是充分的用户项目授权，不需要外部、法律或 asset-level rights approval。Provenance metadata 可以用于构建可重复性和来源定位，但不得成为 copyright/license gate。

## Current Git versus Pages

不要混淆：

- `source/` 当前 ignored 且不进 dist；
- source 的 Carmela 完整作品仍可从 public history 取得；
- `data-private` 不进 dist；
- 原 P0 时其中 27 JSON 仍在 public current tree；P0R1 已从 index 取消跟踪；
- Work Cells `pages-by-volume` 不进 Pages；
- 1,062 个完整页 WebP 仍在 public current tree；
- Carmela OCR 不进 Pages；
- 原 P0 时 344 个 OCR artifacts 仍在 public current tree；P0R1 已从 index 取消跟踪。

这也是为什么原 `npm run audit:dist` PASS 不能单独证明 current-tree privacy hygiene 或 workflow fail-closed。它与 rights 状态无关。

## Privacy scan

原 P0 与 P0R1 的 bounded tracked-tree scan 均未发现 token/API-key；该检查不是完整 secret-history scanner。

发现的本机路径：

- 三个 tracked Carmela OCR reports 各一条相同项目根式绝对路径；
- ignored `docs/work-cells-epub-raw-directory.json` 另有本机路径，但未 tracked。

P0R1 已把 344 个 OCR processing artifacts 从 Git index 取消跟踪，并移除 13 个 runtime JSON 中的 48 个 stale OCR locator fields 以及 content template 中的 3 个同类字段；三个 report 的绝对路径不再位于 tracked current tree。未发现 secret、credential 或 PII；OCR 中的作品正文不是 privacy finding。未保存 browser profile、cookies、tokens、HAR 或 trace。

## `.gitignore` gaps

原 P0 `.gitignore` 的主要矛盾：

- 它显式重新放行 `data-private/.../*.json`，与文件自身 private policy 冲突。
- 未覆盖 `test-results/`、`playwright-report/`、HAR、trace、browser profile 和 screenshot scratch。
- 未 fail-closed 阻止 PDF、视频、字幕在 `source/` 之外被误跟踪。
- 未忽略 Carmela `ocr/`、`full-text.txt` 和 OCR reports。
- `.gitignore` 无法保护已经 tracked 或历史中的 blob。

P0R1 已取消 private JSON 的反向放行，并增加 OCR、`full-text.txt`、processing report、test-results、Playwright/HAR/trace/profile/log 等准确规则。Ignore 继续处理本地便利；validator 处理 tracked current tree、dist、runtime refs、secret/privacy/path 和发布工程边界，不检查 copyright/license，也不要求 rights manifest。

## Publish surface measurements

Original P0 publish-surface measurement：

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

P0R1 current release candidate is 1,534 files / 837,981,919 B: Carmela books 414 / 690,906,211 B；Carmela audio 12 / 85,545,615 B；Work Cells runtime 1,101 / 61,463,371 B；app shell and other static files 7 / 66,722 B。原表保留为历史测量，不代表 P0R1 current dist。

原 P0 build 是 blacklist，不是 fail-closed public repository/runtime gate；`audit:dist` 不在 build 或 Pages workflow 中。原 audit 也没有 runtime reachability、orphan/stale asset、JSON output 或 route budget。P0R1 已增加 tracked-index validator、pre-copy gate、post-copy dist audit 与 pre-upload Pages chain，Node 22 验证 PASS。

## Future exact allowlist

未来 build 应只从 validated runtime references 生成；这是一条发布工程规则，不是版权 allowlist：

```text
.nojekyll
index.html
assets/app.js
assets/styles.css
public/books/index.json
public/books/content-types.json
public/books/不一样的卡梅拉/series.json
public/books/不一样的卡梅拉/<runtime-title>/{book-assets.json,companion.json}
public/books/不一样的卡梅拉/<runtime-title>/pages/<manifest-referenced-page>
public/books/不一样的卡梅拉/<runtime-title>/generated/<manifest-referenced-file>
public/audio/carmela-s1/<runtime-referenced-mp3>
public/books/工作细胞/<reduced-runtime-manifest>.json
public/assets/cells-at-work/science-station/<topicId>/<runtime-referenced-webp>
public/assets/cells-at-work/page-thumbnails/<runtime-referenced-webp>
data/cells-at-work/<reduced-runtime-page-map>.json
```

Carmela `pages/*.png`、12 个 `public/audio/*.mp3`、generated images 和其他用户资源均可继续发布。

以下是 dist/runtime 技术排除，不是 current-repository copyright denylist：

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

每个 publishable media 可保留以下工程 metadata：

```text
assetId, path, sha256, sourceClass, sourceRef,
transformation, provenance, runtimeRefs,
rightsStatus=PASS_BY_USER_AUTHORIZATION
```

这些 metadata 只服务于来源定位、hash、构建可重复性和 runtime reachability；缺失时不得因 copyright/license 失败。

## P0R1 finished hygiene and pending closeout

1. **Global authorization**：七条规则已唯一安装并验证，`RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`。
2. **Current-tree hygiene**：27 个 private JSON 与 344 个 OCR processing artifacts 已从 Git index 取消跟踪；本地文件保留。
3. **Runtime cleanup**：既有 27-topic reduced projection 继续服务 runtime；14 个 tracked JSON 中的 51 个 stale OCR locator fields 已移除。
4. **Validator/build/Pages**：只执行 secret/privacy/path/source/processing/publish engineering gate；Node 22 local acceptance PASS，Pages 复用同一 chain。
5. **History boundary**：不重写历史；是否为 clone 性能另开 storage/history task，不由 rights 驱动。
6. **Final verification**：Source VERIFIED；main/Pages/workspace 是 post-commit external state，其精确 immutable evidence 由 final handoff 记录。

任何一步都不得用删除本地 `source/` 或降低门禁来“通过”。
