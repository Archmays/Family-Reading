# FR-P2 design brief and direction

## Answer first

FR-P2 选择并实施 **Warm Companion Atlas / 温暖伴读图册**。它把站点定义为纸质书旁边的一册轻量索引：先选择系列，再按书目或科学主题找到需要的伴读资料。首页不承载阅读管理；Carmela 与 Work Cells 共用壳层、焦点系统和卡片规则，但分别使用“绘本书架”和“科学主题馆”的领域语言。

本阶段不生成概念图片，不调用外部图像服务，不增加首屏数据请求，不拆分 authoring manifest，也不提前进入 FR-P3、FR-P4 或 FR-P5。

## Task contract

- **Goal:** 把入口、系列页和共享壳层升级为成熟、温暖、可访问的静态 companion atlas。
- **Context:** 当前产品 IA 正确，但路由焦点、错误处理、lightbox、短横屏、forced colors、print、领域卡片语义和视觉层级仍停留在原型阶段。
- **Constraints:** 静态 GitHub Pages；无 framework、bundler、runtime dependency、外部字体或图标库；启动 JSON 请求数不增加；Source 与 protected roots 只读。
- **Done when:** P2-A/P2-B、focused tests、一次 Node 22 full acceptance、build/dist/public validator、浏览器矩阵、受控 WebP 基线、exact-SHA Pages 和 live smoke 均有证据。
- **Must not touch:** `public/books/**/*.json`、`data/**/*.json`、`source/**`、`source-private/**`、原始媒体、privacy/rights policy、Git history。
- **Evidence sources:** P0/P0R1 reports、当前代码与 tests、运行时 manifest 摘要、Git/GitHub/Pages、真实浏览器。
- **Current stage:** implementation complete；final release acceptance pending。

## Three internal directions

| Direction | Thesis | Hierarchy and density | Tone | Interaction and accessibility | Decision |
|---|---|---|---|---|---|
| Warm Companion Atlas | 像放在纸质书旁的一册家庭图册，以索引脊、领域色和清晰路径组织“附近材料” | 中等密度；标题、说明、主要入口、克制 metadata；卡片只在入口和 item 层使用 | 温暖、成熟、安静，不幼稚 | 高对比 ink、明确 focus、44 px 目标；结构不依赖装饰或 hover | **Selected** |
| Editorial Family Library | 把两系列当作一份家庭阅读刊物，以 serif 标题、细分隔线和大留白形成编辑感 | 较低密度；图片与标题占比更大 | 克制、文化感强 | 层级清楚，但移动端 12/27 items 会拉长页面；Work Cells 容易显得过于文学化 | Rejected |
| Playful Learning Shelf | 使用更鲜明色块、圆润卡片和较活跃的 shelf rhythm | 较高密度；更多徽标和视觉提示 | 亲切、活泼 | 触控友好，但容易走向儿童 dashboard、card soup 和装饰优先 | Rejected |

### Comparison dimensions

1. 是否准确表达“纸质书旁的伴读工具”；
2. 首页是否仍只做系列选择；
3. Carmela 与 Work Cells 是否能共享系统而不共享错误语义；
4. 长列表在 mobile 与短横屏是否保持清晰；
5. focus、forced colors、reduced motion、200% zoom 与 print 是否自然成立；
6. 是否能在现有静态 SPA 上增量实现；
7. 是否避免幼稚化、dashboard 化和无意义装饰。

Warm Companion Atlas 在七项中最均衡，也与 P0 的 `companion atlas` 判断一致。Editorial Family Library 的排版纪律会被吸收到 heading 和 reading measure；Playful Learning Shelf 只保留触控清晰度，不采用高饱和装饰或徽章语言。

## Frontend design plan

### Palette

