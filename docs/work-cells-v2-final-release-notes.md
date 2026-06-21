# 工作细胞 V2 最终发布说明

完成日期：2026-06-22  
封版复核基准 commit：`7132670`  
发布对象：《工作细胞》V2 topic-based companion data

## 封版结论

《工作细胞》V2 全量重构已进入封版状态。当前 manifest 中共有 27 个主题，27/27 均为 `contentVersion: work-cells-v2`。每个主题都有主题导读、4 张身体科学小站卡、6 张亲子问题卡、家长共读提示、来源备注、漫画页码线索、动画摘要线索字段、内容状态和质量边界标记。

当前版本不提供漫画全文、动画全文、完整对白、完整字幕、完整 OCR、漫画全文浏览、完整页面标注浏览、百科独立路由或动画播放器。

## 27 个 V2 主题清单

| # | topicId | 标题 | 漫画来源 | 小站 | 问题卡 | WebP 图 | 动画摘要场景 |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | `pneumococcus` | 肺炎链球菌 | 第1卷 第1话 | 4 | 6 | 4 | 1 |
| 2 | `cedar-pollen-allergy` | 杉树花粉过敏 | 第1卷 第2话 | 4 | 6 | 4 | 1 |
| 3 | `influenza` | 流行性感冒 | 第1卷 第3话 | 4 | 6 | 4 | 1 |
| 4 | `abrasion` | 擦伤 | 第1卷 第4话 | 4 | 6 | 4 | 1 |
| 5 | `food-poisoning` | 食物中毒 | 第2卷 第5话 | 4 | 6 | 4 | 3 |
| 6 | `heatstroke` | 中暑 | 第2卷 第6话 | 4 | 6 | 4 | 1 |
| 7 | `erythroblast-and-bone-marrow-cell` | 红血球母细胞与骨髓细胞 | 第2卷 第7话 | 4 | 6 | 4 | 3 |
| 8 | `cancer-cell` | 癌细胞 | 第2卷 第8-9话 | 4 | 6 | 4 | 3 |
| 9 | `blood-circulation` | 血液循环 | 第3卷 第10话 | 4 | 6 | 4 | 1 |
| 10 | `common-cold-syndrome` | 感冒症候群 | 第3卷 第11话 | 4 | 6 | 4 | 3 |
| 11 | `thymocyte` | 胸腺细胞 | 第3卷 第12话 | 4 | 6 | 4 | 3 |
| 12 | `acquired-immunity` | 获得性免疫 | 第3卷 第13话 | 4 | 6 | 4 | 3 |
| 13 | `acne` | 痤疮 | 第3卷 第14话 | 4 | 6 | 4 | 2 |
| 14 | `staphylococcus-aureus` | 金黄色葡萄球菌 | 第4卷 第15话 | 4 | 6 | 4 | 3 |
| 15 | `dengue-fever` | 登革热 | 第4卷 第16话 | 4 | 6 | 4 | 4 |
| 16 | `hemorrhagic-shock` | 出血性休克 | 第4卷 第17-18话 | 4 | 6 | 4 | 2 |
| 17 | `peyers-patches` | 派尔斑 | 第4卷 第19话 | 4 | 6 | 4 | 2 |
| 18 | `helicobacter-pylori` | 幽门螺杆菌 | 第5卷 第20话 | 4 | 6 | 4 | 2 |
| 19 | `antigenic-variation` | 抗原变异 | 第5卷 第21话 | 4 | 6 | 4 | 2 |
| 20 | `cytokines` | 细胞因子 | 第5卷 第22话 | 4 | 6 | 4 | 2 |
| 21 | `gut-microbiota` | 肠道菌群 | 第5卷 第23话 | 4 | 6 | 4 | 3 |
| 22 | `cancer-cell-ii` | 癌细胞Ⅱ | 第5卷 第24-25话 | 4 | 6 | 4 | 2 |
| 23 | `bump-on-head` | 撞出肿包 | 第6卷 第26话 | 4 | 6 | 4 | 3 |
| 24 | `left-shift` | 白细胞左移 | 第6卷 第27话 | 4 | 6 | 4 | 0 |
| 25 | `ips-cells` | iPS细胞 | 第6卷 第28话 | 4 | 6 | 4 | 0 |
| 26 | `psoriasis` | 银屑病 | 第6卷 特别篇 | 4 | 6 | 4 | 0 |
| 27 | `covid-19` | 新型冠状病毒 | 第6卷 第29话 | 4 | 6 | 4 | 0 |

