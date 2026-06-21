# 工作细胞 V2 全站体验验收报告

日期：2026-06-21

## 结论

QA 结论：不通过。

结构、资源、构建和 dist 安全检查通过；27 个主题均可进入详情页，每个主题都有 4 张身体科学小站卡片和 6 张亲子问题卡，108 张正式小站 WebP 图片存在且页面保持 lazy loading。

上线阻断项：4 个主题存在大量用户可见 `????` 乱码，占位内容覆盖主题导读、身体科学小站、亲子问题卡、家长共读提示和来源备注等页面核心区域：

- 白细胞左移（`left-shift` / `left-shift-of-white-blood-cells`）
- iPS细胞（`ips-cells` / `induced-pluripotent-stem-cells`）
- 银屑病（干癣）（`psoriasis`）
- 新型冠状病毒（`covid-19` / `novel-coronavirus`）

其中新型冠状病毒详情页在移动端被连续 `????` 撑出横向滚动，截图检查可见内容溢出屏幕。该问题不是轻微错别字，需要人工确认或按原资料恢复内容，不应在本次验收中临场重写。

建议：进入 Phase 24 做上述 4 个主题的内容恢复和移动端复验；不建议直接进入 Phase 25。

## 验收方法

- 静态数据检查：解析 `public/books/index.json` 和《工作细胞》manifest，核对主题数、栏目数据、卡片计数、图片路径、动画绑定边界和敏感主题字段。
- 浏览器验收：本地构建后用 `http://127.0.0.1:4173/` 检查首页、工作细胞列表页、正常敏感主题详情页和乱码主题详情页，覆盖桌面默认视口与 390px 移动视口。
- 构建与资源审计：运行指定验证、测试、构建和 dist asset audit。

## 1. 27 个主题访问结果

全部 27 个主题详情路由均可打开，未出现错误页。

| # | topicId | slug | 标题 | 来源 | 访问 | 备注 |
|---:|---|---|---|---|---|---|
| 1 | pneumococcus | streptococcus-pneumoniae | 肺炎链球菌 | 第1卷 第1话 | 通过 | 内容可读 |
| 2 | cedar-pollen-allergy | cedar-pollen-allergy | 杉树花粉过敏 | 第1卷 第2话 | 通过 | 内容可读 |
| 3 | influenza | influenza | 流行性感冒 | 第1卷 第3话 | 通过 | 内容可读 |
| 4 | abrasion | abrasion | 擦伤 | 第1卷 第4话 | 通过 | 内容可读 |
| 5 | food-poisoning | food-poisoning | 食物中毒 | 第2卷 第5话 | 通过 | 内容可读 |
| 6 | heatstroke | heatstroke | 中暑 | 第2卷 第6话 | 通过 | 内容可读 |
| 7 | erythroblast-and-bone-marrow-cell | erythroblast-and-myelocyte | 红血球母细胞与骨髓细胞 | 第2卷 第7话 | 通过 | 内容可读 |
| 8 | cancer-cell | cancer-cell | 癌细胞 | 第2卷 第8-9话 | 通过 | 内容可读 |
| 9 | blood-circulation | blood-circulation | 血液循环 | 第3卷 第10话 | 通过 | 内容可读 |
| 10 | common-cold-syndrome | common-cold-syndrome | 感冒症候群 | 第3卷 第11话 | 通过 | 内容可读 |
| 11 | thymocyte | thymocyte | 胸腺细胞 | 第3卷 第12话 | 通过 | 内容可读 |
| 12 | acquired-immunity | adaptive-immunity | 获得性免疫 | 第3卷 第13话 | 通过 | 内容可读 |
| 13 | acne | acne | 痤疮 | 第3卷 第14话 | 通过 | 内容可读 |
| 14 | staphylococcus-aureus | staphylococcus-aureus | 金黄色葡萄球菌 | 第4卷 第15话 | 通过 | 内容可读 |
| 15 | dengue-fever | dengue-fever | 登革热 | 第4卷 第16话 | 通过 | 内容可读 |
| 16 | hemorrhagic-shock | hemorrhagic-shock | 出血性休克 | 第4卷 第17-18话 | 通过 | 内容可读 |
| 17 | peyers-patches | peyers-patches | 派尔斑 | 第4卷 第19话 | 通过 | 内容可读 |
| 18 | helicobacter-pylori | helicobacter-pylori | 幽门螺杆菌 | 第5卷 第20话 | 通过 | 内容可读 |
| 19 | antigenic-variation | antigenic-variation | 抗原变异 | 第5卷 第21话 | 通过 | 内容可读 |
| 20 | cytokines | cytokines | 细胞因子 | 第5卷 第22话 | 通过 | 内容可读 |
| 21 | gut-microbiota | gut-microbiota | 肠道菌群 | 第5卷 第23话 | 通过 | 内容可读 |
| 22 | cancer-cell-ii | cancer-cell-ii | 癌细胞Ⅱ | 第5卷 第24-25话 | 通过 | 内容可读 |
| 23 | bump-on-head | bump-on-head | 撞出肿包 | 第6卷 第26话 | 通过 | 内容可读 |
| 24 | left-shift | left-shift-of-white-blood-cells | 白细胞左移 | 第6卷 第27话 | 失败 | 页面核心内容含大量 `????` |
| 25 | ips-cells | induced-pluripotent-stem-cells | iPS细胞 | 第6卷 第28话 | 失败 | 页面核心内容含大量 `????` |
| 26 | psoriasis | psoriasis | 银屑病（干癣） | 第6卷 特别篇 | 失败 | 页面核心内容含大量 `????` |
| 27 | covid-19 | novel-coronavirus | 新型冠状病毒 | 第6卷 第29话 | 失败 | 页面核心内容含大量 `????`，移动端横向溢出 |

