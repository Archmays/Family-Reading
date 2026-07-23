# Book Companion / 家庭阅读助手

面向家庭纸质阅读的伴读入口。首页只用于选择系列；当前提供 `不一样的卡梅拉` 12 册故事伴读，以及 `工作细胞` 27 个科学主题伴读。站点提供内容回顾、问答卡片、背景补充、剧情百科、科学小站、页面线索和音频，不是电子书、进度或打卡产品。

## Repository identity

本次仓库重命名完成后的唯一当前仓库为：

- GitHub：`Archmays/Family-Reading-Codex`
- GitHub Pages：`https://archmays.github.io/Family-Reading-Codex/`
- 本地项目目录名：`Family-Reading-Codex`

旧名称 `Archmays/Family-Reading` 只作为重命名前的历史身份保留。不要重新创建同名旧仓库，否则 GitHub 对旧仓库地址的自动重定向可能失效。仓库重命名、本地 `origin` 更新和新 Pages 地址的最终验证由同一 FR-P4B 本地 closeout 完成。

## 本地构建

需要 Node.js。项目没有数据库、登录系统或运行时服务器依赖。

```bash
npm run verify:release
```

该命令先对 tracked runtime content 执行确定性与时效检查，再运行一次完整测试；复制前检查公开 Git current tree，生成 `dist` 后执行发布目录审计。当前构建会复制 `index.html`、`assets/`、`public/runtime/`、12 册卡梅拉所需的详情与音频，以及工作细胞已引用的媒体；不发布工作细胞 authoring manifest、page map 或 OCR 处理输出。发布规则和当前风险基线见 `docs/portfolio/fr-p0/` 与 `docs/portfolio/fr-p4a/`。

当 authoring JSON 合法变更后，先更新并验证跟踪的运行时投影：

```bash
npm run generate:runtime
npm run validate:runtime
```

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 打开仓库的 `Settings` -> `Pages`。
3. 在 `Build and deployment` 中选择 `Source: GitHub Actions`。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run verify:release`；只有测试、公开仓库检查、构建和 dist 审计全部通过才会上传 `dist`。
5. 部署完成后，在 `Actions` 页面或 `Settings` -> `Pages` 中确认访问地址为 `https://archmays.github.io/Family-Reading-Codex/`。

资源路径使用相对路径，兼容 GitHub Pages 项目子路径部署。仓库改名后必须对新 URL 做 exact-SHA live smoke，旧项目 Pages URL 不作为通过依据。

## 原始素材说明

`source/` 下的本地原始素材是受保护、被 Git 忽略的追溯来源；构建不会将它们复制到 `dist`。用户提供或指定的项目资源适用全局授权，当前状态为 `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`；Source 不可变、隐私与发布工程边界仍独立执行。

12 册音频当前均有 `public/audio/carmela-s1/` 发布副本。播放器使用 `preload="none"`，且只在用户主动播放或操作原生控件后挂载音频路径；不自动播放，也不保存播放位置。不以额外版权或许可记录作为发布前置条件。

更完整的部署检查和体积说明见 `docs/github-pages-deployment.md`。
