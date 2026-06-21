# 工作细胞 V2 维护检查清单

本清单用于后续新增、修正或复核《工作细胞》V2 主题。除非另有明确 phase 目标，不新增主题、不生成图片、不重写大段内容、不改前端框架。

## 1. 修改主题前必查字段

每个主题必须保持：

- `contentVersion: work-cells-v2`
- `topicOverview`
- `bodyScienceStations.length === 4`
- `parentQuestionCards.length === 6`
- `parentReadingNote`
- `sourceNotes`
- `relatedComicPages`
- `relatedAnimationScenes`
- `contentStatus`
- `qualityFlags`

每张身体科学小站卡至少检查：

- `id`
- `title`
- `coreQuestion`
- `explanation`
- `imagePromptId`
- `imageAsset`
- `imageAlt`
- `biologyConcepts`
- `encyclopediaTags`
- `parentNote`

每张亲子问题卡至少检查：

- `id`
- `category`
- `title`
- `question`
- `answer`
- `parentHint`
- `relatedPageIds`
- `biologyConcepts`

用户可见字段不得出现连续 `????`。如果来源文本无法确认，停止并写问题清单，不要凭空重写。

## 2. 图片命名和路径规则

PNG 原图归档路径：

```text
data/cells-at-work/source-assets/science-station/<topicId>/png-originals/
```

正式 WebP 发布路径：

```text
public/assets/cells-at-work/science-station/<topicId>/<topicId>-v2-station-0N.webp
```

维护要求：

- 每个主题 4 张正式小站 WebP。
- 全站 27 个主题共 108 张小站 WebP。
- `public/assets/cells-at-work/science-station/` 不放 PNG、JPG 或临时图。
- `imageAsset` 只能指向正式 WebP。
- 不引用 legacy 小站图。
- 不重写已确认 prompt。
- Codex 不得自行生成正式图片；正式 PNG 必须来自用户确认。

## 3. Dist 禁入项

`dist` 中不得出现：

- Work Cells PNG 原图。
- MP4、MOV、M4V、WEBM。
- SRT、VTT、ASS、SSA。
- 抽取音频或 audio-fallback 文件夹。
- transcript 或 topic-readable-transcripts。
- scene-notes。
- screenshot-candidates。
- review-contact-sheets。
- pages-by-volume。
- visual-annotation-bundles。
- ZIP、7z、tar、gz 等压缩包。

`dist` 体积必须低于 900 MB。

## 4. 必跑命令

任何正式提交前运行：

```bash
node scripts/validate-work-cells-visual-annotations.mjs
node --test tests/mvp.test.mjs
node scripts/build.mjs
node scripts/audit-dist-assets.mjs
```

建议额外复核：

```bash
git diff --check
git status --short --branch
```

## 5. 特殊边界

- `cancer-cell` 与 `cancer-cell-ii` 必须独立，不能合并。
- `cancer-cell` 来源为第2卷第8-9话。
- `cancer-cell-ii` 来源为第5卷第24-25话。
- `hemorrhagic-shock` 是第4卷第17-18话合并后的一个主题。
- `covid-19` 必须保持第6卷第29话，不得标成第30话。
- `covid-19`、`left-shift`、`ips-cells`、`psoriasis` 不强行绑定动画资源。
- `audio-fallback`、`medium-confidence`、`needs-human-review` 提醒必须保留在数据层。
- 不恢复漫画全文浏览、页面标注浏览、百科独立路由或动画播放器。
- 不展示漫画全文、动画全文、完整对白、完整字幕、完整 OCR 或完整 transcript。

## 6. 敏感主题复核

以下主题修改后必须复核语气：

- `cancer-cell`
- `cancer-cell-ii`
- `hemorrhagic-shock`
- `dengue-fever`
- `covid-19`
- `ips-cells`
- `psoriasis`
- `left-shift`

复核标准：

- 文案温和、准确、不恐吓。
- 不替代医学建议。
- 不给诊断、治疗或用药判断。
- 不把疾病、患者或身体反应道德化。
- 亲子问题适合共读，不制造羞辱或恐惧。
