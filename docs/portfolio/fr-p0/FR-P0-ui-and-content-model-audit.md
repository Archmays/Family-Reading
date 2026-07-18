# FR-P0 UI and content-model audit

## Answer first

现有产品方向正确：它是纸质书旁边的伴读面板，不是电子书或阅读管理产品。保留“暖色家庭书架”视觉与 `首页 → 系列 → 书/科学主题 → 伴读模块` IA；未来以共享 shell、tokens 和可访问 primitives 为基础，让 Carmela 使用故事伴读模板、Work Cells 使用科学主题模板。不要把两个领域压成同一内容结构。

最需要先解决的不是视觉重做，而是 privacy/publishing hygiene、首屏全站数据耦合、长页信息密度、route/focus 管理、lightbox 无障碍和短横屏。P0R1 已完成 privacy disposition、validator/build/Pages integration 与 Node 22 acceptance；其余 UI 发现继续作为 FR-P2 输入。

## Skill audit

| Skill | 为什么使用 | 对本审计的影响 |
|---|---|---|
| Product Design audit | 任务要求全站 UX、旅程和视觉批评 | 使用现有上下文、代表路线和截图证据，不凭空重设计 |
| Frontend design | 任务要求设计系统与 UI 方向 | 保留现有色板/语气，提出 token/primitives 演进而非换皮 |
| Browser / Playwright workflow | 任务要求真实浏览器、响应式和交互 QA | 采集桌面/手机/平板/短横屏、DOM、focus、lightbox、answer、history |

原 P0 截图仅保存在 task scratch，未保存 browser profile、cookies、HAR、trace 或 token。完整作品内容本身不再被视为 rights/privacy blocker。

## Existing information architecture

```text
#/
├─ #/series/carmela-season-1
│  └─ #/book/{bookSlug}
│     └─ /{overview|review|scenes|questions|background|encyclopedia|audio|parents}
└─ #/series/work-cells
   └─ #/science/work-cells/{topicSlug}
      └─ /{science-overview|science-station|science-questions|source}
```

优点：

- 首页只做两系列入口，没有 dashboard 化。
- 系列页先选择具体书/主题，符合纸质书旁的“附近材料”心智模型。
- 详情页有明确 H1/H2、语义 section/article/nav 和返回路径。
- hash route 与相对 asset path 天然兼容 GitHub Pages project subpath。

风险：

- quick-nav 每次改变 hash 都销毁并重建整页，答案、音频和焦点状态丢失。
- `#/not-a-route` 静默回首页，`#/book/not-found` 才显示错误页。
- 不存在的 section target 静默显示顶部。
- science lookup 前先用 `route.slug` 查书，未来 slug 冲突会误渲染。
- document title 始终是站点总标题。

## Carmela source of truth

| 职责 | 当前权威 | 重复/冲突 |
|---|---|---|
| 系列顺序、标题、slug、audio | `series.json` | assets/companion 重复 identity；companion 重复 audio |
| 页边界、页图清单 | `book-assets.json` | companion sourceEvidence 仅保留 page root 与 OCR 的非路径用途说明 |
| 编辑内容 | `companion.json` | 包含系列/书 identity 和 source paths |
| 书目发现 | `public/books/index.json` | 与 series identity 有轻度重复 |

模型：

- `series.json`：12 册，每册 `order,title,slug,folder,assetFile,companionFile,audio`；P0R1 已移除 processing-only `ocrReport` locator。
- `book-assets.json`：页边界、页数、`pageImages`、source PDF reference、review flag。
- `companion.json`：overview、storyReview、scenes、三类 question cards、background、encyclopedia、parent guide、audio 和 manual review。

全系列实测：320 页、73 scenes、108 questions、36 background items、40 encyclopedia items。第 1 册 26 页/6 scenes/9 questions；复杂样本第 11 册 48 页/7 scenes/15 个主要角色。旧 boundary review 对第 11 册仍写 follow-up，当前 data 却是 `needsReview:false`，需要 P3 明确闭环。

## Work Cells source of truth

| 职责 | 当前权威 | 重复/冲突 |
|---|---|---|
| 人工话范围 | `manual-topic-ranges.json` | 复制到 page map 和 manifest |
| runtime 媒体图 | `data/cells-at-work/page-map.json` | 991 paths 又复制到 manifest 两处 |
| topic 文案/V2 内容 | `draft-manifest.json` | `parentNote===parentReadingNote` 27/27 |
| 医学术语 review | `docs/work-cells-terminology-review.md` | 27/27 仍待人工核对 |
| 动画 authoring provenance | `data-private/...` | 应只投影 reduced public summary |

Manifest：2,445,765 B、52,214 行、27 topics、991 annotations、108 published stations、162 question cards、172 related comic refs 和 51 reduced animation refs。27/27 topic 是 `contentVersion: work-cells-v2` / text `approved-v2`，但全局仍是：

- `manifestStatus: draft`
- `verificationStatus: from_user_reference_only`
- `licenseBasis: user_confirmed_authorization`

topic 文案批准不能升级全局 release 或医学验证状态；rights 状态已由用户全局授权独立确定为 `PASS_BY_USER_AUTHORIZATION`。

