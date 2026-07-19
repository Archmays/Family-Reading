# FR-P2 browser, visual and accessibility report

## Answer first

Warm Companion Atlas 的入口、两个系列、代表性详情、错误路由和交互原语已通过真实浏览器 QA。指定的 9 个 viewport、reduced motion、forced colors、等效 200% reflow、文本间距、keyboard-only、灯箱、答案展开与 companion-only print 均有运行时证据。

站点页面错误、失败请求、破图、水平溢出、heading 裁切、控件重叠和小于 44 px 的可见控件均为 0。浏览器插件自身一次遥测超时不来自被测页面，也没有计入站点错误。

## Browsers and evidence boundary

- Primary：Codex in-app Chromium browser，用于 route、viewport、visual baseline 和主要交互。
- Secondary：Playwright CLI Chromium，用于 forced colors、reduced motion、print、inert 与精确键盘验证。
- Local origin：静态 HTTP server；无 server-side application behavior。
- Persistent release evidence：6 张 viewport WebP。
- Local-only mode evidence：short landscape、forced colors 与 print PDF 只记录 hash，不进入 Git 或 dist。
- 未声称物理设备或独立 screen-reader 实测；所有已要求的浏览器、DOM、键盘和媒体查询门禁均为真实运行时结果。

## Before capture

修改前记录 home、Carmela、Work Cells 的 desktop/mobile 和 Carmela detail 1024×400，共 7 张 local-only capture。6 个入口视图均无水平溢出或页面错误；详情页发现 1 个空 lightbox image source，P2 已用安全的本地占位资源修复。

Before capture SHA-256 inventory 保存在 `reports/portfolio/fr-p2/fr-p2-ui-baseline.json`，原图不进入仓库。

## Route matrix

| Route | Result |
|---|---|
| `#/` | two-series entrance；one main/H1；Home 无 breadcrumb |
| `#/series/carmela-season-1` | 12 book cards；书目语义与深层返回通过 |
| `#/series/work-cells` | 24 category sections；27 independent topic cards |
| `#/book/carmela-s1-01` | shared shell non-regression；native audio retained |
| `#/science/work-cells/streptococcus-pneumoniae` | science detail non-regression |
| invalid top route | explicit error；focus/title/announcement 正确 |
| invalid series/book/topic | explicit error；不静默回 Home |
| invalid section/category | explicit error；canonical target validation 正确 |

每个完整 route change 都更新 title、breadcrumb、live announcement 和 H1 focus。Carmela `book-10` 与 Work Cells `category-20` 的 detail/back 流程回到原系列深层位置；同页 `questions` target 聚焦到 `questions-title`，顶部位置为 96 px。

## Viewport matrix

入口三路由覆盖全部指定 viewport，共 27 个检查；两个代表性详情在 390×844、768×1024、1024×400、1440×900 共 8 个补充检查。

| Viewport | Entry routes | Detail routes | Overflow | Clipping | Small controls | Broken images |
|---:|---:|---:|---:|---:|---:|---:|
| 390×844 | 3 | 2 | 0 | 0 | 0 | 0 |
| 430×932 | 3 | — | 0 | 0 | 0 | 0 |
| 768×1024 | 3 | 2 | 0 | 0 | 0 | 0 |
| 1024×768 | 3 | — | 0 | 0 | 0 | 0 |
| 1280×720 | 3 | — | 0 | 0 | 0 | 0 |
| 1440×900 | 3 | 2 | 0 | 0 | 0 | 0 |
| 1024×400 | 3 | 2 | 0 | 0 | 0 | 0 |
| 844×390 | 3 | — | 0 | 0 | 0 | 0 |
| 667×375 | 3 | — | 0 | 0 | 0 | 0 |

1024×400、844×390、667×375 的 header 均为 static；667×375 的 category navigation 折叠为一个 44 px summary。390/430 mobile 使用单列 entry/book/topic 布局。

## Interaction matrix

### Keyboard and routing

- skip link 激活后 hash 保持 `#/`，焦点落到 `home-title`。
- breadcrumb 为 semantic nav，current item 非链接。
- category anchor、book deep link、Back/Forward 和 direct hash 均通过。
- Enter/Space 使用原生 anchor/button behavior。
- answer disclosure 从 `aria-expanded=false` 变为 `true`，answer 显示且焦点仍在 toggle。

