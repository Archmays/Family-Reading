# How to Add Carmela Audio

本项目把《不一样的卡梅拉》音频作为纸质书阅读时的点播辅助，不保存播放记录，不做学习统计，也不和任何阅读状态绑定。

## Current Mapping

前四本已经建立从原始音频到 GitHub Pages 发布路径的映射：

| Book | Source file | Public file |
| --- | --- | --- |
| 01 我想去看海 | `source/不一样的卡梅拉/01-我想去看海.mp3` | `public/audio/carmela-s1/carmela-s1-01.mp3` |
| 02 我想有颗星星 | `source/不一样的卡梅拉/02-我想有颗星星.mp3` | `public/audio/carmela-s1/carmela-s1-02.mp3` |
| 03 我想有个弟弟 | `source/不一样的卡梅拉/03-我想有个弟弟.mp3` | `public/audio/carmela-s1/carmela-s1-03.mp3` |
| 04 我去找回太阳 | `source/不一样的卡梅拉/04-我去找回太阳.mp3` | `public/audio/carmela-s1/carmela-s1-04.mp3` |

`source/不一样的卡梅拉` 下的 MP3 是原始素材，不要修改、重命名、压缩或覆盖。网页只引用 `public/audio/carmela-s1` 下的发布副本。

## Data Fields

每本书的 `companion.json` 音频块使用：

```json
{
  "audio": {
    "title": "我想去看海",
    "bookSlug": "carmela-s1-01",
    "path": "public/audio/carmela-s1/carmela-s1-01.mp3",
    "sourcePath": "source/不一样的卡梅拉/01-我想去看海.mp3",
    "markers": [],
    "markerNote": "当前只接入整本音频；没有可靠的场景时间点证据，因此不添加 markers。"
  }
}
```

`series.json` 中前四本的 `audio.path` 和 `audio.sourcePath` 应保持同样映射，方便首页和书籍页使用同一套路径。

## 第 5-12 本

后续接入第 5-12 本时，按以下步骤处理：

1. 确认原始 MP3 已存在于 `source/不一样的卡梅拉`，不要改动原文件名。
2. 复制一份到 `public/audio/carmela-s1/`。
3. 发布文件名使用 ASCII slug，例如 `carmela-s1-04.mp3`、`carmela-s1-05.mp3`。
4. 在对应书籍的 `companion.json` 中添加或更新 `audio.path` 为 public 路径，并用 `audio.sourcePath` 记录原始 source 路径。
5. 在 `public/books/不一样的卡梅拉/series.json` 对应书籍条目里写入同样的 `audio` 映射。
6. 如果没有可靠时间点证据，保持 `markers: []`，不要编造 marker。
7. 页面播放器必须继续使用 `preload="metadata"`，不要自动播放，也不要添加播放历史、录音、账号或统计功能。
8. 运行构建检查，确认静态 GitHub Pages 路径可用。

## Marker Rule

只有在有可靠时间点来源时才添加 marker。marker 至少应有清楚的秒数和标签；没有证据时，保留空数组，并让页面显示“没有可靠的场景时间点证据”的提示。
