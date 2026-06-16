# Book Companion / 家庭阅读助手：不一样的卡梅拉单本输入模板

填写本模板后，再让 Codex 处理第 N 本。每次只填一本，便于逐本复核。

## 基本信息

- 序号：`<N>`
- 正式书名：`<正式书名>`
- 系列名称：`不一样的卡梅拉`
- slug：`carmela-s1-<NN>`
- 是否加入首页：`<是/否>`
- 是否接入音频：`<是/否>`
- 是否生成 image prompt：`<是/否>`

正式书名只能从下表选择：

| 序号 | 正式书名 |
| --- | --- |
| 4 | 我去找回太阳 |
| 5 | 我爱小黑猫 |
| 6 | 我能打败怪兽 |
| 7 | 我要找到朗朗 |
| 8 | 我不要被吃掉 |
| 9 | 我好喜欢她 |
| 10 | 我要救出贝里奥 |
| 11 | 我不是胆小鬼 |
| 12 | 我爱平底锅 |

## 输入与输出路径

- 音频文件路径：`source/不一样的卡梅拉/<NN>-<正式书名>.mp3`
- 页面图片路径：`public/books/不一样的卡梅拉/<正式书名>/pages/`
- OCR 输出路径：`public/books/不一样的卡梅拉/<正式书名>/ocr/`
- companion 数据输出路径：`public/books/不一样的卡梅拉/<正式书名>/companion.json`
- book-assets 路径：`public/books/不一样的卡梅拉/<正式书名>/book-assets.json`
- image prompt 文档路径：`docs/image-prompts/carmela-needed-images.md`

## PDF 与页面图片复核

- PDF 分书边界：`<例如：PDF 78-101>`
- 页面图片页数：`<例如：24>`
- 页面图片命名范围：`<例如：001.png-024.png>`
- 需要人工复核的页面：`<页码或无>`
- 边界复核结论：`<通过/待确认>`

## OCR 复核

- `ocr/pages/` 是否存在：`<是/否>`
- `ocr/full-text.txt` 是否存在：`<是/否>`
- `ocr/ocr-report.json` 是否存在：`<是/否>`
- 已确认角色名：`<角色名列表>`
- 已修正或需要注意的 OCR 错字：`<列表>`
- 关键剧情复核结论：`<通过/待确认>`

## scene / pageRange 划分

把 `thumbnailRefs` 落库为 `companion.json` 中的 `imageRefs`。

| scene id | scene 标题 | pageRange | pageRefs | thumbnailRefs |
| --- | --- | --- | --- | --- |
| `<scene-id-01>` | `<标题>` | `<004-007>` | `<004,005,006,007>` | `<pages/004.png,pages/005.png,pages/006.png,pages/007.png>` |
| `<scene-id-02>` | `<标题>` | `<008-011>` | `<008,009,010,011>` | `<pages/008.png,pages/009.png,pages/010.png,pages/011.png>` |

复核点：
- scene/pageRange 是否合理：`<通过/待确认>`
- 页面缩略图是否对应剧情：`<通过/待确认>`

## 问答卡片与答案证据页

每张问题卡必须有 `evidencePageRefs` 和 `evidenceImageRefs`。开放表达题也要绑定与提问相关的故事页。

| 类型 | prompt | talkingPoints | pageRange | question evidencePageRefs | evidence thumbnailRefs |
| --- | --- | --- | --- | --- | --- |
| factualRecall | `<问题>` | `<参考要点>` | `<004-005>` | `<004,005>` | `<pages/004.png,pages/005.png>` |
| comprehension | `<问题>` | `<参考要点>` | `<010-013>` | `<010,011,012,013>` | `<pages/010.png,pages/011.png,pages/012.png,pages/013.png>` |
| openExpression | `<问题>` | `<参考要点>` | `<018-020>` | `<018,019,020>` | `<pages/018.png,pages/019.png,pages/020.png>` |

复核点：
- 问答答案证据页是否准确：`<通过/待确认>`
- 证据缩略图是否能支持答案：`<通过/待确认>`

## 背景补充图片绑定

每条背景补充至少绑定绘本页面图；需要额外解释图时，再绑定 `generatedImagePromptId`。

