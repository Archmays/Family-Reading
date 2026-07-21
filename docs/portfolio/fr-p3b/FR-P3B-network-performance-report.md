# FR-P3B network and performance report

## Result

Book 1 and Book 11 meet the P3B initial-request and DOM-reduction gates in both 390x844 and 1440x900 browser runs. Closed media groups have no active image elements or opener controls, initial audio requests are zero, and the idle lightbox creates no placeholder-image request.

## Measurement boundary

Chromium ran against a static project-subpath server with correct MIME types, HTTP Range support, `Cache-Control: max-age=3600` and service workers blocked. Each representative cold run used a new browser context; the warm check returned to the same book and reopened the first group in the same context. Request URL, type, status, transfer/resource bytes, initiator, timing, cache fields and Range headers were read from compact browser network events. No raw HAR, cookie or browser profile is retained.

The startup JSON transfer value below is encoded network transfer including protocol overhead. Its count remains the architectural gate: 28. This phase does not change the startup data chain.

## P3A-to-P3B initial route comparison

| Book | P3A DOM | P3B DOM | Reduction | P3B active page-media images/openers | P3B tabbables |
|---|---:|---:|---:|---:|---:|
| Book 1 | 830 | 624 | 24.82% | 0 / 0 | 47 |
| Book 11 | 936 | 636 | 32.05% | 0 / 0 | 47 |

Both reductions exceed the 15% gate. The result is identical at the two representative viewport ends. The initial document still has two image elements: the cover and an idle hidden lightbox image without a `src` attribute. Only the cover is requested.

The P3A starting browser state had 85/115 page-media images and opener controls in the active markup for Book 1/11. Browser lazy-loading happened to suppress their cold network requests, but it did not provide a strict request boundary. P3B removes those nodes from the active tree until the owning disclosure opens.

## Cold initial network

The four representative cold runs produced the same request-count contract:

| Route set | Startup JSON | Startup JSON transfer | Page media | MP3 | Cover | Lightbox placeholder |
|---|---:|---:|---:|---:|---:|---:|
| Book 1 mobile + desktop | 28 each | 2,822,931 B each | 0 | 0 | 1 | 0 |
| Book 11 mobile + desktop | 28 each | 2,822,931 B each | 0 | 0 | 1 | 0 |

The document favicon remains a normal `Other` request. It is not used as a lightbox image and is excluded from the lightbox-placeholder count.

Compared with the P3A baseline, the initial MP3 request changes from one to zero and the lightbox placeholder-image request changes from one to zero. The cover stays at exactly one.

## Disclosure request isolation

The first scene disclosure was used for repeatable evidence.

| Book | Expected unique items | Mounted images/openers | Cold image responses | Resource bytes | Transfer bytes | Reopen transfer |
|---|---:|---:|---:|---:|---:|---:|
| Book 1 | 2 | 2 / 2 | 2 x 200 | 3,465,691 B | 3,466,547 B | 0 B |
| Book 11 | 5 | 5 / 5 | 5 x 200 | 6,236,958 B | 6,239,096 B | 0 B |

These exact 2/5 results were reproduced on mobile and desktop. All mounted images had alternative text, lazy loading and asynchronous decoding. No image from another closed group was requested. Closing made no request; reopening preserved the same 2/5 nodes and added zero network events.

## Lightbox and warm-cache behavior

Opening the first thumbnail and moving to the next thumbnail stayed inside the 2-item Book 1 group or the 5-item Book 11 group. Because those thumbnail URLs were already loaded, lightbox open/next added zero media transfer. Escape removed the active lightbox `src` attribute, cleared its caption and returned focus to an opener in the same group.

Re-entering each representative book and reopening its first group mounted 2/2 or 5/5 complete images with zero broken images. The group produced zero media network events and zero transfer bytes, demonstrating renderer memory-cache reuse in the measured Chromium context. The sole warm-return network event was a 200 disk-cached favicon with zero transfer; it is recorded separately and is not counted as media reuse. There is no service worker. These observations are scoped to the measured routes and cache policy, not a claim about every browser implementation.

## Audio request and Range evidence

Before intent, all four representative runs had zero MP3 requests. The first custom play action attached the source and produced 206 responses.

| Book | Initial user-triggered range | Response | Near-end seek range | Response | Near-end transfer |
|---|---|---:|---|---:|---:|
| Book 1 | `bytes=0-` -> `bytes 0-5208121/5208122` | 206 | `bytes=5177344-` -> `bytes 5177344-5208121/5208122` | 206 | 0 B, disk cache |
| Book 11 | `bytes=0-` -> `bytes 0-8957842/8957843` | 206 | `bytes=8945664-` -> `bytes 8945664-8957842/8957843` | 206 | 12,665 B |

The server answered the open-ended initial range with the full resource. This is valid HTTP Range behavior and confirms that the request started only after user action; P3B does not transcode or segment the files. A 30-second seek, keyboard adjustment and near-end seek all landed on finite clamped values. The near-end request demonstrates actual byte-range seeking.

Chromium reported one `net::ERR_ABORTED` media event in each representative audio run when it cancelled or repositioned the prior media request during metadata/seek handling. The corresponding 206 responses, playable state, seeks and ended state all succeeded. These are expected media cancellations, not missing assets or application failures.

## Error recovery and teardown

An intercepted MP3 failure entered the `error` phase with `重试音频`, an enabled retry control, a disabled seek and a restrained live message. Removing the interception and activating retry returned the same route to `playing`. The next book loaded in `idle` with no `src` attribute; native-control pointer intent then entered `loading` and attached only that book's source.

On route teardown the old element was disconnected and paused, and its `src` attribute was absent. No background audio request continued. Chromium retained the prior selected URL in its `currentSrc` diagnostic; this report intentionally does not claim that value is cleared.

## Performance conclusion

| Gate | Observed | Result |
|---|---|---|
| Initial page-media requests | 0 in 4/4 representative cold runs | PASS |
| Initial audio requests | 0 in 4/4 representative cold runs | PASS |
| Initial cover requests | 1 in 4/4 representative cold runs | PASS |
| Initial lightbox placeholder requests | 0 in 4/4 representative cold runs | PASS |
| Startup JSON count | 28 in 4/4 runs | PASS |
| Book 1 DOM reduction | 24.82% | PASS |
| Book 11 DOM reduction | 32.05% | PASS |
| Disclosure request isolation | exact 2/5 unique media; no other groups | PASS |
| Reopen/lightbox transfer | 0 B | PASS |
| Same-context warm group remount | 2/2 and 5/5 complete; 0 media event / 0 B | PASS |
| User-triggered Range/seek | 206 with near-end byte ranges | PASS |

This report covers the local implementation and browser evidence. Repository closeout and release-environment readback are recorded separately after the immutable release identity exists.