- **Atlas paper** `#FFF8ED`：页面底色，接近真实纸张但不做仿旧纹理。
- **Folio surface** `#FFFDF9`：阅读表面和卡片主体。
- **Atlas ink** `#273238`：正文与标题的稳定深色。
- **Carmela coral** `#B94F38`：绘本领域标识；主要动作使用更深的 `#9D3F2E`。
- **Work Cells teal** `#12686B`：科学领域、链接与信息索引。
- **Focus blue** `#075C9B`：独立于领域色的可计算 focus indicator。

精确 hover、active、border、muted 与状态值在 design-system spec 中以对比计算固定；不使用半透明低对比 focus。

### Type

- **Display:** 本机可用的中文 serif 栈，用于 H1/H2 和系列标题；它提供“图册/纸本”气质，但只在标题使用。
- **Body:** 本机 system sans 栈，用于说明、正文、导航和控件，保证屏幕可读性。
- **Utility:** body 栈的较小字号与较强字重，用于 order、category、source label；不引入第三方字体请求。

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ 跳到主要内容                                                 │
│ [伴读图册 brand]                                             │
│ 首页 / 当前系列 / 当前条目                                   │
├──────────────────────────────────────────────────────────────┤
│ H1 + one-sentence orientation                                │
│                                                              │
│ Home:       [Carmela folio]    [Work Cells folio]             │
│ Carmela:    [01 book] [02 book] [03 book] ...                 │
│ Work Cells: [category anchors, wrapped]                       │
│             H2 category                                      │
│             [topic] [topic] ...                               │
└──────────────────────────────────────────────────────────────┘
```

### Signature

唯一强调元素是 **atlas index rail / 图册索引脊**。Carmela rail 显示真实书目顺序；Work Cells rail 显示真实领域类别；首页 rail 显示“绘本伴读 / 科学主题”。它编码真实结构，不是装饰性编号，也不会成为第三套导航。

### Self-critique before build

初稿容易落入“cream + serif + coral”的常见暖色模板。修订后，辨识度不依赖背景色或大阴影，而依赖真实内容驱动的 atlas rail、低卡片化编辑布局、两领域不同的图像比例与 metadata 语言。动效不作为签名；只有 hover/press 的短距离反馈，并在 reduced motion 下关闭。

## Information architecture

```text
#/
├─ #/series/carmela-season-1
│  └─ #/book/{bookSlug}
│     └─ /{overview|review|scenes|questions|background|encyclopedia|audio|parents}
└─ #/series/work-cells
   └─ #/science/work-cells/{topicSlug}
      └─ /{science-overview|science-station|science-questions|source}
