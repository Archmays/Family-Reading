# FR-P0 baseline report

## Answer-first executive summary

FR-P0 已完成可信基线、审计证据和后续路线，但交付状态是 **BLOCKED**，不是可发布完成。仓库身份、公开可见性、当前 main、Git/GitHub、工作区、历史、source、public、dist、Pages、路线资源、内容模型、UI、build/tests 都已重新实测；受保护根 before/after 为 1,649 文件、7,884,142,200 B，规范化 SHA-256 均为 `a32e8366a11f85c8b591c3bf06a2b7813950904a0a81f1a0fd64971af71eee67`。

阻断原因有四项：

1. 公开 `origin/main` 跟踪了被文件自身策略与测试标记为 private/non-publishable 的 `data-private/cells-at-work/animation/**` 元数据。
2. 完整卡梅拉 PDF 与 12 个源 MP3 仍可从公开 main 历史取得。
3. 当前 Git 与 Pages 发布卡梅拉完整逐页图片和 12 个整册 MP3，但仓库没有卡梅拉公开授权依据。
4. 当前 Git 跟踪 344 个卡梅拉 OCR 产物，其中包括 12 份全文和 3 份带本机绝对路径的报告。

按 FR-P0 规则，本分支不合并、不推送、不改 visibility、不重写历史。建议下一阶段仅处理 `FR-P1 Safety and Publishing Containment`，不要先做 UI 重构或媒体优化。

机器证据：

- [`fr-p0-size-and-history-baseline.json`](../../../reports/portfolio/fr-p0/fr-p0-size-and-history-baseline.json)
- [`fr-p0-publish-surface.json`](../../../reports/portfolio/fr-p0/fr-p0-publish-surface.json)
- [`fr-p0-route-performance-baseline.json`](../../../reports/portfolio/fr-p0/fr-p0-route-performance-baseline.json)
- [`fr-p0-run-manifest.json`](../../../reports/portfolio/fr-p0/fr-p0-run-manifest.json)

## Repository identity and current HEAD

| 项目 | 当前事实 |
|---|---|
| Repository | `Archmays/Family-Reading` |
| Origin | `https://github.com/Archmays/Family-Reading.git` |
| Visibility | `PUBLIC`，未修改 |
| Default branch | `main` |
| Start main / origin main | `9c74e3f26a84ff9d82cb7e664c0314ed87998ef6` |
| Task branch | `codex/fr-portfolio-p0-baseline` |
| Open PR / issue | 0 / 0 |
| Worktrees / stash at start | 1 / 0 |
| GitHub size metadata | 2,247,861 KB |
| Branch protection | main 未保护 |

未创建第二个 GitHub 仓库，未调用 `gh repo create`。

## Storage: keep the layers separate

| 层 | 文件 | Bytes | 含义 |
|---|---:|---:|---|
| Workspace，含 `.git` | 5,098 | 12,661,417,593 | 本机总占用快照 |
| Working tree，不含 `.git` | 4,764 | 9,563,654,913 | tracked + ignored |
| `.git` | 334 | 3,097,762,680 | object store / refs / packs |
| Tracked working files | 3,134 | 1,651,910,985 | 工作副本字节 |
| HEAD blobs | 3,134 | 1,651,869,664 | Git 当前树 blob 字节 |
| Ignored | 1,630 | 7,911,743,928 | 主要是 source、dist、private |
| `source/` | 55 | 6,947,722,345 | 受保护原始素材 |
| `public/` | 2,935 | 1,431,211,621 | 公开 Git 树，不等于 Pages |
| `dist/` | 1,533 | 837,983,345 | 当前本机构建产物 |
| Latest Pages artifact metadata | — | 828,688,767 | 过期上传 artifact，不等于解包 dist |

`.git` 中当前 refs 可达对象原始字节为 2,357,309,245 B；另有 6,039 个不由当前 ref 可达的对象，原始字节 1,025,227,847 B。不要把工作区、Git 历史、GitHub metadata、dist、artifact 和路线传输相加为一个“仓库大小”。

最大的当前根因是本地 Work Cells MP4 source（6.20 GB）、公开媒体（1.43 GB）、构建输出副本（799.16 MiB）和 Git 历史中已删除但仍可达的大 blob。历史 Top 100 共 940,604,271 B，其中 16 个仅存在于历史，合计 663,239,316 B；完整明细在 size JSON。

## Source integrity

受保护范围包括：

