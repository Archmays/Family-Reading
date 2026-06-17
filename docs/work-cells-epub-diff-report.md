# 工作细胞 EPUB 目录差异报告

生成时间：2026-06-17T08:33:45.100Z

## 状态

- 发现 EPUB：是
- EPUB 实际验证：EPUB parsed
- 私有输入目录：`source/工作细胞`
- 用户参考主题数：27
- 图片提取状态：not_extracted
- page-map：`docs/work-cells-epub-page-map.json`

## EPUB 目录摘要

- `source/工作细胞/工作細胞 - 1卷-清水茜.epub`：OPF `OEBPS/content.opf`，spine 177 项，ncx 目录 0 项，图片阅读顺序 176 项。
- `source/工作细胞/工作細胞 - 2卷-清水茜.epub`：OPF `OEBPS/content.opf`，spine 167 项，ncx 目录 0 项，图片阅读顺序 166 项。
- `source/工作细胞/工作細胞 - 3卷-清水茜.epub`：OPF `OEBPS/content.opf`，spine 165 项，ncx 目录 0 项，图片阅读顺序 164 项。
- `source/工作细胞/工作細胞 - 4卷-清水茜.epub`：OPF `OEBPS/content.opf`，spine 173 项，ncx 目录 0 项，图片阅读顺序 172 项。
- `source/工作细胞/工作細胞 - 5卷-清水茜.epub`：OPF `OEBPS/content.opf`，spine 221 项，ncx 目录 0 项，图片阅读顺序 220 项。
- `source/工作细胞/工作細胞 - 6卷 [完]-清水茜.epub`：OPF `OEBPS/content.opf`，spine 165 项，ncx 目录 0 项，图片阅读顺序 164 项。

## 用户参考表 vs EPUB 目录

- EPUB 题名需要人工确认：6
  - 工作細胞 - 1卷-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - Vol.01 - 清水茜", draft manifest="工作细胞"
  - 工作細胞 - 2卷-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - Vol.02 - 清水茜", draft manifest="工作细胞"
  - 工作細胞 - 3卷-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - Vol.03 - 清水茜", draft manifest="工作细胞"
  - 工作細胞 - 4卷-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - Vol.04 - 清水茜", draft manifest="工作细胞"
  - 工作細胞 - 5卷-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - Vol.05 - 清水茜", draft manifest="工作细胞"
  - 工作細胞 - 6卷 [完]-清水茜.epub: needs_manual_review (epub_title_differs_from_draft_manifest); EPUB title="工作細胞 - 6卷", draft manifest="工作细胞"
- 已映射主题：0
- 需要人工确认主题：27

- EPUB 已解析，但 nav/toc 没有可比对的章节标题；用户参考主题仍需人工绑定到 spine 或图片页范围。

## 等待人工补充的 sourceParts

- streptococcus-pneumoniae / v01-pending：image_range_not_mapped
- cedar-pollen-allergy / v01-pending：image_range_not_mapped
- influenza / v01-pending：image_range_not_mapped
- abrasion / v01-pending：image_range_not_mapped
- food-poisoning / v02-pending：image_range_not_mapped
- heatstroke / v02-pending：image_range_not_mapped
- erythroblast-and-myelocyte / v02-pending：image_range_not_mapped
- cancer-cell / v02-pending：image_range_not_mapped
- blood-circulation / v03-pending：image_range_not_mapped
- common-cold-syndrome / v03-pending：image_range_not_mapped
- thymocyte / v03-pending：image_range_not_mapped
- adaptive-immunity / v03-pending：image_range_not_mapped
- acne / v03-pending：image_range_not_mapped
- staphylococcus-aureus / v04-pending：image_range_not_mapped
- dengue-fever / v04-pending：image_range_not_mapped
- hemorrhagic-shock / v04-pending：image_range_not_mapped
- peyers-patches / v04-pending：image_range_not_mapped
- helicobacter-pylori / v05-pending：image_range_not_mapped
- antigenic-variation / v05-pending：image_range_not_mapped
- cytokines / v05-pending：image_range_not_mapped
- gut-microbiota / v05-pending：image_range_not_mapped
- cancer-cell-ii / v05-pending：image_range_not_mapped
- bump-on-head / v06-pending：image_range_not_mapped
- left-shift-of-white-blood-cells / v06-pending：image_range_not_mapped
- induced-pluripotent-stem-cells / v06-pending：image_range_not_mapped
- psoriasis / v06-pending：image_range_not_mapped
- novel-coronavirus / v06-pending：image_range_not_mapped

## 图片输出规范

- 公开漫画页图片：`public/books/工作细胞/<topicId>/pages/<sourcePartId>-pageNNN.<ext>`
- 预留缩略图：`public/books/工作细胞/<topicId>/thumbs/<sourcePartId>-pageNNN.<ext>`
- 预留裁切图：`public/books/工作细胞/<topicId>/crops/<sourcePartId>-cropNNN.<ext>`
- 完整 EPUB 只允许保留在私有输入目录，不得复制到 `public/`、`dist/`、`build/` 或 `docs/`。