```

- Home：无 breadcrumb，只显示两系列入口和一条使用提示。
- Series：`首页 / 当前系列`。
- Detail：`首页 / 系列 / 当前书或主题`。
- Section target：留在当前 detail view，不作为完整 route 重置。
- Invalid top-level、series、book、topic、section：显示明确错误与安全返回入口，不静默回 home。
- Book 和 science topic 只在各自 route namespace 内查找，消除 slug 冲突。

## Component inventory

### Shared

- stable application shell
- skip link
- compact brand header
- semantic breadcrumb
- route live region
- route title/focus controller
- loading, error and empty state
- action link, quiet link, button and tag
- image fallback
- accessible lightbox

### Carmela

- Carmela series entry
- book shelf grid
- book card with order, cover, title, audio availability, one primary entry and restrained secondary links
- existing detail modules in compatibility mode

### Work Cells

- Work Cells series entry
- wrapped category anchor navigation
- category section with H2
- topic grid
- independent `topic-card` semantic and class
- existing topic detail modules in compatibility mode

## Change-impact map

This map was established before the first project-file write.

| Candidate change | Direct impact | Consumers / regressions to watch | Verification | Rollback |
|---|---|---|---|---|
| `index.html` shell/meta | initial loading, landmarks, skip target, live region | direct hash load, project subpath, one-main rule | static contract + browser direct reload | restore prior body shell |
| `assets/app.js` bounded router/render changes | all routes, title/focus, breadcrumb, home/series IA | detail content, audio, section hashes, invalid routes | focused tests + representative browser routes | revert P2 runtime commit |
| one small `assets/a11y.js` module if needed | dialog trap/inert/restore and route focus helpers | keyboard, route cleanup, body scroll | unit/static contracts + browser interaction | inline/revert module import |
| `assets/styles.css` token/system rewrite | all viewports and print | detail compatibility, forced colors, zoom, short landscape | contrast calculation + viewport/mode matrix | revert P2 runtime commit |
| focused P2 tests | static product/shell/component/release contracts | full suite count and single-run topology | targeted during work; one final suite | revert tests with runtime |
| P2 docs/reports/screenshots | release evidence only | public validator, dist exclusion, screenshot budget | JSON parse, hashes, tracked-tree validator | remove P2 evidence commit |

### Explicitly unchanged

- startup data model and 28-request JSON chain
- `public/books/**/*.json`
- `data/**/*.json`
- Source/protected roots and original media
- privacy validator, rights policy and Pages workflow
- Carmela and Work Cells companion content
- detail-page information architecture beyond shared shell/a11y compatibility

## Consequential unknown register

| ID | Category | Evidence | Consequence if wrong | Resolve now / defer | Resolution | Confidence |
|---|---|---|---|---|---|---|
| U1 | unknown unknown | Archived P0R1 aggregate is 1,649 files / 7,884,142,200 B, while the current pre-P2 workspace exposes 1,278 / 7,882,956,334 B | A false claim could attribute pre-existing missing ignored files to P2 | Resolve now | Preserve the archived baseline as historical; establish a current P2 before/after aggregate; do not restore or touch protected roots. The 371-file drift is a documented starting limitation | high |
| U2 | known unknown | PATH Node is 24 while Pages pins Node 22 | Local acceptance could diverge from CI | Resolve now | Use the cached/on-demand Node 22 runner for the one final acceptance; PATH Node is allowed only for targeted development checks | high |
| U3 | known unknown | Existing browser evidence did not emulate forced colors, reduced motion, print or true 200% zoom | Static CSS alone would overstate accessibility coverage | Resolve now | Use real browser media/zoom emulation where supported and label any unavailable assistive-technology coverage precisely | high |
| U4 | unknown known | Work Cells has 24 exact categories for 27 topics | A sticky or scrolling category bar could become denser than the content | Resolve now | Preserve exact categories and first-seen order; use a wrapped, non-sticky 44 px anchor list | high |

Selected discovery methods:

- **blindspot-pass:** required because route, release, protected-root and detail compatibility risks cross files and systems.
- **implementation-notes:** required because P2-A/P2-B and browser remediation can expose plan-changing facts.

No architecture interview is required: repository evidence and the task already determine the product, visual direction, framework boundary, data-loading boundary and release path.

## Design principles

1. Paper book first; companion material second.
2. One route, one obvious heading, one primary next action.
3. Shared shell does not erase domain language.
4. Structural labels encode real order, category or source.
5. Warmth comes from proportion, type and surfaces—not novelty controls.
6. Keyboard and touch receive the same complete path.
7. Error and empty states explain the next safe action without exposing implementation paths.
8. Print selects companion material by product purpose, not by rights restrictions.

## No-go decisions

- No reading management, check-in, dashboard, statistics, rankings, rewards, account, login or admin surface.
- No ebook-style primary reading body and no child-facing OCR full text.
- No search portal, recommendation feed, filter state or recent-reading area.
- No framework, bundler, runtime dependency, service worker or PWA.
- No external font, icon library, analytics, tracking or image-generation service.
- No manifest sharding, route-scoped fetch, media conversion, `srcset` pipeline, audio transcoding or hash pipeline.
- No new books, series, topics or medical copy changes.
- No Source/protected-root mutation, history rewrite, visibility change or force operation.
- No FR-P3 detail redesign, FR-P4 loading architecture or FR-P5 media pipeline work.
