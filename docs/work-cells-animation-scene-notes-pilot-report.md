# Phase 9 工作细胞动画 Scene Notes 试点报告

## 处理范围

本次只处理 3 个 V2 主题，输出内部分析数据，不接入前端：

| topicId | topicName | MP4 | SRT | scene notes |
| --- | --- | --- | --- | ---: |
| `pneumococcus` | 肺炎链球菌 | `S1-第1话 肺炎链球菌-1080P 高清-AVC.mp4` | `S1-第1话 肺炎链球菌-1080P 高清-AVC_English.srt` | 8 |
| `cedar-pollen-allergy` | 杉树花粉过敏 | `S1-第5话 杉木花粉过敏-1080P 高清-AVC.mp4` | `S1-第5话 杉木花粉过敏-1080P 高清-AVC_English.srt` | 8 |
| `influenza` | 流行性感冒 | `S1-第3话 流行性感冒-1080P 高清-AVC.mp4` | `S1-第3话 流行性感冒-1080P 高清-AVC_English.srt` | 8 |

输出文件：

- `data-private/cells-at-work/animation/scene-notes/pneumococcus.v2.json`
- `data-private/cells-at-work/animation/scene-notes/cedar-pollen-allergy.v2.json`
- `data-private/cells-at-work/animation/scene-notes/influenza.v2.json`

## SRT 质量

- 3 个主题均匹配到同名规则的英文 SRT。
- 本次未发现缺失 SRT；因此使用 `sourceMode: srt`，未抽音频。
- SRT 可用于摘要型 scene notes：时间轴完整，cue 数量分别为 454、397、360。
- 本次没有输出完整英文字幕、完整中文对白或逐句翻译。

## 后续缺 SRT 时的音频 fallback 规则

- 优先使用同名 SRT。
- 如果没有同名 SRT，允许从对应 MP4 抽取音频，只用于补充分析并生成摘要型 timecoded scene notes。
- 音频 fallback 的 scene notes 必须继续是 summary-only，并写入 `sourceMode: audio-fallback`。
- 不输出完整音频转写。
- 不输出完整中文对白。
- 不输出完整英文字幕。
- 不做逐句翻译。
- 不生成可替代观看动画的完整剧情文本。
- 音频中间文件不得进入 `public` 或 `dist`；transcript 临时文件、scene-notes 和 screenshot-candidates 也不得进入 `dist`。
- 如果环境缺少可用本地音频/转写工具，应停止并报告；不要安装重依赖，也不要上传到外部服务。

## 改进建议

`topicOverview`：

- `pneumococcus` 可更明确地区分红血球运输、白血球防卫、病原体入侵三条线。
- `cedar-pollen-allergy` 可突出“花粉不是病原体，但可能触发过强免疫反应”。
- `influenza` 可强化病毒感染、抗原呈递、T 细胞响应与生活防护之间的顺序。

`bodyScienceStations`：

- `pneumococcus` 可把“细菌 vs 病毒”“红血球 vs 白血球 vs 血小板分工”做成更直观的小站补充。
- `cedar-pollen-allergy` 可把花粉、IgE、肥大细胞、组胺、症状做成四步因果链。
- `influenza` 可增加“发现病毒 -> 传递信息 -> 激活T细胞 -> 控制感染细胞”的低龄化流程图。

`parentQuestionCards`：

- 问题卡可以增加“这一步身体是在识别、报警、运输还是清理？”一类分类问题。
- 生活连接问题应保持家庭常识层级：遮挡口鼻、洗手、减少花粉接触、休息等。
- 医疗判断和用药问题不应交给孩子或前端内容直接回答。

`imagePromptDocs`：

- 解释图 prompt 可以引用 scene notes 的科学节点，但不应仿动画截图、角色造型、构图或台词。
- prompt 应强调原创科普图、无对白、无 logo、无水印、无可识别动画分镜。
- 每个主题可增加一张复盘图：关键对象、流程箭头、症状或身体反应的因果链。

## 仍不应进入前端的内容

- MP4、SRT、完整字幕、完整对白、逐句翻译。
- `data-private/cells-at-work/animation/scene-notes/` 下的内部 scene notes。
- screenshot candidates、review contact sheets、未筛选动画截图。
- 可替代观看动画的完整剧情复述。
- 医疗诊断、用药指导或让孩子自行判断病情的内容。

## Phase 10 建议

可以把本次 3 个主题的 scene notes 作为下一批 V2 主题样板，但 Phase 10 仍应遵守以下边界：

- 优先使用已有同名 SRT；缺 SRT 时允许抽取对应 MP4 音频做补充分析，但只生成摘要型 timecoded scene notes。
- 继续只生成摘要型、带时间点的内部数据。
- 若要进入前端，必须先另做“减量公开版”设计，只保留原创科普用途字段。
- 继续用构建和 dist audit 确认 MP4、SRT、音频抽取文件、transcript 临时文件、scene-notes、screenshot-candidates、review-contact-sheets 不进入 `dist`。
