# FR-P4B-R1 Work Cells responsive layout repair

## Purpose

Repair the Science Topic Atlas hero collision reported after FR-P4B release. At some effective CSS widths and zoom combinations, the bordered topic-media panel extended into the adjacent text column and obscured the title, summary and reading-focus copy.

This repair is deliberately bounded. It does not change Work Cells runtime content, media files, route loading, Carmela, the P4A generator or any FR-P5 media pipeline.

## Root cause

The released hero combined three constraints that were individually reasonable but unsafe together:

1. the first grid track used `minmax(13rem, 0.34fr)`;
2. the media panel used `min-height: 16rem` together with `aspect-ratio: 4 / 3`, allowing its intrinsic inline size to exceed the allocated track;
3. the same node also used the generic `topic-thumbnail` class, which retained generic padding and an image `max-height` intended for series cards;
4. the compact short-height media query appeared after the width query and could restore a two-column hero without requiring a safe minimum width.

The fixed viewport matrix used for P4B did not sweep the continuous width/zoom interval in which those constraints can interact.

## Web-side repair

The shared repair branch changes only:

- `assets/science-companion.css`;
- `index.html` stylesheet cache identity;
- `tests/fr-p4b-r1-responsive-layout.test.mjs`;
- R1 documentation and handoff evidence.

The repair:

- gives both grid tracks a zero minimum and caps the media track at 20rem;
- gives the media panel `width: 100%`, `max-width`, `min-width: 0`, `min-height: 0` and `padding: 0`;
- removes the inherited image-height cap with `max-height: none`;
- adds wrapping and maximum-width guards to hero copy, tags and actions;
- switches the hero, body and overview to one column at 68rem rather than waiting for the former 900px breakpoint;
- allows the short-height compact two-column form only above 68.0625rem;
- preserves the missing-image fallback;
- changes the stylesheet cache identity to `fr-p4b-r1-20260723`.

The generic `topic-thumbnail` class remains in the current renderer, but every conflicting size/padding property is explicitly neutralized by the later, domain-specific hero rule. Local Codex may remove the generic class only if the browser sweep demonstrates a remaining interaction; doing so is not required for the web checkpoint.

## Static contracts added

The R1 test asserts:

- zero-minimum, capped hero tracks;
- no 16rem minimum-height constraint on the media panel;
- no generic max-height cap on the hero image;
- the 68rem one-column boundary;
- short-height two-column mode gated behind a safe width;
- long-copy/tag/action containment;
- a new stylesheet cache identity.

These are static contracts. The web phase does not claim browser geometry, Pages or release-gate acceptance.

## Required local geometry acceptance

Local Codex must use real browser bounding boxes and assert, for every measured case:

```text
media.right + expectedGap <= copy.left
media.left >= hero.left
copy.right <= hero.right
hero.scrollWidth <= hero.clientWidth
```

Required sweep:

- widths 320 through 1440 CSS px, step no larger than 32px;
- dense focus from 680 through 1120px, step no larger than 16px;
- browser zoom/equivalent scale 80, 90, 100, 110, 125, 150, 175 and 200 percent;
- short-height combinations including 1024x400, 900x500, 844x390, 800x450, 773x709, 667x375 and 390x844;
- all 27 Work Cells topics at mobile and desktop endpoints;
- representative long-title, long-category, long-source, long-summary and high-tag-count topics.

The reported food-poisoning route must be included explicitly.

## Non-regression gates

- Work Cells detail JSON requests remain 3;
- initial hero image remains 1;
- initial station and manga media remain 0 / 0;
- answers, disclosures, grouped lightbox and route cleanup remain unchanged;
- Work Cells series remains unchanged;
- Carmela P3B media/audio remains unchanged;
- runtime manifest and protected-root signature remain unchanged;
- no FR-P5 derivative or artifact work begins.

## Release boundary

Only local Codex may claim PASS after targeted tests, continuous browser geometry, the single final release gate, exact-SHA Pages deployment and live reproduction at the reported size. The branch must then be fast-forwarded into `main`, pushed, deployed and cleaned up.
