# FR-P2 design system specification

## Outcome

FR-P2 建立一套不依赖 framework、bundler、外部字体或图标库的静态设计系统。系统名称为 **Warm Companion Atlas / 温暖伴读图册**：以纸张般的中性背景、编辑式标题、真实顺序与类别索引构成纸质书旁的伴读入口。

设计系统只重塑共享壳层、入口和系列 IA；Carmela 与 Work Cells 详情内容保持兼容，不提前进入 FR-P3。

## Semantic tokens

### Color

| Token | Value | Purpose |
|---|---:|---|
| `--color-page` | `#fff8ed` | 温暖页面底色 |
| `--color-page-science` | `#f3faf9` | 科学领域浅底色 |
| `--color-surface` | `#fffdf9` | 主阅读表面 |
| `--color-surface-raised` | `#ffffff` | raised entry surface |
| `--color-text` | `#273238` | 标题与正文 |
| `--color-text-muted` | `#59676b` | 次要说明 |
| `--color-border` | `#d9cdbb` | 普通边界 |
| `--color-border-strong` | `#9c8d78` | 强边界 |
| `--color-primary` | `#9d3f2e` | Carmela 主动作 |
| `--color-primary-hover` | `#7f2f22` | Carmela hover |
| `--color-primary-active` | `#68251a` | Carmela active |
| `--color-accent` | `#b87916` | 编辑式强调 |
| `--color-focus` | `#075c9b` | 跨领域 focus ring |
| `--color-carmela` | `#b94f38` | Carmela 领域标识 |
| `--color-science` | `#12686b` | Work Cells 领域标识 |

AA 计算门禁：

| Pair | Ratio | Gate |
|---|---:|---|
| primary / white | 6.60:1 | normal text AA PASS |
| science / white | 6.53:1 | normal text AA PASS |
| muted / page | 5.56:1 | normal text AA PASS |
| focus / page | 6.60:1 | non-text focus PASS |

状态不只依赖颜色：当前项使用文字、结构或 `aria-current`；音频可用性同时使用圆点和文字；forced colors 下边界、链接、按钮和 focus 由系统色重新表达。

### Type

- Display stack：`STSong`, `Songti SC`, `SimSun`, `Georgia`, serif。
- Body stack：`Microsoft YaHei`, `PingFang SC`, `Segoe UI`, system-ui, sans-serif。
- Scale：`--type-xs`、`--type-sm`、`--type-body`、`--type-lg`、`--type-xl`、`--type-2xl`。
- 正文 reading measure：默认不超过 `72ch`。
- 不发起字体网络请求。

### Space, radius, shadow and layout

- Spacing：`0.25rem` 至 `4rem` 的语义刻度。
- Radius：`0.45rem`、`0.8rem`、`1.2rem` 与 pill。
- Shadow：subtle 用于 item surface，raised 只用于入口级卡片。
- `--layout-max: 74rem`。
- `--layout-gutter: clamp(1rem, 4vw, 3.5rem)`。
- `--touch-target: 44px`。
- `--sticky-offset: 5rem`。

## Base and focus system

- 全局 `box-sizing: border-box`。
- body 使用系统字体、1.65 行高和可换行 overflow protection。
- heading 使用编辑式 serif，并保持正确 H1–H4 层级。
- anchor 用于导航；button 用于动作；没有 clickable div 或 nested interaction。
- `button`、action link、breadcrumb、summary、audio seek 和表单控件均满足 44 px 门禁。
- `:focus-visible` 使用 3 px 实线 focus token与 3 px offset。
- selection、hidden、image、list、audio 和 summary 均有统一基础规则。

## Application shell

稳定 shell 由以下顺序组成：

1. `跳到主要内容` skip link；
2. compact brand header；
3. semantic breadcrumb；
4. `main#main-content`；
5. polite route live region。

每次完整 route change：

- 解析 route namespace；
- 更新 `document.title`；
- 更新 breadcrumb；
- 渲染 exactly one H1；
- 将焦点移至 `tabindex="-1"` 的 route heading；
- 宣告页面标题；
- 清理上一 view 的 listener、audio 与 lightbox。