| title | pageRange | pageRefs | imageRefs | generatedImagePromptId | generatedImageRefs | needsGeneratedImage |
| --- | --- | --- | --- | --- | --- | --- |
| `<背景条目>` | `<004-006>` | `<004,005,006>` | `<pages/004.png,pages/005.png,pages/006.png>` | `<prompt-id 或空>` | `<generated/name.png 或空>` | `<true/false>` |

复核点：
- 背景补充是否适合孩子直接阅读：`<通过/待确认>`
- image prompt 是否确实需要用户生成图片：`<通过/待确认>`

## 剧情百科图片绑定

百科必须服务本书剧情，不做离题扩展。

| title | anchor | pageRange | pageRefs | imageRefs | generatedImagePromptId | generatedImageRefs | needsGeneratedImage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<百科条目>` | `<故事中的锚点>` | `<008-011>` | `<008,009,010,011>` | `<pages/008.png,pages/009.png,pages/010.png,pages/011.png>` | `<prompt-id 或空>` | `<generated/name.png 或空>` | `<true/false>` |

复核点：
- 百科是否剧情相关：`<通过/待确认>`
- 绘本页面图或 image prompt 是否足够支撑解释：`<通过/待确认>`

## 音频配置

- 原始音频：`source/不一样的卡梅拉/<NN>-<正式书名>.mp3`
- 发布音频：`public/audio/carmela-s1/carmela-s1-<NN>.mp3`
- `companion.json.audio.path`：`public/audio/carmela-s1/carmela-s1-<NN>.mp3`
- `companion.json.audio.sourcePath`：`source/不一样的卡梅拉/<NN>-<正式书名>.mp3`
- `series.json.books[N-1].audio.path`：`public/audio/carmela-s1/carmela-s1-<NN>.mp3`
- `series.json.books[N-1].audio.sourcePath`：`source/不一样的卡梅拉/<NN>-<正式书名>.mp3`
- 是否确认音频对应本书：`<通过/待确认>`
- 没有可靠场景时间点证据时，`markers` 填 `[]`。

## image prompt 工作流

- 需要生成的 prompt-id：`<prompt-id 列表或无>`
- prompt 写入位置：`docs/image-prompts/carmela-needed-images.md`
- 每个 prompt 必须包含：
  - 对应书名。
  - 对应条目名称。
  - 用途说明。
  - 建议保存文件名。
  - 可复制的 ChatGPT image prompt。
  - 禁止画面文字、水印、logo、品牌标识。
  - 不模仿现有绘本角色。
- 图片生成后保存到：`public/books/不一样的卡梅拉/<正式书名>/generated/<name>.png`
- 保存后把对应条目的 `generatedImageRefs` 补齐，并把 `needsGeneratedImage` 改为 `false`。

## Codex 命令模板

```md
/goal 为 Book Companion / 家庭阅读助手新增《不一样的卡梅拉》第 <N> 本《<正式书名>》。

请使用 docs/ADD_CARMELA_BOOK_WORKFLOW.md 和本输入单处理这一本。

书名：<正式书名>
音频文件路径：source/不一样的卡梅拉/<NN>-<正式书名>.mp3
页面图片路径：public/books/不一样的卡梅拉/<正式书名>/pages/
OCR 输出路径：public/books/不一样的卡梅拉/<正式书名>/ocr/
companion 数据输出路径：public/books/不一样的卡梅拉/<正式书名>/companion.json

请完成：
- scene/pageRange 划分。
- pageRefs / thumbnailRefs 绑定，并把 thumbnailRefs 落到 imageRefs。
- question evidencePageRefs 和 evidenceImageRefs 绑定。
- background imageRefs 或 generatedImagePromptId 绑定。
- encyclopedia imageRefs 或 generatedImagePromptId 绑定。
- 是否加入首页：<是/否>。
- 是否接入音频：<是/否>。
- 是否生成 image prompt：<是/否>。
- 运行 npm run build 做 build 检查。

强制检查：
- 第 5 本写作“我爱小黑猫”。
- 第 12 本写作“我爱平底锅”。
- 不添加阅读状态、打卡、电子书阅读器或统计功能。
```

## 最终检查

- 页面图片和 OCR 已确认。
- companion 数据已写入。
- scene 缩略图已绑定。
- 问答答案证据缩略图已绑定。
- 背景补充和剧情百科已绑定页面图或 image prompt。
- 音频配置已检查。
- 页面已打开检查。
- `npm run build` 成功。