## 2. 每个主题栏目完整性

浏览器检查确认 27 个主题详情页均显示以下栏目标题：

- 主题导读
- 身体科学小站
- 亲子问题卡
- 家长共读提示
- 来源备注

数据计数确认：

- 每个主题 `bodyScienceStations.length === 4`
- 每个主题 `parentQuestionCards.length === 6`
- 全站共 108 张小站卡片，162 张亲子问题卡

阻断说明：4 个主题虽然栏目存在且计数正确，但栏目正文存在大量 `????`，不能视为内容验收通过。

## 3. 图片加载检查

通过项：

- 108 个小站 `imageAsset` 均存在。
- 108 个小站 `imageAsset` 均为 `.webp`。
- `public/assets/cells-at-work/science-station` 仅包含 108 个 `.webp` 文件，未发现 PNG/JPG。
- 浏览器复核全站小站正式图均使用 `loading="lazy"`。
- 页面源码保留图片错误监听和 `.cover-fallback` / `.thumbnail-missing` 占位逻辑。

说明：浏览器中隐藏 lightbox 的空 `<img>` 在未打开前没有 `src`，曾被自动计入 1 个 broken image；该元素不是资源加载失败，已排除。

## 4. 桌面端 / 移动端体验检查

桌面端：

- 首页：2 个入口，未空白，无控制台错误，无横向溢出。
- 工作细胞列表页：27 个主题卡片，未按卷分组展示，无控制台错误，无横向溢出。
- 癌细胞详情页：栏目和图片正常，无横向溢出。
- 新型冠状病毒详情页：出现 `????`，并因连续乱码造成轻微横向溢出。

移动端 390px：

- 首页：2 个入口，未空白，无明显错位。
- 工作细胞列表页：27 个主题卡片纵向排列，未按卷分组展示，无明显错位。
- 癌细胞详情页：无横向溢出。
- 新型冠状病毒详情页：出现明显横向溢出，内容和按钮被撑出屏幕。根因是连续 `????` 字符串不可自然换行。

## 5. 敏感主题语气检查

通过：

- 癌细胞：明确说明医学拟人化、现实癌症问题需专业医务人员判断，不把癌细胞简单道德化。
- 癌细胞Ⅱ：强调癌细胞是自身细胞异常变化，不把疾病或患者道德化；保留 audio-fallback 和人工复核提醒。
- 出血性休克：区分普通小擦伤和大量出血，提醒严重出血寻求专业帮助，不替代急救训练或医学建议。
- 登革热：只做科普伴读，不提供症状自查、诊断或治疗建议，保留 audio-fallback 和主题边界提醒。

无法通过，需要人工处理：

