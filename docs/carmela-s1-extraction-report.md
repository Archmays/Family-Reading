# 不一样的卡梅拉 PDF extraction and white-margin crop report

- Generated date: 2026-06-16
- Source PDF: `source/不一样的卡梅拉/不一样的卡梅拉.pdf`
- PDF total pages: 320, confirmed before extraction.
- Output root: `public/books/不一样的卡梅拉/`
- Total PNG size: 497.56 MiB (521,728,595 bytes)
- Source PDF and MP3 files were not moved, renamed, deleted, compressed, or overwritten.
- OCR, reading-content generation, and web-page work were not started.

## Book Outputs

| Order | Final title | PDF pages | Output pages | Output path | Image size |
|---:|---|---:|---:|---|---:|
| 1 | 我想去看海 | 1-26 | 26 | `public/books/不一样的卡梅拉/我想去看海/` | 40.79 MiB |
| 2 | 我想有颗星星 | 27-53 | 27 | `public/books/不一样的卡梅拉/我想有颗星星/` | 49.92 MiB |
| 3 | 我想有个弟弟 | 54-77 | 24 | `public/books/不一样的卡梅拉/我想有个弟弟/` | 39.27 MiB |
| 4 | 我去找回太阳 | 78-101 | 24 | `public/books/不一样的卡梅拉/我去找回太阳/` | 38.70 MiB |
| 5 | 我爱小黑猫 | 102-125 | 24 | `public/books/不一样的卡梅拉/我爱小黑猫/` | 30.61 MiB |
| 6 | 我能打败怪兽 | 126-149 | 24 | `public/books/不一样的卡梅拉/我能打败怪兽/` | 18.88 MiB |
| 7 | 我要找到朗朗 | 150-173 | 24 | `public/books/不一样的卡梅拉/我要找到朗朗/` | 38.99 MiB |
| 8 | 我不要被吃掉 | 174-197 | 24 | `public/books/不一样的卡梅拉/我不要被吃掉/` | 43.00 MiB |
| 9 | 我好喜欢她 | 198-221 | 24 | `public/books/不一样的卡梅拉/我好喜欢她/` | 40.81 MiB |
| 10 | 我要救出贝里奥 | 222-248 | 27 | `public/books/不一样的卡梅拉/我要救出贝里奥/` | 43.20 MiB |
| 11 | 我不是胆小鬼 | 249-296 | 48 | `public/books/不一样的卡梅拉/我不是胆小鬼/` | 57.15 MiB |
| 12 | 我爱平底锅 | 297-320 | 24 | `public/books/不一样的卡梅拉/我爱平底锅/` | 56.24 MiB |

## book-assets.json

Each book folder has `book-assets.json` with `seriesTitle`, `order`, `title`, `slug`, `folder`, `pdfPageStart`, `pdfPageEnd`, `pageCount`, `pageImages`, `sourcePdf`, and `needsReview`. `pageImages` uses relative paths such as `pages/001.png`.

## White-Margin Crop Method

- Pages were rendered from the PDF with PyMuPDF as RGB PNG sources at 150 DPI.
- A pixel was treated as content when its difference from pure white was greater than 10.
- The crop uses the content bounding box plus a 32 px safety margin on each side.
- If an illustration or scanned background reaches the page edge, the original boundary is preserved instead of forcing a crop.

## Spot Check Results

Using fixed random seed 20260616, one page from each book was visually checked in a contact sheet. White margins were trimmed where present; text, characters, illustrations, and page numbers were not clipped in the checked samples.

| Order | Title | PDF page | Book page | Image | Before crop | After crop |
|---:|---|---:|---:|---|---:|---:|
| 1 | 我想去看海 | 25 | 25 | `pages/025.png` | 1500x1125 | 1406x961 |
| 2 | 我想有颗星星 | 47 | 21 | `pages/021.png` | 1500x1125 | 1500x1008 |
| 3 | 我想有个弟弟 | 67 | 14 | `pages/014.png` | 1500x1125 | 1500x1032 |
| 4 | 我去找回太阳 | 85 | 8 | `pages/008.png` | 1500x1125 | 1500x1034 |
| 5 | 我爱小黑猫 | 122 | 21 | `pages/021.png` | 1500x1125 | 1500x1054 |
| 6 | 我能打败怪兽 | 142 | 17 | `pages/017.png` | 1500x1125 | 1500x1033 |
| 7 | 我要找到朗朗 | 167 | 18 | `pages/018.png` | 1500x1125 | 1500x1028 |
| 8 | 我不要被吃掉 | 188 | 15 | `pages/015.png` | 1500x1125 | 1500x1050 |
| 9 | 我好喜欢她 | 208 | 11 | `pages/011.png` | 1500x1125 | 1500x1008 |
| 10 | 我要救出贝里奥 | 231 | 10 | `pages/010.png` | 1500x1125 | 1500x1125 |
| 11 | 我不是胆小鬼 | 284 | 36 | `pages/036.png` | 1125x1500 | 1125x1500 |
| 12 | 我爱平底锅 | 309 | 13 | `pages/013.png` | 2100x1575 | 2100x1575 |

## Manual Review Notes

- No clipping risk was found in the spot check.
- Some pages in books 10, 11, and 12 keep more original boundary because full illustrations or scan background reach the edge. This is intentional to avoid cutting content.
- Before the next content stage, a continuous manual pass over all pages of the first three books is still recommended.

## Naming Correction Record

- Book 5 final title and official folder name: `我爱小黑猫`. Historical incorrect name `我要小黑猫` is recorded here only and was not used as an official title or folder name.
- Book 12 final title and official folder name: `我爱平底锅`. Historical incorrect names `我要开饭锅` and `我要平底锅` are recorded here only and were not used as official titles or folder names.
- The source MP3 filenames for books 5 and 12 already match the final titles; no source MP3 was renamed.

## GitHub Pages Check

- Output assets are static PNG and JSON files, with no server, database, login, or private runtime requirement.
- `book-assets.json` uses relative page-image paths, which can work under a GitHub Pages project subpath.
- Total PNG size is 497.56 MiB. This is suitable for static publishing, but it will make the repository and first-time transfer heavier. No WebP/JPEG derivatives were generated in this task because the requested output format is PNG.

## Source Asset Check

- Current source folder still contains 1 PDF and 12 MP3 files.
- This task only read from `source/`; no original source asset was moved, deleted, renamed, compressed, or overwritten.

