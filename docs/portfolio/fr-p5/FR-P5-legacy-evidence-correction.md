# FR-P5 legacy Work Cells evidence correction

## Scope

FR-P4B-R1 identified a pre-existing evidence defect in two FR-P4B inventory files: the files declared 27 Work Cells topics but contained 26 topic rows and omitted order 16 `hemorrhagic-shock`.

This defect did not affect runtime content, browser routes, media groups, Pages output or the FR-P4B/FR-P4B-R1 release. The canonical P4A runtime index remained 27/27, the `hemorrhagic-shock` detail file existed, and all 54 Work Cells endpoint browser cases passed.

## Historical files

The affected historical files are retained unchanged as records of what FR-P4B produced:

- `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-before.json`
- `reports/portfolio/fr-p4b/fr-p4b-topic-content-inventory-after.json`

They must not be silently rewritten or used as FR-P5 media truth.

## Canonical correction

FR-P5 generates:

- `reports/portfolio/fr-p5/fr-p5-corrected-work-cells-inventory.json`

The corrected file is derived from:

- `public/runtime/work-cells/topics.json`
- all 27 paths declared by that runtime index

The correction must contain and validate:

```text
TOPICS: 27
CATEGORIES: 24
STATIONS: 108
QUESTIONS: 162
PAGE_REFS: 286
HEMORRHAGIC_SHOCK: PRESENT
```

`npm run inventory:media -- --write` writes the correction together with the FR-P5 media-reference inventory. `--check` regenerates both in memory and fails on missing or stale tracked output.

## Truth precedence

For FR-P5 and later phases:

1. current runtime index and detail payloads;
2. FR-P5 corrected inventory;
3. current media manifest and its hashes;
4. historical FR-P4B inventories, only as historical evidence.

No runtime topic, media file or source asset is changed by this correction.

```text
LEGACY_FR_P4B_INVENTORY_STATUS: DOCUMENTED_PRE_EXISTING_EVIDENCE_DEFECT_26_OF_27
LEGACY_FR_P4B_INVENTORY_RUNTIME_IMPACT: NONE
FR_P5_CORRECTED_INVENTORY_REQUIRED: YES
```
