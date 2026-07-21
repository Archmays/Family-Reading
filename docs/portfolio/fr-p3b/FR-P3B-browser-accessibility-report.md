# FR-P3B browser and accessibility report

## Result

`ACCESSIBILITY_STATUS: PASS`

`RESPONSIVE_STATUS: PASS`

`PRINT_NON_REGRESSION: PASS`

`CARMELA_MEDIA_INTERACTION_STATUS: PASS`

`CARMELA_AUDIO_INTERACTION_STATUS: PASS`

The browser evidence covers the local static implementation in Chromium. Viewport, reduced-motion and forced-colors modes are emulations rather than claims about separate physical devices or assistive-technology combinations.

## Coverage

| Coverage set | Cases | Result |
|---|---:|---|
| Book 1 and Book 11 cold/warm interaction at 390x844 and 1440x900 | 4 | PASS |
| Remaining ten books at the same mobile and desktop ends | 20 | PASS |
| Book 1 and Book 11 at 768x1024, 1280x720, 1024x400 and 667x375 | 8 | PASS |
| Forced colors, reduced motion and Work Cells shared-shell smoke | 3 | PASS |
| Book 11 A4 print, first/middle/final visual review | 3 pages reviewed from 11 | PASS |
| Persistent visual baselines | 3 | PASS |

The 20 remaining-book cases opened the first media disclosure and matched mounted count to the disclosure's exact expected count at both viewport ends. The browser error collectors for both ten-book passes were empty. A focused Book 2 check also opened two groups that reuse the same explanation image and verified distinct current-group labels and alternative text over the same media URL.

## Representative initial metrics

| Metric | Book 1 | Book 11 | Gate |
|---|---:|---:|---|
| DOM nodes | 624 | 636 | at least 15% below 830 / 936 |
| DOM reduction | 24.82% | 32.05% | PASS |
| Active page-media images | 0 | 0 | must be 0 |
| Active page-media openers | 0 | 0 | must be 0 |
| Initial real tabbables | 47 | 47 | no more than 49 |
| Duplicate ids | 0 | 0 | must be 0 |
| Nested controls | 0 | 0 | must be 0 |
| Broken images | 0 | 0 | must be 0 |
| Horizontal overflow | 0 | 0 | must be 0 |

The initial route also had `preload="none"`, no audio `src` attribute, an `idle` audio phase and no idle lightbox `src` attribute.

## Media disclosure and lightbox

| Interaction | Observation | Result |
|---|---|---|
| Closed disclosure | no active thumbnails or opener controls | PASS |
| First open | Book 1 mounted exactly 2; Book 11 mounted exactly 5 | PASS |
| Thumbnail semantics | all had alternative text, lazy loading and async decoding | PASS |
| Close/reopen | retained exactly 2/5 nodes; zero new network event | PASS |
| Group scope | opener, next item and restored focus shared the same group id | PASS |
| Position copy | captions moved from 1/2 to 2/2 and 1/5 to 2/5 | PASS |
| Keyboard close | Escape closed the dialog and restored opener focus | PASS |
| Idle cleanup | image `src` attribute absent; alternative text and caption cleared | PASS |

The persisted Book 11 lightbox image shows that group navigation remains usable over the dense story route without merging the rest of the book into one gallery. The controller retains the P2 focus trap, background inerting and scroll restoration; route cleanup also supplies disclosure-summary and route-heading focus fallbacks when an opener no longer exists.

## Audio interaction

The normal browser path observed `idle -> loading -> ready -> playing -> paused -> playing -> ended`. The separately induced failure exercised the seventh phase, `error`, and a successful retry.

| Interaction | Observation | Result |
|---|---|---|
| Initial state | no MP3 request; `--:--`; seek disabled | PASS |
| First custom play | source attached after intent; 206 response; playing | PASS |
| Native fallback intent | pointer interaction attached source and entered loading | PASS |
| Pause/resume | control label and phase synchronized | PASS |
| Custom seek | 30-second target reached exactly | PASS |
| Keyboard seek | focused range plus ArrowRight reached 30.1 seconds | PASS |
| Near-end seek | 206 byte-range response and ended state | PASS |
| Error state | retry enabled, seek disabled and safe live message | PASS |
| Retry | returned to playing after the injected failure was removed | PASS |
| Route teardown | old element detached and paused; `src` attribute absent; next book idle | PASS |

