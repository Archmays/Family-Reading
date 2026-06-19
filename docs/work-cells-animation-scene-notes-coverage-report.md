# Work Cells Animation Scene Notes Coverage Report

## 本次处理主题

本次为《工作细胞》V2 第三批 5 个候选主题生成 summary-only、timecoded animation scene notes。所有输出均为内部分析数据；未接入前端，未修改 V2 manifest，未截图，未生成图片，未输出完整转写、完整对白、完整字幕、逐句翻译或可替代观看动画的完整剧情文本。

| topicId | topicName | matchConfidence | MP4 | SRT | sourceMode | scene notes |
| --- | --- | --- | --- | --- | --- | ---: |
| `erythroblast-and-bone-marrow-cell` | 红血球母细胞与骨髓细胞 | `high` | `S1-第6话 有核红细胞和骨髓细胞-1080P 高清-AVC.mp4` | `S1-第6话 有核红细胞和骨髓细胞-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `cancer-cell` | 癌细胞 | `high` | `S1-第7话 癌细胞-1080P 高清-AVC.mp4` | `S1-第7话 癌细胞-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `thymocyte` | 胸腺细胞 | `high` | `S1-第9话 胸腺细胞-1080P 高清-AVC.mp4` | `S1-第9话 胸腺细胞-1080P 高清-AVC_English.srt` | `srt` | 8 |
| `acquired-immunity` | 获得性免疫 | `high` | `S2-第2话 获得性免疫-1080P 高清-AVC.mp4` | none | `audio-fallback` | 7 |
| `dengue-fever` | 登革热 | `high` | `S2-第3话 登革热-1080P 高清-AVC.mp4` | none | `audio-fallback` | 6 |

## Audio Fallback

`acquired-immunity` 和 `dengue-fever` 没有同名 SRT，因此本次使用 audio-fallback。使用用户缓存目录中的便携版 `ffmpeg 8.1.1-essentials_build`，只从对应 MP4 临时抽取单声道 16 kHz WAV 供 `faster-whisper-tiny` 做窗口级分析。临时音频已删除，未保存 transcript，未把音频或转写写入项目文件。

`acquired-immunity` 的音频窗口显示免疫记忆、抗原记录、抗体匹配和疫苗式预先训练等线索；后半段可能与派尔集合淋巴结相关内容重叠，因此相关 notes 标注了后续人工复核边界。

`dengue-fever` 的音频窗口显示皮肤入口、蚊媒传播、局部免疫信号和损害控制等线索；同一 MP4 后半段转入痤疮相关内容，因此本文件只保留登革热相关窗口，并用 `dengue-fever-s2e03-v2-006` 标出停止取材边界。

## 跳过主题

本次 5 个主题均在 `animation-topic-map.json` 中有 high-confidence 动画匹配，因此没有跳过主题。`cancer-cell` 仅使用 S1 第7话，不与 `cancer-cell-ii` 的 S2 前后篇合并。

## 输出文件

- `data-private/cells-at-work/animation/scene-notes/erythroblast-and-bone-marrow-cell.v2.json`
- `data-private/cells-at-work/animation/scene-notes/cancer-cell.v2.json`
- `data-private/cells-at-work/animation/scene-notes/thymocyte.v2.json`
- `data-private/cells-at-work/animation/scene-notes/acquired-immunity.v2.json`
- `data-private/cells-at-work/animation/scene-notes/dengue-fever.v2.json`

## 可帮助后续内容优化的 scene notes

`topicOverview`:

- `erythroblast-and-bone-marrow-cell-s1e06-v2-001`, `-002`, `-008` 可帮助建立骨髓造血、红血球成熟和成熟后运输任务的概览。
- `cancer-cell-s1e07-v2-001`, `-003`, `-008` 可帮助把癌细胞解释为自身细胞异常变化、免疫监视和分裂错误风险。
- `thymocyte-s1e09-v2-001`, `-003`, `-005` 可帮助概述胸腺训练、抗原识别和胸腺选择。
- `acquired-immunity-s2e02-v2-001`, `-003`, `-004` 可帮助概述免疫记忆、疫苗式预先训练和二次免疫反应。
- `dengue-fever-s2e03-v2-001`, `-003`, `-005` 可帮助概述皮肤入口、蚊媒传播和炎症信号调节。

`bodyScienceStations`:

- `erythroblast-and-bone-marrow-cell-s1e06-v2-002`, `-004`, `-005` 适合转化为骨髓造血、氧气运输和免疫保护造血环境的小站。
- `cancer-cell-s1e07-v2-004`, `-005`, `-007` 适合转化为异常增殖、免疫判断和多层免疫协作的小站。
- `thymocyte-s1e09-v2-003`, `-004`, `-006` 适合转化为抗原识别、目标精确性和成熟T细胞任务的小站。
- `acquired-immunity-s2e02-v2-002`, `-003`, `-006` 适合转化为抗体匹配、疫苗原理和免疫反应链条的小站。
- `dengue-fever-s2e03-v2-002`, `-003`, `-005` 适合转化为局部免疫信号、蚊媒传播和炎症调节的小站。

`parentQuestionCards`:

- `erythroblast-and-bone-marrow-cell` 可增加“红血球从哪里来？”“幼年红血球和成熟红血球有什么不同？”等问题。
- `cancer-cell` 可增加“癌细胞和细菌、病毒有什么不同？”“身体为什么不能随便攻击自己的细胞？”等问题。
- `thymocyte` 可增加“T细胞为什么要训练？”“胸腺怎样帮助免疫系统减少误伤？”等问题。
- `acquired-immunity` 可增加“身体为什么会记住见过的病原体？”“疫苗为什么能让身体提前练习？”等问题。
- `dengue-fever` 可增加“登革热病毒通常怎样进入人体？”“为什么预防蚊子叮咬能帮助预防登革热？”等问题。

`imagePromptDocs`:

- `erythroblast-and-bone-marrow-cell` 可补充原创骨髓造血工厂、红血球成熟阶段和氧气运输路线图。
- `cancer-cell` 可补充正常细胞与异常增殖细胞对照、免疫监视信号和异常分裂流程图。
- `thymocyte` 可补充胸腺训练检查点、抗原识别和T细胞成熟路线图。
- `acquired-immunity` 可补充免疫记忆档案、抗体匹配、疫苗式训练和二次反应时间轴。
- `dengue-fever` 可补充皮肤入口、蚊媒传播链条、局部免疫信号和炎症强度调节图。

## 仍不进入前端的内容

- MP4、SRT、抽取音频、transcript、完整字幕、完整对白、逐句翻译。
- `data-private/cells-at-work/animation/scene-notes/` 下的完整 scene notes。
- screenshot-candidates、review-contact-sheets、未筛选动画截图。
- 可替代观看动画的完整剧情文本。
- 医疗诊断、用药指导、疫苗接种建议、登革热症状自查流程或癌症现实诊疗建议。

## 当前累计有 scene notes 的主题

当前已有 V2 scene notes 的主题：

- `pneumococcus`
- `cedar-pollen-allergy`
- `influenza`
- `abrasion`
- `food-poisoning`
- `heatstroke`
- `erythroblast-and-bone-marrow-cell`
- `cancer-cell`
- `blood-circulation`
- `thymocyte`
- `common-cold-syndrome`
- `acquired-immunity`
- `staphylococcus-aureus`
- `dengue-fever`
- `hemorrhagic-shock`
- `gut-microbiota`
- `bump-on-head`

另有旧试点样例文件仍保留在 private 路径中：`pneumococcus.sample.json`、`hemorrhagic-shock.sample.json`。
