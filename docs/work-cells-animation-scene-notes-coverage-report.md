# Work Cells Animation Scene Notes Coverage Report

## 本次处理主题

本次为 4 个已完成 V2 主题补齐 summary-only、timecoded scene notes。所有输出均为内部分析数据，未接入前端，未截图，未抽取音频。

| topicId | topicName | MP4 | SRT | sourceMode | scene notes |
| --- | --- | --- | --- | --- | ---: |
| `abrasion` | 擦伤 | `S1-第2话 擦伤-1080P 高清-AVC.mp4` | `S1-第2话 擦伤-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `heatstroke` | 中暑 | `S1-第11话 中暑-1080P 高清-AVC.mp4` | `S1-第11话 中暑-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `blood-circulation` | 血液循环 | `S1-第8话 血液循环-1080P 高清-AVC.mp4` | `S1-第8话 血液循环-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `hemorrhagic-shock` | 出血性休克 | `S1-第12话 失血性休克 前篇-1080P 高清-AVC.mp4`; `S1-第13话 失血性休克 后篇-1080P 高清-AVC.mp4` | `S1-第12话 失血性休克 前篇-1080P 高清-AVC_English.srt`; `S1-第13话 失血性休克 后篇-1080P 高清-AVC_English.srt` | `srt` | 12 |

## Audio Fallback

本次 4 个主题均匹配到同名 SRT，因此没有使用 `audio-fallback`，没有从 MP4 抽取音频，也没有生成 transcript。`hemorrhagic-shock` 保留前篇和后篇两个 episode 来源，但仍只生成一个主题文件：`data-private/cells-at-work/animation/scene-notes/hemorrhagic-shock.v2.json`。

## 输出文件

- `data-private/cells-at-work/animation/scene-notes/abrasion.v2.json`
- `data-private/cells-at-work/animation/scene-notes/heatstroke.v2.json`
- `data-private/cells-at-work/animation/scene-notes/blood-circulation.v2.json`
- `data-private/cells-at-work/animation/scene-notes/hemorrhagic-shock.v2.json`

## 可帮助优化的内容

`topicOverview`:
- `abrasion` 可补强“皮肤/血管屏障破损、细菌入侵、血小板止血、纤维蛋白加固”的顺序。
- `heatstroke` 可补强“高温、出汗散热失败、脱水、降温补水、恢复”的因果链。
- `blood-circulation` 可补强“心脏泵血、肺循环、体循环、毛细血管交换”的闭环。
- `hemorrhagic-shock` 可补强“血容量下降、血压下降、供氧不足、外部急救支持”的系统性说明。

`bodyScienceStations`:
- `abrasion` 的 `abrasion-s1e02-v2-002`、`006`、`008` 适合转化为止血流程、血小板聚集、纤维蛋白加固小站。
- `heatstroke` 的 `heatstroke-s1e11-v2-003`、`005`、`006` 适合转化为出汗散热、脱水、降温补水小站。
- `blood-circulation` 的 `blood-circulation-s1e08-v2-003`、`005`、`007`、`008` 适合转化为心脏泵血、毛细血管交换、肺泡取氧和循环闭环小站。
- `hemorrhagic-shock` 的 `hemorrhagic-shock-s1e12-v2-004`、`005`、`hemorrhagic-shock-s1e13-v2-003`、`006` 适合转化为出血性休克因果链和恢复机制小站。

`parentQuestionCards`:
- `abrasion` 可增加“擦伤为什么要清洁”“血小板和白细胞分工不同吗”。
- `heatstroke` 可增加“为什么出汗不一定降温”“为什么中暑风险出现时要离开热环境”。
- `blood-circulation` 可增加“红细胞的旅行为什么叫循环”“毛细血管为什么要很细”。
- `hemorrhagic-shock` 可增加“严重出血为什么要马上找成人和专业帮助”“医学上的休克和害怕有什么不同”。

`imagePromptDocs`:
- `abrasion` 可用原创剖面图表达小破口、血小板聚集、纤维蛋白网加固。
- `heatstroke` 可用原创因果链表达高温、汗液蒸发、脱水、降温补水。
- `blood-circulation` 可用原创路线图表达心脏、肺、全身组织和毛细血管交换。
- `hemorrhagic-shock` 可用严肃但不恐怖的信息图表达失血、血容量下降、血压下降、供氧不足和急救支持。

## 仍不进入前端的内容

- MP4、SRT、抽取音频、transcript、完整字幕、完整对白、逐句翻译。
- `data-private/cells-at-work/animation/scene-notes/` 下的完整 scene notes。
- screenshot-candidates、review-contact-sheets、未筛选动画截图。
- 可替代观看动画的完整剧情文本。
- 医疗诊断、用药指导或让孩子自行判断病情的内容。

## 当前累计有 scene notes 的主题

当前有 V2 scene notes 的主题：

- `pneumococcus`
- `cedar-pollen-allergy`
- `influenza`
- `abrasion`
- `heatstroke`
- `blood-circulation`
- `hemorrhagic-shock`

另有旧试点样例文件仍保留在 private 路径中：`pneumococcus.sample.json`、`hemorrhagic-shock.sample.json`。