- `source/`
- `data-private/`
- `archived/ocr-experiments/`
- `data/cells-at-work/source-assets/`
- `public/assets/cells-at-work/pages-by-volume/`
- 12 个卡梅拉 `ocr/` 根

Before/after：

| 项目 | Before | After |
|---|---:|---:|
| Files | 1,649 | 1,649 |
| Bytes | 7,884,142,200 | 7,884,142,200 |
| Canonical SHA-256 | `a32e8366…ee67` | `a32e8366…ee67` |
| Missing / changed | 0 | 0 |

完整 manifest 仅保留在任务 scratch；公开报告只保留聚合、hash 和分类，不泄露 raw 内容。

## Rights, privacy, and publishing

`PRIVACY_STATUS` 和 `RIGHTS_STATUS` 均为 `BLOCKED`；`PUBLISH_SURFACE_STATUS` 为 `FAIL`。完整 rights/provenance matrix、公开路径、历史 commit 和未来 allowlist 见 [`FR-P0-source-rights-and-publishing-audit.md`](FR-P0-source-rights-and-publishing-audit.md)。

关键区别：

- Work Cells 的 `licenseBasis: user_confirmed_authorization` 只是仓库记录的用户声明，不是外部或法律审查结论。
- Pages 不复制 `source/`，不代表公开 Git 历史没有 source。
- `data-private` 不进入 `dist`，不代表它没有被公开 Git 跟踪。
- 当前 `audit:dist` 通过，只证明已知黑名单和 900 MiB 总量门禁通过，不证明权利或 allowlist 通过。

## Current publish surface

当前 dist 结构扫描通过：未发现 source、PDF、EPUB、OCR、动画源媒体或完整 Work Cells 页面目录。非零 1,532 个文件、全部 837,983,345 B 均与仓库映射源逐字节 SHA-256 一致，额外文件只有零字节 `.nojekyll`。

但结构安全不等于权利安全。dist 中卡梅拉 426 文件、776,453,716 B；其中完整页图与 12 个整册音频缺少公开权利依据，所以发布面总体失败。未来必须从 rights-approved runtime references 生成 exact allowlist。

## Content model

站点有两个领域模型，不应强迫统一模板：

- Carmela：系列 → 书 → 页边界、故事回顾、场景、三类问题卡、背景、百科、家长提示、整册音频。
- Work Cells：系列 → 科学主题 → 卷/话来源、科学导读、4 个 science stations、6 个亲子问题、敏感内容边界、来源备注和 reduced animation summaries。

推荐只共享稳定 envelope：identity、series/item、navigation、publication、verification、rights、media summary；领域 payload 使用 discriminated union。详细字段和 source-of-truth 见 [`FR-P0-ui-and-content-model-audit.md`](FR-P0-ui-and-content-model-audit.md)。

## UI and UX

现有暖色家庭书架视觉和 `首页 → 系列 → 书/主题 → 伴读模块` IA 符合产品身份，没有进度、打卡、统计、账号或 dashboard。桌面、390 px 手机、768 px 平板和 667 px 短横屏均无横向溢出。

高优先级问题：

- 1024×400 时 sticky 侧栏高 789.6 px，后半导航不可达。
- lightbox 打开后能聚焦关闭按钮并支持 Escape，但背景未 inert，关闭后焦点落到 body。
- hash route/quick-nav 重建整页且不管理焦点；未知一级路由静默回首页，未知书籍才显示错误页。
- answer toggle 有 `aria-expanded`，没有 `aria-controls`。
- 缺少 reduced-motion、forced-colors、print 规则；普通文字/按钮/焦点对比有风险。
- 所有图片都缺显式 width/height，长页 DOM 和 tab order 很重。

## Performance

任何路线首次 render 前都等待 28 个 JSON，共 2,807,138 B。最大两项是 2,445,765 B Work Cells manifest 和 104,188 B page map；JS/CSS 只有 46,477 / 17,432 B，不是首要瓶颈。

Raw referenced-asset baseline：

| Route | Unique assets | Raw referenced bytes |
|---|---:|---:|
| Home | 32 | 3,555,294 |
| Carmela series | 42 | 17,546,127 |
| Carmela book 1 | 56 | 45,643,353，加潜在 5,208,122 B audio |
| Work Cells series | 57 | 3,867,287 |
| Work Cells heavy topic | 42 | 4,089,265 |