- 新型冠状病毒：核心文案大量 `????`，无法判断语气是否温和准确；移动端还因乱码溢出。
- iPS细胞：核心文案大量 `????`，无法判断语气和科学准确性。
- 银屑病（干癣）：核心文案大量 `????`，无法判断是否避免羞辱性或恐吓性表达。
- 白细胞左移：核心文案大量 `????`，无法判断医学边界和亲子语气。

## 6. Legacy / in-progress 残留检查

通过项：

- 首页只显示“不一样的卡梅拉”和“工作细胞”两个入口。
- 工作细胞列表按 27 个主题展示，不按卷分组展示。卡片中保留来源标签如“第6卷 第29话”，这是来源备注，不是卷导航。
- 27/27 主题均为 `contentVersion: work-cells-v2`，实际页面未显示“V2 内容制作中”。
- `V2 内容制作中` 字符串仍保留在前端非 V2 fallback 分支中，但当前正式 27 个主题不会进入该状态。
- 未恢复漫画全文浏览、页面标注浏览、百科独立路由或动画播放器。
- 未发现正式小站图引用 PNG 或旧版低质量资源。

## 7. 重点边界复核

通过项：

- `cancer-cell` 与 `cancer-cell-ii` 独立显示，列表中分别为“癌细胞”和“癌细胞Ⅱ”，来源分别为第2卷第8-9话与第5卷第24-25话。
- `hemorrhagic-shock` 是第4卷第17-18话合并主题。
- `covid-19` 的 topicId 对应路由 slug `novel-coronavirus`，来源仍为第6卷第29话，没有标成第30话。
- `covid-19`、`left-shift`、`ips-cells`、`psoriasis` 的 `relatedAnimationScenes` 均为空，没有强行绑定动画资源。
- `audio-fallback`、`medium confidence` / `medium-confidence` 和 `needs-human-review` 提醒仍保留在 manifest 数据层。
- 前端只展示摘要、页码线索、关键词和小站/问题内容；未展示漫画全文、动画全文、完整对白、完整字幕或完整 OCR。

## 8. 资源与 dist 安全检查

`node scripts/audit-dist-assets.mjs` 通过。

- dist 体积：799.15 MB（837,966,472 bytes）
- 限制：900 MB
- 状态：OK

dist 禁发项检查：

| 项目 | 结果 |
|---|---|
| Work Cells PNG 原图 | 未发现 |
| MP4 | 未发现 |
| SRT / 字幕文件 | 未发现 |
| 抽取音频 / audio-fallback 文件夹 | 未发现 |
| transcript / transcripts | 未发现 |
| scene-notes | 未发现 |
| screenshot-candidates | 未发现 |
| pages-by-volume | 未发现 |
| visual-annotation-bundles | 未发现 |
| ZIP / 压缩包 | 未发现 |

## 9. 已修复问题列表

本次未修复主题内容。原因：4 个主题的乱码覆盖范围较大，涉及导读、小站卡、问题卡、家长提示和来源备注，属于需要按原资料恢复或人工确认的大问题，不应在验收阶段擅自重写。

本次新增验收报告：`docs/work-cells-v2-ux-qa-report.md`。

## 10. 仍需人工判断的问题列表

阻断项：

1. 修复 `left-shift`、`ips-cells`、`psoriasis`、`covid-19` 四个主题的用户可见 `????` 字段。
2. 修复后重新检查这 4 个主题的敏感主题语气，确认不恐吓、不替代医学建议。
3. 修复后重新做 390px 移动端检查，确认新型冠状病毒等主题不再横向溢出。
4. 建议补充自动化测试：阻止 V2 用户可见字段出现连续 `????`，避免现有测试通过但页面内容不可读。

## 11. 验证命令结果

| 命令 | 结果 |
|---|---|
| `node scripts/validate-work-cells-visual-annotations.mjs` | 通过，27 个主题，991 条 page annotation，0 missing image，0 warning |
| `node --test tests/mvp.test.mjs` | 通过，38/38 |
| `node scripts/build.mjs` | 通过，已写入 `dist` |
| `node scripts/audit-dist-assets.mjs` | 通过，dist 799.15 MB，低于 900 MB |

## 12. 阶段建议

建议进入 Phase 24，不建议直接进入 Phase 25。

Phase 24 建议目标：仅恢复 4 个乱码主题的正式 V2 文案，并补上 `????` 防回归测试；不新增主题，不生成图片，不接入动画截图，不恢复漫画全文相关功能。修复后再执行本报告同一套验证。
