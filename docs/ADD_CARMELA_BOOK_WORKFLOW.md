# Book Companion / 家庭阅读助手：不一样的卡梅拉后续书籍加入流程

本文档用于第 4-12 本《不一样的卡梅拉》逐本加入 Book Companion / 家庭阅读助手。每次只处理一本书，先确认素材和人工复核点，再生成 companion 数据、缩略图引用、答案证据页、音频配置和必要的 image prompt。

## 正式书名

后续处理必须使用下列书名，不得改字、换序或自行简写。

| 序号 | 正式书名 | 建议 slug |
| --- | --- | --- |
| 4 | 我去找回太阳 | carmela-s1-04 |
| 5 | 我爱小黑猫 | carmela-s1-05 |
| 6 | 我能打败怪兽 | carmela-s1-06 |
| 7 | 我要找到朗朗 | carmela-s1-07 |
| 8 | 我不要被吃掉 | carmela-s1-08 |
| 9 | 我好喜欢她 | carmela-s1-09 |
| 10 | 我要救出贝里奥 | carmela-s1-10 |
| 11 | 我不是胆小鬼 | carmela-s1-11 |
| 12 | 我爱平底锅 | carmela-s1-12 |

系列名称统一写作 `不一样的卡梅拉`。项目名称统一写作 `Book Companion / 家庭阅读助手`。

## 单本处理步骤

1. 确认页面图片
   - 检查 `public/books/不一样的卡梅拉/<书名>/pages/` 是否存在。
   - 页面文件必须为三位页码，例如 `001.png`、`024.png`。
   - 对照 `docs/carmela-s1-extraction-report.md` 里的 PDF 页边界和页数，确认没有缺页、重页、错书夹页。
   - 原始 PDF 位于 `source/`，不得移动、改名、压缩、覆盖或复制到发布目录。

2. 检查 OCR
   - 预期输出位置为 `public/books/不一样的卡梅拉/<书名>/ocr/`。
   - 检查 `ocr/pages/*.txt`、`ocr/full-text.txt`、`ocr/ocr-report.json` 是否与页面图片对应。
   - OCR 只作为处理证据和内容生成依据，不作为孩子阅读正文。
   - 重点修正角色名、地名、关键动作、标题和明显错字。

3. 生成书籍总览
   - 在 `companion.json` 的 `overview` 写入 `oneLine`、`mainCharacters`、`importantPlaces`、`characterRelationships`、`keyConflict`、`emotionalArc`。
   - 语言直接面向家庭共读材料，避免成人转述式口吻。
   - 不加入任何阅读状态、账号、统计或激励系统描述。

4. 生成内容回顾
   - 在 `storyReview.shortReview` 写一段完整但简短的剧情回顾。
   - 在 `storyReview.mainPlot` 列出 4-7 个关键剧情点。
   - 只回顾实体书剧情，不把 OCR 全文做成页面正文。

5. 生成 scene / pageRange
   - 在 `scenes` 中按剧情自然段落拆分，通常 5-7 个 scene。
   - 每个 scene 必须有 `id`、`title`、`pageRange`、`summary`、`discussionFocus`、`pageRefs`。
   - `pageRange` 使用 `004-007` 这种三位页码范围。
   - `pageRefs` 使用三位页码数组，例如 `["004", "005", "006", "007"]`。

6. 为每个 scene / pageRange 绑定页面缩略图
   - 当前数据字段使用 `imageRefs` 承载页面缩略图引用。
   - 每个 `pageRefs` 条目都应有对应 `imageRefs`，例如 `pages/004.png`。
   - 如果输入单里使用 `thumbnailRefs`，落库到 `companion.json` 时转换为 `imageRefs`。
   - 缩略图必须对应该 scene 的剧情，不要只选封面或随意选漂亮页面。

7. 生成问答卡片
   - `questionCards` 分为 `factualRecall`、`comprehension`、`openExpression`。
   - 每张卡片包含 `prompt`、`talkingPoints`、`pageRange`、`evidencePageRefs`、`evidenceImageRefs`。
   - factualRecall 绑定能直接在页面上找到答案的事实。
   - comprehension 关注因果、情绪、选择和变化。
   - openExpression 可以开放表达，但仍要绑定与问题相关的证据页。

8. 为每个参考答案绑定 evidence page thumbnails
   - `evidencePageRefs` 使用三位页码数组。
   - `evidenceImageRefs` 使用同页图片路径，例如 `pages/012.png`。
   - 参考答案和证据页必须能互相支持；如果证据跨页，列出全部关键页。
   - 不用没有剧情证据的页面充数。

9. 生成背景补充
   - `backgroundNotes` 解释孩子可能需要的背景知识、物品、自然现象或文化语境。
   - 每条必须有 `title`、`pageRange`、`note`、`pageRefs`。
   - 语言要适合孩子直接阅读，句子短，少抽象概念。
   - 对敏感历史、文化差异或危险行为保持谨慎和尊重。

10. 为背景补充绑定绘本页面图或 image prompt
    - 优先使用绘本页面证据：`imageRefs` 指向 `pages/NNN.png`。
    - 如需要额外解释图，写 `generatedImagePromptId`，并在 `docs/image-prompts/carmela-needed-images.md` 增加可复制 prompt。
    - 如果解释图还没有生成，设置 `needsGeneratedImage: true`，不要填写不存在的 `generatedImageRefs`。
    - 如果解释图已经生成并保存到 `generated/`，填写 `generatedImageRefs`，并设置 `needsGeneratedImage: false`。

