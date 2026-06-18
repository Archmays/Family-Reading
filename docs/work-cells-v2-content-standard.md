# 工作细胞 V2 内容标准

本文冻结《工作细胞》V2 主题内容结构，用于后续主题制作、验收和回归测试。

## 页面结构边界

- 首页结构保持不变：仍是书籍/系列材料入口，不改成阅读进度、打卡、统计或用户系统。
- 工作细胞入口保持不变：从首页进入《工作细胞》系列，再选择具体科学主题。
- 27 个主题分类保持不变：不得因为 V2 改造删除、合并、重命名或新增主题。
- 主题详情栏目保持不变：主题导读、身体科学小站、亲子问题卡、来源备注等栏目继续作为 companion material，不变成电子书阅读器。

## V2 主题必备字段

每个完成验收的 V2 主题应包含：

- `contentVersion`: `work-cells-v2`
- `topicOverview`
- `bodyScienceStations`
- `parentQuestionCards`
- `parentReadingNote`
- `sourceNotes`
- `relatedComicPages`
- `relatedAnimationScenes`
- `contentStatus`
- `qualityFlags`

## 身体科学小站

- 每个 V2 主题通常包含 3-5 张身体科学小站卡片。
- 小站卡片只解释与主题直接相关的身体科学过程。
- 小站卡片可以引用漫画页码或动画场景摘要作为来源线索，但不得展示漫画全文、动画全文、完整对白、完整字幕或完整 OCR。
- 小站卡片的正式配图必须来自 V2 图片工作流验收后的 WebP 资源。

## 亲子问题卡

每个 V2 主题通常包含 6 张亲子问题卡：

- 观察类 2 张
- 理解类 2 张
- 联系生活类 1 张
- 科学概念类 1 张

问题卡应帮助家长和孩子围绕纸书画面进行短对话，不要求复述漫画对白，不替代完整课程。

## 家长共读提示

- `parentReadingNote` 应温和、简短、具体。
- 允许提醒家长如何把夸张漫画表现转回真实身体过程。
- 不提供诊断、用药、治疗或急救结论。
- 必须保留“不替代医学建议”的边界；健康问题应咨询专业医务人员。

## 版权与展示边界

- 不展示漫画全文。
- 不展示动画全文。
- 不展示完整对白。
- 不展示完整字幕。
- 不展示完整 OCR。
- 不恢复漫画全文浏览、页面标注浏览、百科独立路由或动画播放器。
- V2 内容是纸书伴读材料，不是电子书、字幕站、OCR 阅读器或动画播放器。

## 动画 scene notes 边界

- `relatedAnimationScenes` 只能引用 summary-only 的 timecoded scene notes，不得引用完整字幕、完整对白、完整音频转写或逐句翻译。
- 动画资源处理优先使用同名 SRT；没有同名 SRT 时，才允许从对应 MP4 抽取音频做补充分析。
- 音频 fallback 只用于生成摘要型 scene notes，不得生成可替代观看动画的完整剧情文本。
- scene notes 必须包含 `sourceMode: srt` 或 `sourceMode: audio-fallback`，并保持 `doNotQuoteDialogue: true`。