### Lightbox

- dialog/label/modal semantics：PASS。
- opening focus：关闭按钮。
- forward/backward focus trap：PASS。
- ArrowLeft/ArrowRight：图片切换。
- Escape/close：PASS。
- background inert：真实 Chromium 显示 shell 与 skip link 均带 inert。
- opener focus restore：PASS。
- scroll restore：PASS。
- route-change cleanup：dialog 0、inert false、body overflow restored。
- mobile viewport boundary：PASS。

### Audio

原生 audio controls 保留；P2 没有改变 media loading、音频内容或详情 IA。view teardown 会暂停离开页面的 audio，避免旧 view 闭包继续活动。

## Media and accessibility modes

| Mode | Runtime evidence | Result |
|---|---|---|
| reduced motion | media query true；root scroll `auto`；card transition `0s` | PASS |
| forced colors | media query true；focus `Highlight solid 3px`；card border visible | PASS |
| equivalent 200% reflow | 640 px CSS viewport；single column；overflow 0；small controls 0 | PASS |
| text spacing | line/letter/word/paragraph spacing override；visible content clipping 0 | PASS |
| short landscape | 1024×400 / 844×390 / 667×375 | PASS |
| print | A4、11 pages；first 3 and final page visually inspected | PASS |

文本间距检查唯一越界元素为刻意以 1 px 方式移出视区的 polite live region；它不是可见内容裁切。

Print proof：

- header、breadcrumb、audio、controls、lightbox、page-image check：hidden；
- overview、review、scenes、questions、background、encyclopedia、parent guidance：printed；
- hidden answers：printed；
- page 1 同页包含 title 与 overview；
- final page 为 parent guidance；
- PDF SHA-256：`3d0ed7feb57b523e4efa98fbf19a31a32f84fafc5811e00cb7f54f7fa4de9ebc`。

## Persistent visual baseline

| File | Route | Viewport | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `screenshots/home-desktop.webp` | `#/` | 1440×900 | 51,808 | `87c94e79ff928ac3649029f24b039ab4291c681ed06eb4f0a34bd6bf5e24d142` |
| `screenshots/home-mobile.webp` | `#/` | 390×844 | 25,018 | `35917391a0b108b657910bbc5c0e84f9c7d468f35f607b9e28a50ee783b84993` |
| `screenshots/carmela-desktop.webp` | Carmela | 1440×900 | 64,534 | `06bbc59c03b40317e727657303023d44eead2b81c813cac957109688e72c92fd` |
| `screenshots/carmela-mobile.webp` | Carmela | 390×844 | 25,470 | `edda5913702432fa1da69d688f42e39508d485b056afa508588cc35a56a27bcb` |
| `screenshots/work-cells-desktop.webp` | Work Cells | 1440×900 | 55,696 | `8a5bea62d8bee864daf80624c34b44e67032d0994a13c3e8d52114946d1ee91d` |
| `screenshots/work-cells-mobile.webp` | Work Cells | 390×844 | 24,160 | `df5da184ca72ad66de7bc37a11f322f3916c1384b93e3c4ba4871965780f39d8` |

总量 246,686 B；每张小于 500 KB；最长边不超过 1,440 px；数量恰为 6；全部位于 docs，build 不复制到 dist。

## Local-only mode hashes

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| short landscape 1024×400 | 39,593 | `24fa59953cec91aa7460b7d835d7b8f0c07e04a95618c266b1dc83433043a294` |
| forced colors 1280×720 | 97,061 | `1727787690a140634bc93a29f8a5e62eda8196fc5d8d9df6aacd9fa1464a9ebc` |
| A4 companion print PDF | 1,423,822 | `3d0ed7feb57b523e4efa98fbf19a31a32f84fafc5811e00cb7f54f7fa4de9ebc` |

## Result

```text
ACCESSIBILITY_STATUS: PASS
RESPONSIVE_STATUS: PASS
SHORT_LANDSCAPE_STATUS: PASS
REDUCED_MOTION_STATUS: PASS
FORCED_COLORS_STATUS: PASS
PRINT_STATUS: PASS
VISUAL_BASELINE_STATUS: PASS
SITE_CONSOLE_ERRORS: 0
SITE_FAILED_REQUESTS: 0
QUALITY_COMPROMISES: 0
```