这些是本地 raw reference bytes，不是压缩传输、HAR 或 Web Vitals。浏览器接口未提供 Resource Timing、LCP/CLS/INP、cache 或 throttle，因此没有伪造 Lighthouse 分数。详细定义与未来预算见 route JSON。

## Build, tests, and Pages

- 本地 acceptance `npm run build`：PASS，40/40 tests，约 2.487 s。
- `npm run audit:dist`：PASS，约 0.574 s，799.16 MiB，低于 900 MiB hard exit。
- 本地 Node `v24.16.0`；Pages 使用 Node 22，`package.json` 没有 engines，属于环境差异。
- 测试总数是 40，不是旧报告的 38。`mvp.test.mjs` 导入另外两个 suite，未来直接 glob 三文件会重复成 48。
- Pages workflow 只运行 build，不运行 `audit:dist`；因此 audit-only 条件不是发布门禁。
- 当前 main 最新 Pages run `27912960467` 对应 `9c74e3f…`，success，122 s；最近 10 次均成功。
- 当前 live Pages 首页已在浏览器加载并呈现两系列入口；任务分支因 blocker 未部署。

详情见 [`FR-P0-performance-build-tests-and-pages-audit.md`](FR-P0-performance-build-tests-and-pages-audit.md)。

## Blockers and recovery

### BLOCKED_PRIVACY_OR_RIGHTS_EXPOSURE

恢复需要单独、安全、分阶段授权：

1. 先决定公开仓库临时 containment（visibility 是否调整必须由用户明确决定）。
2. 获取并记录 Carmela 公开发布权利，或把完整页图和整册音频从 public Git/Pages 发布面移除。
3. 把 private animation authoring metadata 和 OCR processing artifacts 从当前公开树移出，并增加 fail-closed validator。
4. 单独决定是否重写公开历史；这一步必须另行授权，禁止在 FR-P0 自动执行。
5. 在新的安全基线重新扫描 current tree、history、dist、artifact 和 live Pages 后，才允许恢复 merge/push。

## Limitations

- 最新 Pages artifact 已过期，无法下载做文件级比较。
- 浏览器没有 HAR、Resource Timing、Web Vitals、forced-colors/reduced-motion 仿真和真实 200% zoom。
- 当前 tracked-tree token/API-key regex 无命中，但不是完整历史 secret scanner。
- Work Cells 医学术语 27/27 仍待人工核对；内容 `approved-v2` 不覆盖医学/版权验证。
- 当前 live Pages smoke 证明旧 main 页面可加载；没有任务 commit 的 Pages run，因为规则要求阻断 push。

## No-go decisions

本阶段没有：

- UI redesign、framework migration、app.js 组件化、styles.css 大拆分；
- manifest sharding、媒体批量转换或音频重编码；
- 书目扩展、Work Cells 内容改写、测试大拆分；
- source 删除/迁移/压缩；
- LFS migrate、history rewrite、force push、visibility change；
- ebook、progress、check-in、statistics、account、dashboard；
- 自动开始 P1。

## Change-impact map

| 改动 | 当前影响 | 未来消费者 | 回滚 |
|---|---|---|---|
| P0 docs / JSON | 只增加审计证据，不改变 runtime | P1–P6 | 删除本 P0 目录 |
| README 事实修正 | 修正 4 本→12 本/两系列、rights 提示 | 开发者 onboarding | 恢复两个文档块 |
| Pages doc 事实修正 | 历史体积改为当前分层数据 | 部署维护者 | 恢复文档块 |
| 无 runtime/tool change | dist 与 live 行为不变 | — | 不需要 |

## Decision log

| 决策 | Evidence | Rejected alternative | 原因 | Future phase |
|---|---|---|---|---|
| 状态设为 BLOCKED | 公开 private metadata、历史 raw source、Carmela rights 缺失 | 把“dist 不含 source”当 pass | Git/Pages 边界不同 | P1 |
| 不合并、不推送 | FR-P0 blocker rule | “先发报告再修风险” | 推送会扩大公开状态并触发 Pages | P1 |
| 保留两个领域 payload | 现有字段与家庭任务不同 | 单一 book/topic 大 schema | 避免错误抽象 | P2/P4 |
| 先 route-scoped JSON，再媒体优化 | 2.68 MiB 全站 JSON 是共同首屏阻塞 | 先批量压图 | 先解决架构和 rights | P4/P5 |
| 不添加第二个审计脚本 | 现有命令足以生成 P0；代码门禁应在 P1 设计 | P0 临时堆脚本 | 控制范围、避免无测试工具债 | P1 |
