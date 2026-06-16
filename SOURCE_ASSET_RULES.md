# Source Asset Rules

## Raw Source Folder

`source/不一样的卡梅拉/` is the raw source asset directory for season 1.

It currently contains:

- `不一样的卡梅拉.pdf`
- 12 MP3 audio files

Do not delete, move, rename, compress, overwrite, or re-encode these raw source files.

## Derived Asset Output

When a later phase is approved, images extracted from the PDF should be written to:

`public/books/不一样的卡梅拉/`

Do not write derived image files back into `source/`.

## Book Folder Names

The 12 book folders must use the final confirmed titles:

1. `我想去看海`
2. `我想有颗星星`
3. `我想有个弟弟`
4. `我去找回太阳`
5. `我爱小黑猫`
6. `我能打败怪兽`
7. `我要找到朗朗`
8. `我不要被吃掉`
9. `我好喜欢她`
10. `我要救出贝里奥`
11. `我不是胆小鬼`
12. `我爱平底锅`

## PDF Processing Rules

PDF extraction is a later phase. Do not start it during documentation-only work.

When extraction is approved:

- Split pages according to the reviewed book boundary table.
- Crop white borders from extracted page images.
- Preserve enough safe margin so content is not clipped.
- Keep a review sheet for before/after crop checks.

If a book boundary is uncertain, generate or update a review document first and pause for confirmation before bulk processing.
