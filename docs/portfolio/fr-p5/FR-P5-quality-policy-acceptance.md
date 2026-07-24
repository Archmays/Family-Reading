# FR-P5 quality policy acceptance

## Decision

FR-P5 accepts deterministic WebP derivatives encoded by Python 3.12.7, Pillow 10.4.0 and libwebp 1.3.2. Preview and station variants use quality 94; compact covers use quality 92; lightbox variants use quality 96. Every WebP profile fixes `method=6`, `exact=true`, `lossless=false`, and preserves alpha when present.

The accepted machine policy is:

- `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json`
- canonical policy hash: `9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08`
- tracked JSON byte SHA-256: `0de9befe026240fa90319e4007cd4f52419eee003b871705af34dc77d65cc075`

Python generation and Node validation independently reproduce the canonical policy hash. Encoder quality, formats and dimensions cannot be reduced to make a byte gate pass.

## Representative experiment

The bounded experiment encoded 182 candidates from nine real logical sources and their accepted high-resolution derivation bases. It covered all ten runtime roles and the required visual families:

| Sample | Evidence family | Roles covered |
|---|---|---|
| `我想去看海/pages/001.png` | cover with small title/credit text | Carmela series and book covers |
| `我爱平底锅/pages/002.png` | largest source and small light-on-dark dialogue | Carmela page preview and lightbox |
| `我想有个弟弟/pages/019.png` | dense painted linework | Carmela page preview and lightbox |
| `我要救出贝里奥/pages/009.png` | complex color and dark gradient | Carmela page preview and lightbox |
| `hedgehog-spines.png` | generated explanation with fine texture | Carmela explanation and lightbox |
| `我能打败怪兽/pages/024.png` | smallest-dimension referenced text page | Carmela page preview and lightbox |
| `food-poisoning__v02_page-004.webp` | series card, Hero and labeled color manga | Work Cells series, Hero, manga and lightbox |
| `food-poisoning__v02_page-005.webp` | dense black-and-white manga labels | Work Cells manga and lightbox |
| `food-poisoning-v2-station-01.webp` | gradient, anatomy edges and soft color | Work Cells station and lightbox |

Inventory found zero alpha sources and zero raw or normalized-pixel duplicate groups. Those conditional families are recorded as observed-not-applicable rather than represented by unrelated files.

Candidate matrix:

- WebP lossy at quality 88, 92, 94 and 96;
- WebP lossless;
- JPEG quality 94, 4:4:4, optimized and progressive;
- PNG lossless, optimized at compression level 9;
- all accepted target width families, without upscaling.

The temporary full-image contact sheet was 871,706 bytes with SHA-256 `3d624861b63bf0d1eaaf3344c68d0c691bfb77467c1181af825e8b1b5e58c004`. The text-crop sheet was 310,754 bytes with SHA-256 `b142a4da94f33f744a9f17341269b918ed5c87b941c402aa168adca45cf6cd4e`. Both remain task scratch and are deleted after acceptance; their hashes retain the compact lineage.

The tracked 88,412-byte experiment summary is `reports/portfolio/fr-p5/fr-p5-quality-experiment-summary.json` with SHA-256 `0a9643c72c0abf3e3bccd33056237adec56b20faa21a3ff0c08c8ca2dd52d1f3`. It retains all 182 bounded measurements and the visual decision without publishing candidate derivatives or contact sheets.

## Automated comparison

The following totals compare the nine representative review widths. PSNR is supporting evidence only and did not approve text readability.

| Candidate | Total bytes | Median bytes | Median PSNR | Visual decision |
|---|---:|---:|---:|---|
| WebP lossy q88 | 1,053,482 | 101,888 | 37.285 dB | readable, but rejected for the smallest dense labels and line-edge margin |
| WebP lossy q92 | 1,303,842 | 133,630 | 38.904 dB | accepted for compact covers |
| WebP lossy q94 | 1,481,340 | 162,234 | 39.921 dB | accepted for previews and station images |
| WebP lossy q96 | 1,682,740 | 184,702 | 40.781 dB | accepted for lightbox detail |
| WebP lossless | 4,924,936 | 579,480 | lossless | no visible target-size benefit; median bytes were 3.57× q94 |
| JPEG q94 4:4:4 | 2,141,571 | 243,665 | 42.754 dB | larger and cannot preserve alpha |
| PNG lossless | 6,823,370 | 796,670 | lossless | materially larger; no referenced alpha need |

The lossless WebP worst-case encode took 19.678 seconds. The accepted lossy variants stayed below 0.203 seconds per representative encode. AVIF was rejected before candidate production because this exact Pillow environment exposes no AVIF encoder; unsupported options are not silently ignored.

## Visual acceptance

Direct inspection at native review widths, text crops and lightbox-size equivalents confirmed:

- the Carmela dialogue and book-cover text remains readable;
- Work Cells vertical labels, speech balloons and fine black lines remain separated;
- no ringing or halo objection is visible at the accepted q94/q96 levels;
- dark gradients and generated soft backgrounds show no objectionable banding;
- color balance and line edges remain stable;
- no crop or rotation is introduced;
- accepted lightbox variants are materially clearer than their preview variants;
- no alpha edge claim is made because the inventory contains no alpha source.

Automated metrics supported but did not replace this visual decision.

## Frozen profiles

| Family | Widths | Quality | Roles |
|---|---|---:|---|
| Carmela cover | 240, 480 | 92 | series cover, book cover |
| Carmela page preview | 480, 800, 960 | 94 | page preview |
| Carmela explanation | 480, 800, 1280 | 94 | explanation preview |
| Carmela lightbox | 1600 or smaller source | 96 | lightbox |
| Work Cells page compact | 240 | 92 | series thumbnail |
| Work Cells page responsive | 360, 640, 960 | 94 | series thumbnail, topic Hero, manga preview as applicable |
| Work Cells station | 640, 960 | 94 | station preview |
| Work Cells lightbox | 1440 or smaller source | 96 | lightbox |

The fallback for every role is a declared WebP derivative. Source paths are never an accepted production fallback.

## Frozen size and transfer budgets

The final policy generation produced 778 source entries, 2,735 variants and 612,770,984 derivative bytes. Its canonical manifest is 3,767,069 bytes with SHA-256 `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8`. The final build report binds the exact owner-shard, application, runtime, audio and Pages-artifact totals rather than carrying forward the earlier sizing preview.

The accepted policy freezes:

- dist at 715,000,000 bytes;
- the conservative pre-upload Pages artifact bound at 720,000,000 bytes;
- route cold-transfer ceilings from 400,000 bytes for Home through 2,600,000 bytes for the Work Cells series.

Each route ceiling was calculated from the final policy-addressed application closure, exact route JSON and owner-shard bytes, and the largest accepted initial-role image variant. Browser measurements confirm these ceilings; they do not redefine or raise them.

## Acceptance status

```text
ENCODER_VERSION_STATUS: PASS
LIBWEBP_VERSION_STATUS: PASS
SOURCE_FORMAT_COVERAGE: PNG, WEBP
ALPHA_PRESERVATION_STATUS: PASS_NOT_APPLICABLE_TO_CURRENT_SOURCES
VISUAL_SAMPLE_ROLE_COVERAGE: 10/10
TEXT_READABILITY_STATUS: PASS
LINE_AND_GRADIENT_STATUS: PASS
LIGHTBOX_DETAIL_STATUS: PASS
POLICY_HASH_STATUS: PASS
QUALITY_COMPROMISES: 0
ENCODER_QUALITY_POLICY: PASS
```
