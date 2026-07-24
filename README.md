# Book Companion / 家庭阅读助手

面向家庭纸质阅读的伴读入口。首页只用于选择系列；当前提供 `不一样的卡梅拉` 12 册故事伴读，以及 `工作细胞` 27 个科学主题伴读。站点提供内容回顾、问答卡片、背景补充、剧情百科、科学小站、页面线索和音频，不是电子书、进度或打卡产品。

## Portfolio status

```text
PORTFOLIO_STATUS: FR_P6_IN_PROGRESS
PROJECT_MODE: ACTIVE_DEVELOPMENT
LAST_COMPLETED_PHASE: FR-P5
FR_P6_BASE_MAIN: f55859186f69e98a1cae689f77d7162f1bf565e0
NEXT_RECOMMENDED_PHASE: FR-P6 Final Acceptance and Project Seal
```

FR-P6 正在执行最终证据对账、全站独立验收和项目封板。只有本地最终门禁、exact-SHA Pages、分支与工作区收尾全部通过后，本节才能改为：

```text
PORTFOLIO_STATUS: SEALED
PROJECT_MODE: MAINTENANCE
LAST_COMPLETED_PHASE: FR-P6
NEXT_RECOMMENDED_PHASE: NONE
```

当前阶段账本见 `reports/portfolio/fr-p6/fr-p6-phase-ledger.json`，维护协议见 `docs/maintenance/Family-Reading-maintenance-protocol.md`。

## Repository identity

本次仓库重命名完成后的唯一当前仓库为：

- GitHub：`Archmays/Family-Reading-Codex`
- GitHub Pages：`https://archmays.github.io/Family-Reading-Codex/`
- 本地项目目录名：`Family-Reading-Codex`

旧名称 `Archmays/Family-Reading` 只作为重命名前的历史身份保留。不要重新创建同名旧仓库，否则 GitHub 对旧仓库地址的自动重定向可能失效。FR-P4B 已完成原位重命名并将本地 `origin` 更新到 canonical URL；发布验收只以新 Pages 地址的 exact-SHA 结果为准。

## 本地构建

需要 Node.js。项目没有数据库、登录系统或运行时服务器依赖。

```bash
npm run verify:release
```

该命令按顺序验证 tracked runtime、媒体 inventory、派生图、owner shards、精确 release plan、FR-P5 浏览器/Pages 证据、portfolio seal、完整测试、公开仓库边界和静态 build/dist。封板状态由同一验证器在 `PROVISIONAL` 与 `SEALED` 模式间自动切换；不会为了封板重复执行第二套完整测试。

当 authoring JSON 合法变更后，先更新并验证跟踪的运行时投影：

```bash
npm run generate:runtime
npm run validate:runtime
```

当前响应式媒体由确定性 inventory、质量 policy、media manifest、owner shards 和 release plan 管理；不得手工修改派生文件或 manifest。

## GitHub Pages 部署

1. 将仓库推送到 GitHub。
2. 打开仓库的 `Settings` -> `Pages`。
3. 在 `Build and deployment` 中选择 `Source: GitHub Actions`。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run verify:release`；只有全部门禁通过才会上传 `dist`。
5. 部署完成后，在 `Actions` 页面或 `Settings` -> `Pages` 中确认访问地址为 `https://archmays.github.io/Family-Reading-Codex/`。

资源路径使用相对路径，兼容 GitHub Pages 项目子路径部署。仓库改名后只以新 URL 的 exact-SHA live smoke 为验收依据。

## 原始素材说明

`source/` 下的本地原始素材是受保护、被 Git 忽略的追溯来源；构建不会将它们复制到 `dist`。用户提供或指定的项目资源适用全局授权，当前状态为 `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`；Source 不可变、隐私与发布工程边界仍独立执行。

12 册音频当前均有 `public/audio/carmela-s1/` 发布副本。播放器使用 `preload="none"`，且只在用户主动播放或操作原生控件后挂载音频路径；不自动播放，也不保存播放位置。不以额外版权或许可记录作为发布前置条件。

更完整的部署检查和体积说明见 `docs/github-pages-deployment.md`。项目封板后的变更必须遵循维护协议。
