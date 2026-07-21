# FR-P3B Carmela media and audio design

## Decision

FR-P3B keeps the P3A companion-page information architecture and changes only when Carmela media becomes active and how that media is grouped. Each of the 12 books now has one deterministic media registry, semantic media groups, disclosure-triggered thumbnail mounting, a group-scoped lightbox and a user-triggered audio lifecycle.

This remains a static GitHub Pages implementation. It adds no runtime dependency, media derivative, background player, autoplay, browser-storage state or route-scoped data-loading work.

## Evidence basis

The design is checked against:

- `reports/portfolio/fr-p3b/fr-p3b-media-reference-baseline-before.json`, captured from the P3A starting point;
- the current implementations in `assets/carmela-companion.js`, `assets/app.js`, `assets/a11y.js` and `assets/styles.css`;
- the focused registry, disclosure, lightbox and audio tests;
- browser evidence for Book 1, Book 11 and the remaining ten books.

The P3A media inventory contained 297 book-local unique page paths, 69 book-local unique explanation-image paths, 988 use sites and 333 semantic groups. FR-P3B represents those same 366 book-local unique references once across the 12 registries while preserving all 988 use-site records. The 622 repeated use sites are retained as lineage; they are not rendered as duplicate items within a group.

## Book-level media model

`createCarmelaCompanionViewModel(book)` remains the single allowlisted adapter. It now emits two additional root objects.

| Object | Contract |
|---|---|
| `mediaRegistry` | One entry per canonical book-relative path within that book, keyed by a deterministic media id |
| `mediaGroups` | One semantic disclosure group, with ordered and de-duplicated media ids |

A registry entry contains its id, canonical relative path, public absolute path, kind, child-facing label, alternative text, optional page number and every use site. A use site retains its section, owning item, group and original position. A group contains its id, label, kind, section, owner and ordered media ids.

Canonicalization converts backslashes to slashes, normalizes Unicode, removes safe dot segments and rejects absolute paths, URL schemes and traversal outside the media root. A stable id combines the book slug, a readable filename stem and a deterministic hash of the canonical path. Rebuilding the same book produces the same object graph.

### Group ownership

| Content owner | Group contract |
|---|---|
| Story scene | one page-evidence group |
| Question card | one answer-evidence group |
| Background entry | separate page and explanation groups |
| Encyclopedia entry | separate page and explanation groups |

Page evidence and explanatory art stay separate even when they belong to the same card. Within each group, the first occurrence establishes order and later occurrences of the same path are omitted from navigation. The registry still records every occurrence, so de-duplication does not erase content lineage. Explanation entries keep neutral registry copy; the thumbnail and lightbox label/alternative text are derived from the current group, so the seven real cross-group reuse cases do not inherit wording from the first use site.

No source path, OCR field, prompt identifier, review field or local absolute path crosses the adapter boundary. The 12 source book records and their media bytes remain unchanged.

## On-demand disclosure lifecycle

Each Carmela media disclosure contains an empty active mount and an inert `<template>`. The template may describe the future thumbnail elements, but template content is outside the active document tree and does not initiate image requests. The initial Book 1 and Book 11 routes therefore contain zero active page-media images and zero page-media opener buttons.

The lifecycle is:

1. The disclosure is closed by default.
2. Its first non-print `toggle` to open clones exactly that group into the active mount.
3. Each mounted image uses `loading="lazy"`, `decoding="async"`, stable aspect-ratio styling, meaningful alternative text and the group/opener metadata.
4. The mounted marker prevents duplicate construction. Closing and reopening retains the loaded group and creates no repeat transfer.
5. No other closed group is mounted as a side effect.
6. Route teardown removes thumbnail `src` attributes, empties the active mounts and clears the mounted markers.

Print mode refuses first-time mounting and CSS excludes media disclosures. This preserves companion text and answers without making a gallery part of the printed reading aid.

## Group-scoped lightbox

The lightbox uses event delegation because Carmela openers do not exist until a disclosure mounts. An opener carries:

- `data-lightbox-group`;
- `data-media-id`;
- `data-lightbox-src`;
- `data-lightbox-alt`;
- an accessible position label such as `第 1 张，共 5 张`.

When an opener is activated, the controller gathers only connected openers with the same group id, removes duplicate media ids or paths and sets that list as the active navigation scope. Previous/next and ArrowLeft/ArrowRight wrap only within that scope. A one-item group disables both navigation controls. The caption combines the alternative text with the current position.

The idle lightbox image has no `src` attribute and remains hidden. Opening assigns only the active image URL; decoding failure is safe. Closing or route teardown removes the active `src` attribute, hides the image, clears alternative text and caption, disables navigation and discards the active group. Escape, background inerting, focus trap, scroll restoration and close controls are retained.

Focus returns to the opener when it is still connected. If route or mount cleanup removed it, the controller tries the owning disclosure summary, then the captured route fallback, then the current route heading or main content. The legacy default-group path remains available to the Work Cells renderer.

## User-triggered audio lifecycle

The audio element keeps native controls but starts with `preload="none"`, no `src` attribute, a `--:--` total, a disabled seek control and the message `尚未加载音频。选择播放后才会请求文件。` The public media path is held as inert configuration until intent.

Seven explicit UI phases are supported:

| Phase | Entry and UI behavior |
|---|---|
| `idle` | no media request; play label; seek disabled |
| `loading` | source attached once after intent; `aria-busy="true"` |
| `ready` | metadata/can-play available; finite total enables seek |
| `playing` | play promise accepted; control changes to pause |
| `paused` | playback paused; seek remains available |
| `ended` | near-end playback finished; restart label shown |
| `error` | safe message, enabled retry control and disabled seek |

The custom play control requests playback. Pointer or Space/Enter interaction with native controls primes the same source path, and a chapter-marker action also follows the user-intent path. The source is not repeatedly assigned during normal playback.

The custom range and keyboard range input clamp a finite target between zero and the media total. An unknown total stays `--:--`; no `NaN` value reaches the UI. Pause, a 30-second seek, ArrowRight adjustment, resume, near-end seek and replay-after-end are covered by browser evidence. A failed media request enters `error`; retry detaches the failed resource, reattaches the same public source and can return to `playing`.

## Route teardown and diagnostic boundary

Leaving a book aborts listeners, pauses the old element, removes its `src` attribute and calls `load()` to release playback. The detached element is paused, no background media request continues, and the next book starts in `idle` with no `src` attribute.

Chromium can retain the last selected URL in the read-only `currentSrc` diagnostic after the element has been detached and its `src` attribute removed. FR-P3B does not claim that diagnostic value becomes empty. The release contract is the observable lifecycle: `src` attribute absent, element detached and paused, no background request, and the next route idle.

No playback position is written to local storage, session storage, cookies or the URL, and playback never starts without user intent.

## Explicit boundaries

FR-P3B does not alter the 28-file startup data chain, book JSON, media bytes, source assets, Work Cells data, Pages workflow or repository visibility. It does not generate images, transcode audio, add responsive media derivatives, introduce a service worker or begin FR-P4/FR-P5 work.
