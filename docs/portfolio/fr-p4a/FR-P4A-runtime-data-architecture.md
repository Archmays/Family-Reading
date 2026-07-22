# FR-P4A runtime data architecture

## Outcome

FR-P4A separates tracked authoring truth from a deterministic, public runtime projection. The browser now opens only the JSON required by the active route, while the build publishes the runtime projection and keeps the Work Cells draft manifest and page map out of `dist`.

This phase does not redesign the Work Cells topic experience, convert media, add a service worker, or begin FR-P4B/P5.

## Truth and publication layers

| Layer | Purpose | Published |
|---|---|---|
| `public/books/index.json` and Carmela series/detail JSON | existing authoring and current Carmela detail truth | selected existing Carmela detail files remain published for the current renderer |
| `public/books/工作细胞/draft-manifest.json` | 27-topic Work Cells authoring truth | no |
| `data/cells-at-work/page-map.json` and manual ranges | authoring lineage and page resolution | no |
| `public/runtime/**` | deterministic route-facing projection | yes |
| existing public media roots | unchanged media bytes used by current UI | yes, under the existing allowlist |

The generator consumes 29 repository-relative JSON inputs and records their SHA-256, byte size, all generated output hashes, parity counts and total bytes in `public/runtime/runtime-manifest.json`. It records no timestamp, machine identity, absolute path or raw authoring content.

## Runtime tree

```text
public/runtime/
  index.json
  runtime-manifest.json
  carmela/
    books.json
  work-cells/
    topics.json
    topics/
      <27 topic slugs>.json
```

The tracked tree contains 31 files and 393,121 bytes. The home index is 1,187 bytes, the 12-book Carmela index is 5,706 bytes, the Work Cells topic index is 14,727 bytes, and all 27 topic details total 359,247 bytes. The largest detail is `induced-pluripotent-stem-cells.json` at 19,882 bytes, below the 150 KiB hard gate.

## Projection contracts

The home index contains only the site identity and two series entrances. Carmela summaries retain order, title, slug, cover, audio availability, and selected detail paths; the 12 full companion documents and media arrays are not duplicated into the summary index.

The Work Cells summary index retains the 27 topics in authoring order, the 24 deterministic categories, public thumbnail/source labels, publication status, content version, and one detail path per topic. Each detail retains family-visible identity, source/publication state, topic overview, four science stations, six parent question cards, parent/sensitive guidance, safe source notes, and only the pages referenced by those stations/cards.

The reduced page-reference projection contains 286 per-topic entries (285 globally unique page ids). Every one resolves against both the authoring annotations and page map before generation, and every projected image exists. `cancer-cell` and `cancer-cell-ii` remain separate topic identities; the existing hemorrhagic-shock rule is preserved. Work Cells remains `hasAudio: false`, `manifestStatus: draft`, and keeps its existing verification states.

Authoring-only prompts, review notes, source/archive paths, repeated full page arrays, transcript/subtitle fields and merge policies are denied. Runtime denylist exposure is zero.

## Deterministic generator

`scripts/generate-runtime-content.mjs` supports:

- `--write`: build and validate a sibling staging tree, swap it into `public/runtime`, validate the installed bytes, and restore the prior tree if installation validation fails;
- `--check`: regenerate in memory and fail on missing, extra or stale tracked output without modifying the workspace;
- `--output <safe-temp-dir>`: write only to a validated directory outside the repository for focused tests.

Paths containing traversal, repository-internal temporary output, filesystem roots and unauthorized production writes fail closed. JSON is UTF-8, two-space formatted, final-newline terminated, stable in key/order, and free of timestamps. Generated and source path lists use a locale-independent ordinal comparator; host-default locale ordering is not used for manifest serialization. Consumed JSON is parsed and source-hashed in canonical UTF-8/LF form, while `.gitattributes` fixes only `public/runtime/**` to LF so fresh Windows and Linux checkouts retain byte-identical tracked output.

## Build boundary

`scripts/build.mjs` runs the public-repository validator and runtime staleness check before rebuilding `dist`. It publishes `public/runtime/**`, the current app, current Carmela details/media/audio, and current Work Cells media. It no longer publishes:

- `public/books/工作细胞/draft-manifest.json`;
- `data/cells-at-work/page-map.json`;
- the legacy top-level runtime authoring indexes.

The dist audit verifies the runtime manifest file list, bytes and SHA-256 values; rejects undeclared runtime JSON and authoring-only fields; and rejects either excluded authoring file if it reappears.

## Route loader

`assets/content-loader.js` is the single runtime data loader. It caches resolved JSON by repository-relative public path, coalesces concurrent readers, gives each subscriber independent abort behavior, aborts an underlying fetch only when no subscriber remains, and evicts failed/aborted work. It does not use storage, prefetch, a service worker or runtime packages.

`assets/app.js` maps loader contexts into the existing P2/P3 render shapes. Each navigation receives a generation id and abort signal; only the newest non-aborted response may replace the page. Section-only navigation reuses the current detail, back/forward uses the in-memory caches, and a failed selected detail leaves unrelated routes available. Family-facing errors expose no JSON or local path, while the console retains a public route-level diagnostic.

## GitHub Actions warning remediation

P3B Pages run `29803791008` reported that checkout v4, setup-node v4, configure-pages v5, nested upload-artifact v4, and deploy-pages v4 still targeted the deprecated Node 20 action runtime. The workflow changes only those five direct refs: checkout/setup-node to their stable Node-24 v5 lines, configure-pages to v6, upload-pages-artifact to v5 (which pins Node-24 upload-artifact v7), and deploy-pages to v5. The application build remains `node-version: 22`.

The choice is grounded in the official [GitHub Node 20 deprecation notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/), [checkout v5 release](https://github.com/actions/checkout/releases/tag/v5.0.0), [setup-node v5 release](https://github.com/actions/setup-node/releases/tag/v5.0.0), [configure-pages v6 release](https://github.com/actions/configure-pages/releases/tag/v6.0.0), [upload-pages-artifact v5 release](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages v5 release](https://github.com/actions/deploy-pages/releases/tag/v5.0.0). Checkout/setup-node v5 are supported stable Node-24 lines, deliberately selected as the minimum warning-remediation majors; their newer majors were not required for this phase. A successful exact-SHA Pages rerun will prove the warning is absent after merge.

## Rollback

FR-P4A can be rolled back as one phase-scoped unit: generated `public/runtime`, generator/build/audit changes, loader/app wiring, workflow warning remediation, tests and P4A evidence. No authoring/source/media migration or history rewrite is required.
