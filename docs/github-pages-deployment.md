# GitHub Pages 部署检查

## 目标

将 `Book Companion / 家庭阅读助手` 作为静态站点部署到 GitHub Pages。首页系列标题保持为 `不一样的卡梅拉`，首页只做书籍入口，不恢复大 hero 介绍模块或右侧说明模块。

## 构建方式

- 构建命令：`npm run build`
- 实际命令：`node scripts/build.mjs`
- 输出目录：`dist`
- 部署方式：GitHub Actions 上传 `dist` 到 GitHub Pages

项目是静态页面，不需要服务器、数据库、登录系统或私有运行时服务。

## GitHub Pages 设置步骤

1. 推送仓库到 GitHub。
2. 进入仓库 `Settings` -> `Pages`。
3. 将 `Build and deployment` 的 `Source` 设为 `GitHub Actions`。
4. 推送到 `main`，或在 `Actions` 页面手动运行 `Deploy GitHub Pages`。
5. 工作流会执行 `npm run build`，上传 `dist`，再部署到 Pages。

## 子路径资源规则

应用使用相对路径加载：

- `assets/styles.css`
- `assets/app.js`
- `public/books/不一样的卡梅拉/series.json`
- `public/books/.../pages/*.png`
- `public/books/.../generated/*.png`
- `public/audio/carmela-s1/*.mp3`

这些路径可以在 GitHub Pages 项目子路径下工作，例如 `https://用户名.github.io/仓库名/`。

## 不发布的内容

`scripts/build.mjs` 只复制 `index.html`、`assets/` 和筛选后的 `public/`。当前发布面只包含前四本书，因为首页和书籍页只开放前四本：

- 不复制 `source/`
- 不复制 PDF
- 不复制 `ocr/` OCR 中间文件夹
- 不复制未上线 8 本书的页面图片
- 不复制不必要的大型中间文件

`source/` 需要保留在仓库中作为原始素材来源，但不建议进入 GitHub Pages 发布目录。若仓库体积后续继续增大，建议把原始 PDF 和全量音频迁移到 Git LFS 或私有备份位置，仓库只保留生成后的轻量发布资源和来源说明；不要在未确认前删除、压缩或移动 `source/` 文件。

## 音频策略

当前前四本音频位于 `public/audio/carmela-s1/`，页面使用 `preload="metadata"`，不会在首页一次性加载整段音频。后续音频建议按已上线书籍分批发布，并保留 `sourcePath` 用于追溯原始文件。

如果音频路径不可访问，页面会显示友好提示，其他伴读内容仍可使用。

## 体积检查

每次发布前运行：

```bash
npm run build
```

然后检查：

- `dist` 总体积是否可接受。
- `dist` 中没有 `source/`、PDF 或 `ocr/` OCR 中间文件。
- `dist/public/books/**/pages/*.png` 单图是否过大。
- `dist/public/audio/**/*.mp3` 是否只包含当前需要发布的音频。

本轮实际检查结果：

- `dist`：136 个文件，230.26 MiB。
- `dist` 中未发现 `source/`、PDF 或 `ocr/` OCR 中间文件。
- `dist/public/audio`：4 个 MP3，20.28 MiB，分别对应前四本书。
- `source/`：13 个原始素材，155.24 MiB，其中原始 PDF 为 73.66 MiB；这些文件保留在仓库素材区，但不会发布到 Pages。
- 当前较大的发布图片约 2.3-2.9 MiB/张，最大检查值为 2.88 MiB。

不建议继续按当前 PNG 体积直接扩展到 12 本全部上线。后续如果要发布更多书，建议先做一次确认过的派生资源优化：为缩略图生成较小尺寸图片，为放大图生成 WebP/JPEG 或压缩 PNG，并继续保留 `source/` 原始素材不变。
