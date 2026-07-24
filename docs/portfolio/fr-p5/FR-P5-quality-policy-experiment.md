# FR-P5 media quality experiment and policy freeze

## Purpose

FR-P5 does not choose image widths or compression quality from generic web advice. The accepted derivative policy must come from the actual Carmela and Work Cells media set, with special priority given to small comic text, thin linework, transparency and lightbox readability.

The experiment happens before the first full production write and before the build switches to manifest-only media.

## Environment record

Record:

- operating system;
- Python version;
- Pillow version and enabled codecs;
- optional ImageMagick/sharp versions if evaluated;
- CPU and available memory only when needed to explain encoding time;
- command lines and deterministic options;
- color-profile/metadata handling;
- output hash reproducibility.

No machine username, absolute project path, token or profile is written to tracked evidence.

## Required sample families

The sample set must be selected from the generated reference inventory and recorded by stable media id/path.

At minimum include:

1. Carmela page with the smallest readable dialogue text;
2. Carmela page with dense black linework;
3. Carmela page with complex color/gradients;
4. Carmela generated explanation image;
5. transparent image, if any referenced source has alpha;
6. Work Cells series/topic thumbnail;
7. Work Cells topic Hero;
8. Work Cells station explanation illustration;
9. Work Cells manga page with dense labels;
10. current largest referenced image;
11. current smallest referenced image that still carries text;
12. duplicate-byte/pixel representative if the inventory finds duplicates.

The sample selection must cover both domains and every media role.

## Candidate dimensions

Start with a bounded candidate matrix rather than a fixed policy:

| Family | Candidate widths |
|---|---|
| series/card/cover | 240, 320, 480 |
| Hero | 480, 640, 800, 960, 1200 |
| preview | 480, 640, 800, 960 |
| manga page preview | 640, 800, 960, 1080 |
| lightbox | 1280, 1440, 1600, source width when smaller |

The final widths may differ when the real source-size distribution or text readability supports another choice. The generator never upscales above source width.

## Candidate formats

Evaluate:

- WebP lossy;
- WebP lossless for alpha/line-art where useful;
- JPEG only where it visibly outperforms WebP or is required as fallback;
- PNG for transparency/line-art only when derivative alternatives fail quality or compatibility;
- AVIF only if the active Pillow build supports it deterministically and browser quality/encoding time justify it.

AVIF is optional. It must not be adopted solely because it produces the smallest byte count.

## Candidate quality profiles

For lossy candidates, test several quality levels rather than one global number. Suggested starting ranges:

- comic/page text: 88–96;
- cover/Hero: 84–94;
- painted/gradient illustration: 82–92;
- station diagram: 86–94.

Lossless candidates must be compared against high-quality lossy versions. The accepted policy can assign different profiles to different role families.

## Automated evidence

For every candidate record:

- source and output dimensions;
- format/mode/alpha;
- bytes and SHA-256;
- compression ratio;
- encoding duration;
- successful Pillow decode;
- no EXIF-rotation error;
- no unexpected crop;
- optional pixel metrics such as SSIM/PSNR when available.

Automated metrics are supporting evidence only. They cannot approve text readability.

## Visual evidence

Inspect candidates at:

- native CSS size;
- 1.5× DPR equivalent;
- 2× DPR equivalent;
- lightbox fit;
- browser zoom/reflow equivalents used by the project.

Check:

- smallest text remains readable;
- lines do not break into ringing/halos;
- flat colors do not show objectionable blocks;
- gradients do not band;
- alpha edges remain clean;
- no visible color cast;
- no unexpected blur from browser upscaling;
- lightbox version is materially clearer than preview.

Retain only a compact representative contact sheet or viewport screenshots. Candidate directories remain task scratch and are deleted after policy freeze.

## Policy freeze

The accepted tracked policy is:

- `reports/portfolio/fr-p5/fr-p5-media-quality-policy.json`

It must include:

```text
schemaVersion
encoder name/version
profiles sorted by id
format/width/quality/lossless/method parameters
roles per profile
alpha strategy
fallback decision
visualAcceptance sample ids and outcome
frozen route/dist budgets
```

The policy hash becomes part of `public/media/media-manifest.json`.

After the policy is committed:

- do not lower quality to meet a size target;
- do not increase size budgets to hide orphan/duplicate publishing;
- change the policy only with new representative evidence and a recorded reason;
- rerun affected samples before regenerating the full set.

## Full-production acceptance

Before renderer/build cutover:

- every referenced source decodes;
- every declared derivative decodes;
- generation repeated twice is byte-identical;
- source/media use-site parity passes;
- all roles are covered;
- missing/stale/orphan derivatives are zero;
- source files and protected roots are unchanged;
- sample visual evidence passes the frozen policy.

```text
ENCODER_QUALITY_POLICY: PASS | FAIL
DERIVATIVE_VISUAL_QUALITY: PASS | FAIL
MEDIA_DETERMINISM_STATUS: PASS | FAIL
```