同页 section target 不重建完整页面。目标使用立即滚动并聚焦对应 heading；返回/前进保留系列深层定位。无效 route、series、book、topic 或 section 显示明确错误与首页/系列返回入口，不暴露内部路径。

## Component taxonomy

### Shared primitives

- application shell
- breadcrumb
- loading/error/empty state
- action and quiet links
- availability label
- image fallback
- accessible lightbox
- answer disclosure

### Entry level

`series-entry-card` 是首页唯一 raised card。Desktop 两列、mobile 单列；整块主区域是一个链接，没有嵌套交互。Carmela 使用 coral/cream，Work Cells 使用 teal/sky，并共享相同的 focus/hover/active 规则。

### Carmela shelf

`book-card` 采用 subtle surface：

- 册序；
- 不变形的封面；
- 可换行标题；
- “含音频/文字资料”；
- 一个主入口；
- 克制的问题卡和音频次入口。

封面使用 lazy loading，缺图时出现可理解 fallback。

### Work Cells topic atlas

Work Cells 按 manifest 中 `topic.category` 的首次出现顺序建立 24 个 semantic section，保持 27 个 topic 原顺序。类别导航使用可折叠 `details`：宽屏展开并换行，窄屏折叠，不引入筛选、搜索或持久状态。

`topic-card` 是独立 primitive，不复用 `book-card`。每卡只显示 thumbnail、display title、category、source label 和主链接；不显示 prompt id、authoring status、review key、rights metadata 或 private refs。

## Accessibility modes

### Reduced motion

`prefers-reduced-motion: reduce` 下：

- smooth scroll 变为 auto；
- 非必要 transition 和 animation 归零；
- 信息和焦点路径不依赖运动。

### Forced colors

`forced-colors: active` 下：

- focus 使用 3 px `Highlight`；
- card、tag、button、dialog 和 link 保留可辨边界；
- 领域差异仍有文字与结构，不依赖背景色。

### Short landscape and zoom

`max-height: 500px` 且 landscape 时：

- header 改为 static 并压缩；
- sticky navigation 被取消；
- 类别导航换行；
- 1024×400、844×390、667×375 无水平溢出。

等效 200% reflow 宽度下保持单列、44 px 控件与完整 heading。文本间距覆盖后，除刻意移出视区的 live region 外无裁切。

### Print

`@media print` 使用 A4、1.6 cm 页边距与 companion-only surface：

- 打印 title、overview、review、scenes、questions、background、encyclopedia 和 parent guidance；
- 隐藏 header、breadcrumb、controls、audio、lightbox、page image check 和 gallery；
- 隐藏状态的参考答案在打印中展开；
- 每个伴读章节从新页开始，card 内避免断裂，孤行/寡行由 `orphans` / `widows` 控制。

## Dialog and disclosure contracts

Lightbox：

- `role="dialog"`、`aria-modal="true"`、可理解 label；
- 打开后聚焦关闭按钮；
- Tab / Shift+Tab trap；
- Escape、previous、next、close；
- background `inert`，并保留 `aria-hidden` fallback；
- 锁定并恢复 body scroll；
- 关闭恢复 opener focus；
- route change 完整 cleanup；
- 不使用 `window.onkeydown =`，背景不是 clickable div。

Answer disclosure：

- `aria-controls` 指向唯一 answer id；
- `aria-expanded` 与视觉文字同步；
- Enter/Space 使用原生 button；
- 展开后焦点保留在按钮。

## Runtime boundary and budgets

- 单一 CSS 入口；
- 只新增一个小模块 `assets/a11y.js`；
- app data model 与 28-request startup chain 不变；
- 无 runtime dependency；
- 无 external font/script；
- 无 framework、bundler、service worker 或 PWA；
- JS raw 63,738 B；
- CSS raw 38,624 B；
- dist 相对 P0 增加 45,088 B，远低于 5 MiB 门禁。