## 动画 Scene Notes 覆盖

- 23 个主题有 `relatedAnimationScenes` 摘要线索。
- 23 个有动画摘要场景的主题均有对应 `data-private/cells-at-work/animation/scene-notes/*.v2.json` 文件。
- `data-private/cells-at-work/animation/scene-notes/` 还保留 `pneumococcus.sample.json` 和 `hemorrhagic-shock.sample.json` 作为私有样例。
- scene notes 只作为 summary-only、timecoded 的私有分析数据，不发布 MP4、SRT、完整对白、完整字幕、完整转写或截图候选集。

## 无可靠动画匹配主题

以下主题不得强行绑定动画资源，`relatedAnimationScenes` 保持为空，并在 `contentStatus` / `qualityFlags` / `sourceNotes` 中保留无可靠匹配说明：

- `left-shift`：白细胞左移
- `ips-cells`：iPS细胞
- `psoriasis`：银屑病
- `covid-19`：新型冠状病毒，第6卷第29话

## Audio Fallback 与人工复核

以下主题保留 `audio-fallback` 和 `needs-human-review` 提醒：

- `acquired-immunity`：获得性免疫
- `acne`：痤疮
- `dengue-fever`：登革热
- `peyers-patches`：派尔斑
- `helicobacter-pylori`：幽门螺杆菌
- `antigenic-variation`：抗原变异
- `cytokines`：细胞因子
- `cancer-cell-ii`：癌细胞Ⅱ

其中 `acne`、`peyers-patches`、`antigenic-variation` 还保留 `medium-confidence` / `mediumConfidenceNeedsHumanReview` 边界提醒。相关动画线索只作摘要级参考，不能直接作为前端播放器、对白展示或完整字幕来源。

## 关键边界

- `cancer-cell` 与 `cancer-cell-ii` 是两个独立主题，不能合并。
- `cancer-cell` 来源为第2卷第8-9话；`cancer-cell-ii` 来源为第5卷第24-25话。
- `hemorrhagic-shock` 是第4卷第17-18话合并后的一个主题。
- `covid-19` 是第6卷第29话，不得标成第30话。
- `covid-19`、`left-shift`、`ips-cells`、`psoriasis` 不绑定动画资源。
- 敏感主题只做亲子科普伴读，不替代医学建议，不输出诊断、治疗或用药判断。

## 资源发布规则

- 用户生成的 PNG 原图保留在 `data/cells-at-work/source-assets/science-station/<topicId>/png-originals/`。
- Codex 只负责把用户提供的 PNG 转为正式 WebP，并更新清单引用。
- Codex 不得自行生成《工作细胞》V2 正式小站图。
- `public/assets/cells-at-work/science-station/` 只放正式 WebP。
- `dist` 不得包含 Work Cells PNG 原图、MP4、SRT、抽取音频、transcript、scene-notes、screenshot-candidates、pages-by-volume、visual-annotation-bundles、ZIP 或压缩包。
- `dist` 体积必须保持低于 900 MB。

## 图片工作流

1. 用户先生成并确认 PNG。
2. PNG 原图归档到 `data/cells-at-work/source-assets/science-station/<topicId>/png-originals/`。
3. Codex 将确认后的 PNG 转换为 WebP。
4. WebP 发布到 `public/assets/cells-at-work/science-station/<topicId>/<topicId>-v2-station-0N.webp`。
5. manifest 中 `imageAsset` 只引用 WebP，`imagePromptStatus` / `imageAssetStatus` 保持 ready 或等效状态。
6. 不重写已确认 prompt，不重新生成图片，不把 PNG 原图放入 `public` 或 `dist`。

## 禁止恢复的功能

- 漫画全文阅读器。
- 完整漫画页面浏览。
- 页面标注浏览器。
- 百科独立路由。
- 动画播放器。
- 完整对白、完整字幕、完整 OCR 或完整 transcript 展示。

## 后续维护建议

- 新增或修改主题前先运行维护检查清单。
- 任何动画素材处理都应保持在 `data-private/` 或其他私有路径。
- 若未来需要清理 `dist` 体积，应另开独立 phase 处理，不混入主题内容维护。
- 若调整敏感主题文案，应保持小范围修改，并重新跑全量测试、构建和 dist 审计。
