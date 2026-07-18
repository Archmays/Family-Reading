# Book Companion / 家庭阅读助手

面向家庭纸质阅读的伴读入口。首页只用于选择系列；当前提供 `不一样的卡梅拉` 12 册故事伴读，以及 `工作细胞` 27 个科学主题伴读。站点提供内容回顾、问答卡片、背景补充、剧情百科、科学小站、页面线索和音频，不是电子书、进度或打卡产品。

## 本地构建

需要 Node.js。项目没有数据库、登录系统或运行时服务器依赖。

```bash
npm run verify:release
```

该命令只运行一次完整测试，然后在复制前检查公开 Git current tree，在生成 `dist` 后执行发布目录审计。当前构建会复制 `index.html`、`assets/`、12 册卡梅拉运行时内容与音频，以及工作细胞主题运行时 manifest、缩略图、科学小站图片和 page map；同时排除 `source/`、PDF、EPUB、完整工作细胞页面目录、动画素材和 `ocr/` OCR 中间文件。发布规则和当前风险基线见 `docs/portfolio/fr-p0/`。

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 打开仓库的 `Settings` -> `Pages`。
3. 在 `Build and deployment` 中选择 `Source: GitHub Actions`。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run verify:release`；只有测试、公开仓库检查、构建和 dist 审计全部通过才会上传 `dist`。
5. 部署完成后，在 `Actions` 页面或 `Settings` -> `Pages` 中查看访问地址。

资源路径使用相对路径，兼容 GitHub Pages 项目子路径部署。

## 原始素材说明

`source/` 下的本地原始素材是受保护、被 Git 忽略的追溯来源；构建不会将它们复制到 `dist`。用户提供或指定的项目资源适用全局授权，当前状态为 `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`；Source 不可变、隐私与发布工程边界仍独立执行。

12 册音频当前均有 `public/audio/carmela-s1/` 发布副本，页面使用 `preload="metadata"`。后续是否进行格式、缓存或按需加载优化由性能阶段决定，不以额外版权或许可记录作为发布前置条件。

更完整的部署检查和体积说明见 `docs/github-pages-deployment.md`。