The native audio controls remain available. There is no autoplay or saved playback position. Time updates are visual and do not repeatedly write to the live region.

Chromium retained the former selected URL in `currentSrc` after teardown. That read-only diagnostic is not reported as cleared. The verified cleanup conditions are the absent `src` attribute, paused detached element, no continuing background request and an idle next route.

The only request-failure records in the normal representative runs were the expected `net::ERR_ABORTED` media cancellations associated with metadata/seek repositioning. There were no console errors or page errors.

## Responsive and alternate modes

Book 1 and Book 11 passed all eight extra viewport cases at 768x1024, 1280x720, 1024x400 and 667x375. Together with the 390x844 and 1440x900 interaction ends, this covers all six requested viewport sizes for both representative books.

| Mode | Observation | Result |
|---|---|---|
| Mobile | exact media groups mount in the stitched route without horizontal overflow | PASS |
| Tablet | no duplicate ids, nested controls, broken images or overflow | PASS |
| Short landscape | 1024x400 and 667x375 remain within the viewport | PASS |
| Reduced motion | media query active; existing no-smooth-motion behavior retained | PASS |
| Forced colors | active mode detected on Book 11; no horizontal overflow | PASS |
| Work Cells | route title/heading rendered, no overflow, idle shared lightbox had no `src` attribute | PASS |

The Work Cells smoke is intentionally scoped to the shared shell and idle-lightbox compatibility; it does not change Work Cells data or presentation.

## Print

Book 11 produced an 11-page A4 artifact. Moving from screen mode into print added zero page/generated-media requests: the page-media request counter was 1 before print because it included the cover path and remained 1 afterward. Active mounted media images stayed at zero.

| Print contract | Observation | Result |
|---|---|---|
| Media disclosure | all 28 disclosure elements hidden; no mount | PASS |
| Audio | section hidden | PASS |
| Companion text | seven non-audio text sections present | PASS |
| Answers | 9/9 answer regions present | PASS |
| First page | cover, title, overview and fact hierarchy clear; no clipping | PASS |
| Middle page 6 | all three reference-answer cards readable; breaks controlled | PASS |
| Final page 11 | parent guidance complete; no overlap or broken glyphs | PASS |

The PDF and three rendered inspection pages are local test scratch and are not committed or copied into `dist`.

## Persistent screenshots

The three persistent JPEG baselines total 238,109 bytes, approximately 238 KB decimal (232.5 KiB), below the four-file and 2 MB limits. They are documentation evidence and do not enter the site artifact.

| Screenshot | Bytes | SHA-256 | Visual review |
|---|---:|---|---|
| `screenshots/book-01-mobile-media-group.jpg` | 60,213 | `961a1bf1e248f0411180f695f3cedd46f0dd4aaedd54951630ab3d1839e3a6c6` | exact two-page group, stable cards and readable mobile story route |
| `screenshots/book-01-desktop-audio-ready.jpg` | 64,255 | `83fd2bc4a0b653c96031218f487e79ce09c6c829deb3111171d81754fabdec24` | user-loaded native/custom controls, paused at 0:30 with visible keyboard focus |
| `screenshots/book-11-desktop-group-lightbox.jpg` | 113,641 | `eb5a1e95b5e82f799ca9eb4f24ca02739fcb719a045d826cbb0aa5fe59f45763` | first item of a five-image group, modal hierarchy and adjacent controls clear |

## Must-be-zero review

| Finding | Count |
|---|---:|
| Unexpected console errors | 0 |
| Page errors | 0 |
| Failed application assets, excluding expected media cancellation | 0 |
| Initial page-media requests | 0 |
| Pre-intent audio requests | 0 |
| Idle lightbox placeholder requests | 0 |
| Broken images | 0 |
| Horizontal overflow | 0 |
| Duplicate ids | 0 |
| Nested controls | 0 |
| Focus loss in the exercised lightbox flow | 0 |
| Print-triggered page/generated-media requests | 0 |

No accessibility or visual limitation was observed within this browser-emulation boundary. Physical-device and separate screen-reader certification were not performed and are not implied.
