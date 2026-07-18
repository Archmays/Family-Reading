# GitHub Pages 部署检查

## 目标

将 `Book Companion / 家庭阅读助手` 作为静态站点部署到 GitHub Pages。首页系列标题保持为 `不一样的卡梅拉`，首页只做书籍入口，不恢复大 hero 介绍模块或右侧说明模块。

## 发布验证与构建方式

- 发布验证命令：`npm run verify:release`
- 构建命令：`npm run build`
- 门禁顺序：完整测试一次 → public repository validator → 静态复制 → dist audit
- 输出目录：`dist`
- 部署方式：GitHub Actions 上传 `dist` 到 GitHub Pages

项目是静态页面，不需要服务器、数据库、登录系统或私有运行时服务。

## GitHub Pages 设置步骤

1. 推送仓库到 GitHub。
2. 进入仓库 `Settings` -> `Pages`。
3. 将 `Build and deployment` 的 `Source` 设为 `GitHub Actions`。
4. 推送到 `main`，或在 `Actions` 页面手动运行 `Deploy GitHub Pages`。
5. 工作流会执行 `npm run verify:release`；任何门禁失败都会在上传 `dist` 前停止。

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

`scripts/build.mjs` 只复制 `index.html`、`assets/` 和筛选后的 `public/` / page map。当前构建包含 12 册卡梅拉和 27 个工作细胞主题：

- 不复制 `source/`
- 不复制 PDF
- 不复制 `ocr/` OCR 中间文件夹
- 不复制工作细胞完整页面目录、动画源素材或私有 review 资料
- 不复制不必要的大型中间文件

`source/` 是受保护的本地原始素材来源，不进入 GitHub Pages 发布目录。不得因仓库体积删除、迁移、压缩、重编码或重写其历史；任何 visibility、历史清理或存储迁移都需要单独明确授权。用户提供或指定的项目资源状态为 `RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`；隐私、Source 不可变和发布工程门禁独立执行。

## 音频策略

当前 12 册音频位于 `public/audio/carmela-s1/`，页面使用 `preload="metadata"`。浏览器的实际 range/transfer 行为仍需网络遥测验证；音频适用用户全局资源授权，不需要额外版权或许可审批。

如果音频路径不可访问，页面会显示友好提示，其他伴读内容仍可使用。

## 体积检查

每次发布前运行：

```bash
npm run verify:release
```

然后检查：

- `dist` 总体积是否可接受。
- `dist` 中没有 `source/`、PDF 或 `ocr/` OCR 中间文件。
- `dist/public/books/**/pages/*.png` 单图是否过大。
- `dist/public/audio/**/*.mp3` 是否只包含当前需要发布的音频。

2026-07-18 P0R1 当前 release candidate 实测：

- `dist`：1,534 个文件，837,981,919 B（799.16 MiB）。
- `dist` 中未发现 `source/`、PDF、EPUB、动画源素材或 `ocr/` OCR 中间文件。
- `dist/public/audio`：12 个 MP3，85,545,615 B。
- 卡梅拉构建输出：426 个文件，776,451,826 B。
- 工作细胞 manifest、page map 与筛选媒体：1,101 个文件，61,463,371 B。
- 最新 Pages artifact metadata：828,688,767 B；artifact 已过期，无法做文件级比较。该值是上传 artifact metadata，不等于解包后的 `dist` 原始字节。

原 P0 build 的 1,533 文件 / 837,983,345 B，以及更早的 136 文件、230.26 MiB、4 MP3 和 2.3–2.9 MiB/图均作为历史测量保留，不是 P0R1 当前发布基线。后续优化必须保留 `source/` 不变，并以 route-scoped 加载、响应式缩略图/detail 分层和经过验证的运行时引用边界为前置。