11. 生成剧情百科
    - `encyclopediaEntries` 只收录与本书剧情直接相关的条目。
    - 每条必须有 `title`、`anchor`、`pageRange`、`summary`、`pageRefs`、`storyAppearance`、`whatItIs`、`whyItMatters`、`discussionQuestion`。
    - 不做离题百科扩展，不把页面变成通用知识库。

12. 为剧情百科绑定绘本页面图或 image prompt
    - 与背景补充相同，优先使用 `imageRefs` 绑定故事页面。
    - 需要解释图时，绑定 `generatedImagePromptId` 并补充 prompt 文档。
    - prompt 必须说明用途、建议文件名、画面要求、禁止文字水印和不得模仿原绘本角色。

13. 接入音频
    - 确认原始 MP3 位于 `source/不一样的卡梅拉/NN-书名.mp3`。
    - 发布副本使用 ASCII 文件名，放到 `public/audio/carmela-s1/carmela-s1-NN.mp3`。
    - 在 `companion.json.audio` 和 `series.json` 对应书籍里写入同样的 `path` 和 `sourcePath`。
    - 没有可靠场景时间点证据时，`markers` 保持空数组。

14. 检查页面
    - 打开本地页面，检查首页入口、书籍页、scene 缩略图、问答证据缩略图、背景补充、剧情百科和音频控件。
    - 检查缺图占位、路径错误、错别字、书名、角色名和音频文件名。
    - 确认页面仍是纸质书伴读材料入口，不是电子书阅读页面。

15. build
    - 每次改完数据、脚本或页面后运行 `npm run build`。
    - build 必须成功。
    - 如果本次决定把新书加入首页发布范围，还要确认构建输出只包含需要发布的书籍和音频。

## 人工复核点

- PDF 分书边界是否准确，尤其是起止页和页数。
- OCR 错字是否影响剧情理解。
- 角色名是否统一，尤其是卡梅拉、卡梅利多、卡门、贝里奥、佩罗等。
- 关键剧情是否遗漏、误读或顺序错误。
- scene/pageRange 是否按剧情自然分段。
- 页面缩略图是否对应剧情，而不是随意配图。
- 问答答案证据页是否准确，证据缩略图是否能支持答案。
- 音频是否对应同一本书，source 路径和 public 路径是否匹配。
- 背景补充是否适合孩子直接阅读。
- 百科是否剧情相关，是否避免离题扩展。
- image prompt 是否确实需要用户生成图片，还是已有绘本页面足够。
- 第 5 本书名是否始终写作 `我爱小黑猫`。
- 第 12 本书名是否始终写作 `我爱平底锅`。

## 禁止事项

- 不做阅读进度。
- 不做打卡。
- 不做电子书阅读器。
- 不生成进度字段或阅读状态字段。
- 不添加账号、排行榜、统计图、徽章、连续天数或用户系统。
- 不把 OCR 全文作为孩子面对的主要阅读正文。
- 不使用成人转述式口吻，内容应直接写成孩子和家长都能读懂的材料。
- 不修改、覆盖、重命名、压缩或移动 `source/` 下的原始 PDF 和 MP3。
- 不把原始 PDF 复制到公开发布目录。
- 不把系列名称追加季、册、阶段等未要求后缀。

## 新增第 N 本的 Codex 命令模板

复制下面模板，把尖括号内容替换为本书实际信息。处理前先把 `docs/carmela-book-input-template.md` 填成单本输入单。

```md
/goal 为 Book Companion / 家庭阅读助手新增《不一样的卡梅拉》第 <N> 本《<正式书名>》。

请按 docs/ADD_CARMELA_BOOK_WORKFLOW.md 处理这一本，并保持静态 GitHub Pages 兼容。

书名：
- 序号：<N>
- 正式书名：<正式书名>
- slug：carmela-s1-<NN>

输入路径：
- 音频文件路径：source/不一样的卡梅拉/<NN>-<正式书名>.mp3
- 页面图片路径：public/books/不一样的卡梅拉/<正式书名>/pages/
- OCR 输出路径：public/books/不一样的卡梅拉/<正式书名>/ocr/
- companion 数据输出路径：public/books/不一样的卡梅拉/<正式书名>/companion.json

内容要求：
- 先检查 OCR 和页面图片。
- 生成书籍总览和内容回顾。
- 生成 scene/pageRange 划分。
- 为每个 scene 写 pageRefs，并把 thumbnailRefs 转成 companion.json 的 imageRefs。
- 生成问答卡片，并为每个参考答案写 question evidencePageRefs 和 evidenceImageRefs。
- 生成背景补充，并为每条绑定 imageRefs 或 generatedImagePromptId。
- 生成剧情百科，并为每条绑定 imageRefs 或 generatedImagePromptId。
- 需要生成 image prompt：<是/否>。如果是，把 prompt 写入 docs/image-prompts/carmela-needed-images.md，并写清建议保存文件名。

发布要求：
- 是否加入首页：<是/否>
- 是否接入音频：<是/否>
- 音频 public 路径：public/audio/carmela-s1/carmela-s1-<NN>.mp3
- 没有可靠场景时间点证据时，audio.markers 保持空数组。

检查要求：
- 第 5 本必须写作“我爱小黑猫”。
- 第 12 本必须写作“我爱平底锅”。
- 不添加阅读状态、打卡、电子书阅读器或统计功能。
- 检查页面缩略图和答案证据缩略图。
- 运行 npm run build，并报告 build 检查结果。
```
