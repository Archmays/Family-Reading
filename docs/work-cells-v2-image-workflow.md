# 工作细胞 V2 图片工作流

本文冻结《工作细胞》V2 身体科学小站配图工作流。Codex 不得自行生成身体科学小站配图。

## 角色分工

Codex 只负责输出图片生产说明，不直接生成正式配图。每张图的说明应包含：

- `prompt`: 极尽细致的原创儿童科普插图生产提示词
- `recommendedFileName`: 建议文件名
- `targetPath`: 目标保存路径
- `mustShow`: 必须出现的科学信息和画面元素
- `mustAvoid`: 必须避免的内容
- `acceptanceCriteria`: 人工验收标准

用户负责根据 prompt 生成 PNG 原图。

## 文件路径

PNG 原图放入：

`data/cells-at-work/source-assets/science-station/<topicId>/png-originals/`

Codex 在用户确认后只做格式转换与接入，将 PNG 转为 WebP。

正式 WebP 放入：

`public/assets/cells-at-work/science-station/<topicId>/`

只有 WebP 可以作为正式前端资源写入 V2 `imageAsset`。PNG 原图不得作为前端正式资源。

## 发布边界

以下内容不得进入 dist：

- PNG 原图
- MP4
- SRT
- 完整字幕
- 完整对白
- 完整 OCR
- 截图候选图
- `scene-notes`
- `screenshot-candidates`
- `pages-by-volume`
- `visual-annotation-bundles`

## 接入验收

接入某个 V2 主题图片前，应确认：

- `imageAsset` 全部指向 `public/assets/cells-at-work/science-station/<topicId>/` 下的 WebP。
- 每个 WebP 文件实际存在。
- 旧图、V1 图、自动生成的低质量小站图不得作为 V2 `imageAsset`。
- 图片在前端保持 `loading="lazy"`。
- 图片缺失时仍显示占位逻辑，不破坏页面。

## Prompt 约束

Prompt 应要求原创儿童科普插图，不模仿《工作细胞》漫画或动画画风，不出现版权角色、Logo、水印、二维码、漫画对白、字幕、药物治疗承诺或误导性的医学结论。