Page map：104,188 B、27 topics、991 paths；`sourceOfTruth: manual-topic-ranges`、无 missing images、无 OCR、未使用 EPUB nav。它与 manifest 媒体字段全量一致；显式展示名差异只有 psoriasis。

## Recommended discriminated envelope

```text
schemaVersion
contentType: picture-book-companion | science-manga-companion
series: { title, slug }
item: { id, slug, order, title, displayTitle? }
navigationMode
publication: { manifestStatus, contentStatus }
verification: { status, basis, reviewedAt? }
authorization: { status: PASS_BY_USER_AUTHORIZATION, provenance? }
mediaSummary: { thumbnail, hasAudio }
payload: PictureBookPayload | ScienceTopicPayload
```

`PictureBookPayload` 保留 story、scene/page range、三类问题、背景、百科、家长提示和音频。`ScienceTopicPayload` 保留 biology concepts、stations、typed parent cards、sensitive guidance、来源线索和 reduced animation summaries。Authorization/provenance 只用于记录和来源定位，不得成为 copyright/license gate。

以下不得进入 public runtime envelope：

- OCR/full text 和 report path；
- raw PDF/EPUB/MP4/SRT path；
- `zipPath`、`notesForCodex`；
- private scene notes、review contact sheets；
- 内部生成 prompt 和 review-only 状态。

## Design system audit

现有优势：

- teal/coral/cream 形成温暖、家庭友好的识别。
- 系统中文字体避免字体资源负担。
- 1180 px 容器、流式字号、圆角卡片和阴影一致。
- 主要按钮大多有 44 px 高度，已有 `:focus-visible`。
- mobile breakpoint 能把详情改为单列并取消 sticky。

问题：

- tokens 只覆盖部分颜色/阴影；spacing、type scale、focus、状态色大量硬编码。
- 几乎所有内容都使用相同白卡，长详情出现 card soup。
- Work Cells 仍复用 `book-card`，领域语义不清。
- 科学页暴露 `prompt-id` 等 authoring 文本。
- 所有图片缺 width/height，造成 layout stability 风险。
- back-link、quick-nav、summary 不统一满足 44 px。

静态对比估算：

| Pair | 约值 | 风险 |
|---|---:|---|
| white / coral action | 3.06:1 | 普通字号不足 |
| teal text / white | 4.06:1 | 普通字号边缘不足 |
| page-range green / white | 3.24:1 | 不足 |
| translucent focus outline / white | 1.5:1 | focus indicator 不足 |

未来必须用 axe/浏览器实测确认，不把静态估算写成最终合规结论。

## Representative browser findings

| Route | Desktop | 390 px mobile | Top issue |
|---|---|---|---|
| Home | 清晰双入口 | 无横向溢出 | 首屏仍等待全站 JSON |
| Carmela series | 3-column cards | 单列 7,306 px | 12 张原 cover 共 14.68 MB raw |
| Carmela book 1 | 11,785 px / 110 focusables | 18,178 px | 导航先占一屏、tab order 很长 |
| Work Cells series | 27 cards | 12,476 px | 领域卡复用、返回链接 21 px |
| Heavy science topic | 5,918 px | 10,946 px | 长页、authoring 文本 |

所有代表路线在测试视口均无水平 overflow 和已加载图片 404。

短横屏：

- 667×375 触发单列，未水平溢出。
- 1024×400 保持 desktop sticky；侧栏 789.6 px，高于 viewport，quick-nav 后半不可达。

## Interaction and accessibility

Lightbox：

- `role=dialog`，打开聚焦关闭按钮，body scroll lock，Escape 生效。
- 背景未 inert/aria-hidden。
- 关闭后焦点回 body，不回 opener。
- 全页缩略图组成一个图库，长页可能有上百项和重复图。
- `window.onkeydown` 覆盖 property handler；离开详情后旧闭包仍存在。

Answer：

- 点击和 `aria-expanded` 正常，按钮保留焦点。
- 缺少 `aria-controls`。

Route/focus：

- quick-nav 能对齐 target，但 render 后焦点是 body。
- 没有 skip link、route announcement 或标题 focus。
- back/forward 工作，但页面状态重建。

Audio：

- native controls、`preload=metadata`、本地 metadata/duration 可用。
- error message 不是 live region，也未通过 `aria-describedby` 关联。
- quick-nav 会重建并重置 audio。

CSS 缺口：

- 无 `prefers-reduced-motion`；
- 无 forced-colors；
- 无 print；
- 无 max-height/orientation；
- 200% zoom 未在真实 zoom 环境验证。

## Product direction

首选方向：**route-scoped companion atlas**。

1. 保留首页两系列入口，不加统计/进度。
2. 建立 shared shell、tokens、focus/dialog/media primitives。
3. Carmela detail 聚焦故事复盘、问题、背景、百科、音频。
4. Work Cells detail 聚焦科学导读、stations、问题和敏感指导。
5. 首页只加载系列 envelope；series 只加载该领域索引；detail 按 route/section 加载。
6. 浏览使用 thumbnail；detail asset 只在展开/lightbox 时请求。
7. 打印默认聚焦 companion text/questions，并按产品布局隐藏导航和重媒体；这不是版权限制。

本阶段只提出方向，没有改 UI、app.js 或 styles.css。
