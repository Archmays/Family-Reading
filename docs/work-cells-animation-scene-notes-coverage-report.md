# Work Cells Animation Scene Notes Coverage Report

## 本次处理主题

本次为《工作细胞》V2 第二批 5 个候选主题生成 summary-only、timecoded animation scene notes。所有输出均为内部分析数据；未接入前端，未修改 V2 manifest，未截图，未生成图片，未输出完整转写、完整对白、完整字幕、逐句翻译或可替代观看动画的完整剧情文本。

| topicId | topicName | matchConfidence | MP4 | SRT | sourceMode | scene notes |
| --- | --- | --- | --- | --- | --- | ---: |
| `food-poisoning` | 食物中毒 | `high` | `S1-第4话 食物中毒-1080P 高清-AVC.mp4` | `S1-第4话 食物中毒-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `common-cold-syndrome` | 感冒症候群 | `high` | `S1-OAD 感冒综合征-1080P 高清-AVC.mp4` | `S1-OAD 感冒综合征-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `staphylococcus-aureus` | 金黄色葡萄球菌 | `high` | `S1-第10话 金黄色葡萄球菌-1080P 高清-AVC.mp4` | `S1-第10话 金黄色葡萄球菌-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `gut-microbiota` | 肠道菌群 | `high` | `S2-第6话 有害菌-1080P 高清-AVC.mp4` | none | `audio-fallback` | 8 |
| `bump-on-head` | 撞出肿包 | `high` | `S2-第1话 肿包-1080P 高清-AVC.mp4` | none | `audio-fallback` | 8 |

## Audio Fallback

`gut-microbiota` 和 `bump-on-head` 没有同名 SRT，因此本次使用 audio-fallback。安装并使用了用户缓存目录中的便携版 `ffmpeg 8.1.1-essentials_build`，只从对应 MP4 临时抽取单声道 16 kHz WAV 供 `faster-whisper-tiny` 做时间窗级分析。临时音频已删除，未保存 transcript，未把音频或转写写入项目文件。

`gut-microbiota` 已由用户确认与肠道菌群主题完全匹配，匹配置信度更新为 `high`。本主题 scene notes 仍保守聚焦肠道生态、有益菌/有害菌平衡、黏膜屏障和免疫协作；后续若要选截图或进入前端，仍需按发布标准筛选候选时间点。

## 输出文件

- `data-private/cells-at-work/animation/scene-notes/food-poisoning.v2.json`
- `data-private/cells-at-work/animation/scene-notes/common-cold-syndrome.v2.json`
- `data-private/cells-at-work/animation/scene-notes/staphylococcus-aureus.v2.json`
- `data-private/cells-at-work/animation/scene-notes/gut-microbiota.v2.json`
- `data-private/cells-at-work/animation/scene-notes/bump-on-head.v2.json`

## 可帮助后续内容优化的 scene notes

`topicOverview`:

- `food-poisoning` 的 `food-poisoning-s1e04-v2-002`、`v2-004`、`v2-007` 可帮助梳理有害细菌或毒素、排出反应、恢复稳态的因果链。
- `common-cold-syndrome` 的 `common-cold-syndrome-s1oad-v2-001`、`v2-003`、`v2-005` 可帮助把感冒症候群拆成上呼吸道入口、喷嚏鼻涕咳嗽、防御症状组合。
- `staphylococcus-aureus` 的 `staphylococcus-aureus-s1e10-v2-001`、`v2-002`、`v2-007` 可帮助说明皮肤屏障、金黄色葡萄球菌和局部感染因果链。
- `gut-microbiota` 的 `gut-microbiota-s2e06-v2-001`、`v2-004`、`v2-008` 可帮助建立肠道菌群是生态系统，而非单一细菌角色。
- `bump-on-head` 的 `bump-on-head-s2e01-v2-002`、`v2-004`、`v2-007` 可帮助解释撞击、小血管受损、肿胀和恢复阶段。

`bodyScienceStations`:

- `food-poisoning-s1e04-v2-004`、`v2-005`、`v2-007` 适合转化为食物中毒排出机制、免疫清理和脱水风险小站。
- `common-cold-syndrome-s1oad-v2-003`、`v2-004`、`v2-006` 适合转化为鼻涕喷嚏咳嗽、免疫工作量和四步感染反应小站。
- `staphylococcus-aureus-s1e10-v2-003`、`v2-005`、`v2-006` 适合转化为趋化、吞噬、炎症和免疫细胞分工小站。
- `gut-microbiota-s2e06-v2-003`、`v2-004`、`v2-006` 适合转化为黏膜屏障、有益菌竞争占位和营养影响菌群的小站。
- `bump-on-head-s2e01-v2-003`、`v2-005`、`v2-006` 适合转化为血小板止血、纤维蛋白加固和肿胀吸收恢复小站。

`parentQuestionCards`:

- `food-poisoning` 可增加“身体为什么会想把有害物排出去”“食物中毒和细菌/毒素有什么关系”。
- `common-cold-syndrome` 可增加“喷嚏鼻涕咳嗽是在做什么”“为什么感冒时需要休息”。
- `staphylococcus-aureus` 可增加“皮肤屏障为什么重要”“红肿热痛和免疫反应有什么关系”。
- `gut-microbiota` 可增加“肠道里为什么不该把所有细菌都当坏人”“菌群平衡是什么意思”。
- `bump-on-head` 可增加“撞到头为什么会鼓起来”“血小板止血和肿包消退是不是一回事”。

`imagePromptDocs`:

- `food-poisoning` 可用原创肠道剖面、细菌/毒素图标、排出反应和恢复流程图，让后续配图更直观。
- `common-cold-syndrome` 可用原创上呼吸道黏膜、黏液纤毛清理、症状地图和恢复支持图。
- `staphylococcus-aureus` 可用原创皮肤屏障、成簇小球状细菌、白细胞趋化和炎症剖面图。
- `gut-microbiota` 可用原创肠道生态图、菌群天平、有益菌占位和黏膜免疫三层关系图。
- `bump-on-head` 可用原创皮下肿胀剖面、小血管渗出、血小板封堵和吸收恢复流程图。

## 仍不进入前端的内容

- MP4、SRT、抽取音频、transcript、完整字幕、完整对白、逐句翻译。
- `data-private/cells-at-work/animation/scene-notes/` 下的完整 scene notes。
- screenshot-candidates、review-contact-sheets、未筛选动画截图。
- 可替代观看动画的完整剧情文本。
- 医疗诊断、用药指导、头部外伤自行判断流程或让孩子自行判断病情的内容。

## 当前累计有 scene notes 的主题

当前已有 V2 scene notes 的主题：

- `pneumococcus`
- `cedar-pollen-allergy`
- `influenza`
- `abrasion`
- `food-poisoning`
- `heatstroke`
- `blood-circulation`
- `common-cold-syndrome`
- `staphylococcus-aureus`
- `hemorrhagic-shock`
- `gut-microbiota`
- `bump-on-head`

另有旧试点样例文件仍保留在 private 路径中：`pneumococcus.sample.json`、`hemorrhagic-shock.sample.json`。
