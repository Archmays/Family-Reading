# Book Companion / 家庭阅读助手

`不一样的卡梅拉` 纸质书伴读入口。首页只作为书籍入口，书籍页提供内容回顾、问答卡片、背景补充、剧情百科、页面图片和按需加载的音频。

## 本地构建

需要 Node.js。项目没有数据库、登录系统或运行时服务器依赖。

```bash
npm run build
```

构建输出目录是 `dist`。构建会复制 `index.html`、`assets/`、前四本当前页面需要的书籍素材和已接入音频，并排除 `source/`、PDF、未上线书籍图片和 `ocr/` OCR 中间文件。

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 打开仓库的 `Settings` -> `Pages`。
3. 在 `Build and deployment` 中选择 `Source: GitHub Actions`。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run build`，上传 `dist`，并部署到 GitHub Pages。
5. 部署完成后，在 `Actions` 页面或 `Settings` -> `Pages` 中查看访问地址。

资源路径使用相对路径，兼容 GitHub Pages 项目子路径部署。

## 原始素材说明

`source/` 下保留原始 PDF 和 MP3 素材，用作可追溯来源。它们不进入 `dist`，也不会被 GitHub Pages 工作流发布。

前四本音频已有 `public/audio/carmela-s1/` 发布副本，页面使用 `preload="metadata"`，只在用户打开或播放时加载音频。后续音频建议按册复制到 `public/audio/`，不要一次性发布不需要的原始素材。

更完整的部署检查和体积说明见 `docs/github-pages-deployment.md`。
