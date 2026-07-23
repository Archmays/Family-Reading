# FR-P4B content and media parity report

## Outcome

The Work Cells Science Topic Atlas is directly integrated into `assets/app.js`. The local integration does not modify the P4A runtime generator or any generated runtime JSON. The before and after projections are identical, and the former generic science renderer has been removed.

`RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION`

## Evidence basis

| Snapshot | Git basis | Runtime manifest SHA-256 | Topic index SHA-256 |
| --- | --- | --- | --- |
| Before | `24fd0787bce84d45e5f71591e6da7201176c4c21` | `4fda8a75bc8118ff0fec2d7ac04f73d832f082522cab78a4d248de5bf5e06c50` | `2b30e2d7ee8099ac6b7adcfbbf0485d790a4b5042c741fe25c89d94e9b3ffa4e` |
| After direct integration | `191b2586e609fbe0aeab15c1bb02b1a9f7f721d7` | same | same |

The inventories hash the runtime files and a stable child-facing projection of identity, overview, stations, questions, guidance, source notes and page references. All 27 projected-content digests are unchanged.

## Content parity

| Contract | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| Topics | 27 | 27 | PASS |
| Categories | 24 | 24 | PASS |
| Stations | 108 | 108 | PASS |
| Questions | 162 | 162 | PASS |
| Page-reference occurrences | 286 | 286 | PASS |
| Globally unique page IDs | 285 | 285 | PASS |
| Work Cells audio | absent | absent | PASS |

The only repeated page ID is `cancer-cell-ii__v05_page-143`, with two legitimate occurrences. `cancer-cell` and `cancer-cell-ii` remain separate topics. `hemorrhagic-shock` retains its existing identity. No publication, authoring, prompt, internal-rights or private/source field is projected into the child-facing view model.

## Media parity and registry

| Metric | Actual |
| --- | ---: |
| Runtime image occurrences | 421 |
| Unique runtime image paths | 400 |
| Existing runtime image paths | 400 |
| Hero occurrences | 27 |
| Station-illustration occurrences | 108 |
| Page-reference occurrences | 286 |
| Topic-local registry entries | 394 |
| Globally unique registry paths | 393 |
| Hero/registry overlaps | 20 |
| Combined unique hero/registry paths | 400 |
| Media groups | 378 |
| Groups per topic | 14 |
| Media use sites / group-member references | 642 |

Every media ID resolves, each group is internally de-duplicated, and all referenced files exist. Closed groups use inert templates. Browser acceptance measured one initial hero and zero initial station, manga, lightbox or audio requests. The station-illustration, station-manga and question-manga cases mounted exactly `1 / 2 / 2` items; each reopened with zero additional transfer.

## Runtime and protected roots

- Runtime staleness check: `31 files / 393,121 bytes`, PASS.
- Work Cells detail JSON total: `359,247 bytes`.
- Largest and highest-media topic: `induced-pluripotent-stem-cells`, `19,882 bytes`, 40 image occurrences.
- Tracked changes under `public/runtime/`, runtime generators, `data/` and `source/`: zero.
- Protected-root aggregate: 1,278 files, 7,882,956,334 bytes, signature `ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae`.

## Machine-readable evidence

- `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-before.json`
- `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-after.json`
- `reports/portfolio/fr-p4b/fr-p4b-media-reference-baseline.json`
