# 工作细胞 EPUB 导入报告

## 当前状态

- 报告状态：初始模板
- 数据状态：draft manifest 已按用户参考表建立
- EPUB 解析状态：未解析
- 图片转换状态：已使用公开派生页图
- 公开图片资源状态：已通过 `data/cells-at-work/page-map.json` 接入 manifest
- 验证状态：`from_user_reference_only`

## 输入素材边界

私有 EPUB 输入目录：

```text
source/工作细胞/
```

该目录只作为本地私有输入，不直接进入公开发布目录。完整 EPUB 原文件禁止进入：

- `public/`
- `dist/`
- `build/`
- `docs/`
- GitHub Pages 发布目录

## 允许的公开派生资源

在用户确认授权范围内，后续允许公开发布：

- 漫画原图
- 从 EPUB 转换出的漫画页图片
- 缩略图
- 裁切图
- 主题伴读配套资料

当前里程碑已通过 `data/cells-at-work/page-map.json` 将公开页图路径接入 draft manifest。完整 EPUB 原文件仍不得进入公开目录。

## Draft Manifest

Draft manifest 路径：

```text
public/books/工作细胞/draft-manifest.json
```

该 manifest 按科学主题组织，不按卷作为主导航。卷和话仅作为来源备注。

全局字段：

- `type`: `science-manga-companion`
- `contentType`: `science-manga-companion`
- `displayMode`: `science-topic`
- `navigationMode`: `science-topic`
- `verificationStatus`: `from_user_reference_only`
- `hasAudio`: `false`
- `copyrightMode`: `licensed-media-except-full-epub`
- `licenseBasis`: `user_confirmed_authorization`

## 必须保留的合并规则

| 主题 | 来源 | 合并规则 |
| --- | --- | --- |
| 癌细胞 | 第2卷 第8-9话 | 癌细胞（前篇）与癌细胞（后篇）合并为一个主题 |
| 出血性休克 | 第4卷 第17-18话 | 出血性休克（前篇）与出血性休克（后篇）合并为一个主题 |
| 癌细胞Ⅱ | 第5卷 第24-25话 | 癌细胞Ⅱ（前篇）与癌细胞Ⅱ（后篇）合并为一个主题，不与癌细胞合并 |

新型冠状病毒保持为 `第6卷 第29话`，不列入合并主题。

## 后续导入时必须完成

1. 只读检查 EPUB 内部结构。
2. 建立 EPUB 文件与卷号、话数、图片序列的映射。
3. 生成或复制授权范围内的漫画页图片、缩略图和裁切图。
4. 将主题绑定到具体公开图片资源。
5. 核对简体中文术语表。
6. 确认 `public/`、`dist/`、`build/`、`docs/` 中没有完整 EPUB。
7. 运行项目检查命令并记录结果。

## 本阶段未执行事项

- 未解析真实 EPUB。
- 未生成裁切图。
- 未显示音频模块。
