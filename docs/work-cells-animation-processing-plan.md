# Work Cells Animation Processing Plan

Generated: 2026-06-18

This document records the implementation boundaries for using the licensed Work Cells animation resources in the Book Companion project. It does not contain full subtitles, full dialogue, screenshots, audio extracts, or frame sequences.

## Resource Inventory

Source directory: `source/工作细胞`

- MP4 files: 22
- SRT files: 14
- Same-base MP4/SRT matches: 14
- MP4 files missing SRT: 8, all S2 episodes
- Orphan SRT files: 0

Private metadata files:

- `data-private/cells-at-work/animation/animation-resource-inventory.json`
- `data-private/cells-at-work/animation/animation-topic-map.json`
- `data-private/cells-at-work/animation/scene-notes/pneumococcus.sample.json`
- `data-private/cells-at-work/animation/scene-notes/hemorrhagic-shock.sample.json`

The original MP4 and SRT files remain in `source/工作细胞`. They must not be moved, renamed, deleted, compressed, re-encoded, or copied into `dist`.

## Topic Mapping Summary

High-confidence animation matches:

1. 肺炎链球菌
2. 杉树花粉过敏
3. 流行性感冒
4. 擦伤
5. 食物中毒
6. 中暑
7. 红血球母细胞与骨髓细胞
8. 癌细胞
9. 血液循环
10. 感冒症候群
11. 胸腺细胞
12. 获得性免疫
14. 金黄色葡萄球菌
15. 登革热
16. 出血性休克
18. 幽门螺杆菌
20. 细胞因子
22. 癌细胞Ⅱ
23. 撞出肿包

Medium-confidence animation matches:

- 痤疮
- 派尔斑
- 抗原变异
- 肠道菌群

No current animation match:

- 白细胞左移
- iPS细胞
- 银屑病
- 新型冠状病毒

`癌细胞` and `癌细胞Ⅱ` must remain separate. `出血性休克` maps to two animation files and must keep both episode records. `新型冠状病毒` has no matching animation file in the current source folder and must not be force-mapped.

## Processing Rules

Use existing SRT files first. Do not extract audio unless an SRT is missing or unusable and a later task explicitly approves fallback transcription.

Scene notes should be summary-only and timecoded. A valid scene note includes:

- `sceneId`
- `topicId`
- `topicName`
- `animationFile`
- `srtFile`
- `startTime`
- `endTime`
- `shortSummaryZh`
- `scienceFocus`
- `candidateScreenshotTimes`
- `candidateScreenshotPurpose`
- `parentQuestionIdeas`
- `bodyScienceStationIdeas`
- `sensitiveContentNote`
- `doNotQuoteDialogue: true`

Do not output full Chinese dialogue, full English subtitles, sentence-by-sentence subtitle translation, or a complete plot retelling. The animation is support material for topic understanding, screenshot location, content refinement, and original explanation-image prompt design.

## Screenshot Rules

This phase does not create screenshots.

For a later approved screenshot phase:

- Capture only a few key scenes per theme, not a full sequence.
- Every screenshot must have a clear Book Companion use.
- Convert selected release images to low-volume WebP.
- Keep candidate screenshots and contact sheets outside `dist`.
- Never publish MP4 files, full SRT files, complete screenshot sequences, or an animation player.
- Original body-science explanation images still use the prompt workflow: Codex writes the prompt, the user generates and places the image, and Codex connects the approved asset.

## Build And Dist Guardrails

The build script excludes video and subtitle extensions:

- `.mp4`
- `.mov`
- `.m4v`
- `.webm`
- `.srt`
- `.vtt`
- `.ass`
- `.ssa`

The dist audit fails if it finds video files, subtitle files, `screenshot-candidates`, `review-contact-sheets`, or `scene-notes` inside `dist`.

Allowed release material remains limited to app code, selected lightweight public assets, page thumbnails, approved original explanation images, selected WebP animation stills, and explicitly reduced JSON data.

The release package should stay below the 900 MB warning threshold.
