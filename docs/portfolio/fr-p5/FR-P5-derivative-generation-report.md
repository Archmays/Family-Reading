# FR-P5 derivative generation report

## Acceptance scope

This report separates the independent determinism proof from the production cutover. Two independent full generations, A and B, completed from the same accepted inventory and policy, and both outputs passed staging validation. The formal production `--write`, full regeneration `--check`, installed-tree media validation, and 42-shard validation subsequently completed successfully.

The accepted generation inputs and outputs are:

| Evidence | Run A | Run B |
|---|---:|---:|
| Logical sources | 778 | 778 |
| Derivative variants | 2,735 | 2,735 |
| Derivative bytes | 612,770,984 | 612,770,984 |
| Manifest bytes | 3,767,069 | 3,767,069 |
| Complete tree files | 2,736 | 2,736 |
| Complete tree bytes | 616,538,053 | 616,538,053 |
| Manifest SHA-256 | `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` | `b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8` |

An independent comparison covered every file, not a sample:

```text
A_FILES: 2736
B_FILES: 2736
RELATIVE_PATH_DIFFERENCES: 0
SIZE_OR_SHA256_MISMATCHES: 0
MANIFEST_BYTE_MISMATCHES: 0
DERIVATIVE_SHA256_MISMATCHES: 0
```

The two isolated outputs therefore establish byte determinism for the accepted toolchain. Production installation independently reproduced the same 2,736-file, 616,538,053-byte tree and the same canonical manifest bytes.

## Frozen toolchain and policy identity

Generation used:

```text
PYTHON_VERSION: 3.12.7
PILLOW_VERSION: 10.4.0
LIBWEBP_VERSION: 1.3.2
GENERATOR_VERSION: fr-p5-media-3
CANONICAL_POLICY_SHA256: 9289331de034dddc25a6dc13428712ab826b201c962a10fb6493843606570f08
```

Python generation and Node validation canonicalize the same accepted policy and require the same full 64-hex SHA-256. Encoder name and version, libwebp version, profile widths, formats, quality settings, role coverage, fallback rules and budgets are all part of that canonical policy. A toolchain or policy change therefore creates a new canonical identity instead of silently reusing old output URLs.

## Policy-addressed lineage

Every derivative path follows this repository-relative shape:

```text
public/media/derived/{policyHash[0:32]}/{sourceHash[0:2]}/{sourceHash[2:14]}/{safeSourceStem}-{profileId}.{extension}
```

The 32-hex policy segment is only the bounded path token used in the public URL namespace. It avoids unsafe path growth while retaining 128 bits of namespace identity. It does not replace or weaken the canonical comparison: the manifest keeps the full 64-hex `policyHash`, each source entry keeps its full source SHA-256, and each variant keeps its full output SHA-256. Validators require the path token to equal the first 32 characters of the current full policy hash.

Lineage is consequently bound to:

- the full canonical encoder and quality policy;
- the full derivation-source hash recorded by the manifest;
- the semantic profile id and output format in the filename;
- the exact derivative bytes and full derivative SHA-256 in the variant record.

A source-byte, policy, encoder, profile or format change produces a different accepted identity. The release allowlist selects only paths in the current manifest, so superseded identities do not become production fallbacks.

## Dimension and fallback constraints

The generator computes each output width as the smaller of the requested profile width and decoded source width. It never upscales. Height is derived from the normalized source aspect ratio, and no crop is introduced. Work Cells thumbnail records retain their logical runtime key while explicitly pointing to the verified same-name high-resolution counterpart used for encoding; Carmela and station images use self-lineage. Neither lineage mode mutates its input.

Every semantic role must resolve to a declared non-AVIF derivative fallback. A source-original path is not an accepted fallback. Staging validation fails on uncovered roles, missing or stale bytes, duplicate output paths, invalid dimensions or formats, decode failure, policy-hash disagreement, nondeterministic manifest keys, orphan derivatives, or totals that do not reconcile.

## Atomic install and failure semantics

Formal `--write` generation first creates and validates the complete derivative tree and manifest in an isolated staging directory. Installation then:

1. copies the validated tree and manifest to dedicated replacement paths on the same volume;
2. moves any current production tree and manifest to unique recovery paths under the transaction scratch directory;
3. atomically installs both replacements;
4. validates the installed tree against the staged bytes;
5. treats successful installed-tree validation as the commit boundary.

Before that commit boundary, any failed backup move, derivative install, manifest install or installed-tree validation restores the exact pre-run production files. Cleanup is restricted to replacement paths proven to belong to that transaction. An incomplete rollback raises a hard recovery error instead of hiding the condition.

After the commit boundary, backup deletion is hygiene rather than correctness. A cleanup failure emits a warning, preserves recovery evidence only in scratch, leaves the validated production install in place, and does not leak transaction paths into `public/media`. Unique backup names permit a later safe run without overwriting the retained evidence.

The focused fault suite passed all five cases:

```text
MANIFEST_BACKUP_MOVE_ROLLBACK: PASS
DERIVATIVE_INSTALL_ROLLBACK: PASS
MANIFEST_INSTALL_ROLLBACK: PASS
POST_INSTALL_VALIDATION_ROLLBACK: PASS
POST_COMMIT_SCRATCH_CLEANUP_WARNING: PASS
GENERATOR_TRANSACTION_TESTS: 5/5 PASS
```

## Source, protected-root and rights boundary

Generation reads source and existing product media but writes derivatives only to the new `public/media/derived/**` tree and the public manifest. Temporary outputs and transaction backups remain under the FR-P5 scratch boundary. The generator does not delete, move, rename, overwrite, compress or re-encode `source/**`, `source-private/**`, original PDF/MP3/EPUB/video/subtitle assets, Carmela `pages/generated`, Work Cells thumbnails/station originals, or other protected roots.

The protected-root aggregate retained the established phase signature, and the scoped tracked diff over source, private data, Carmela book media and Work Cells original media was empty:

```text
PROTECTED_ROOT_FILES: 1278
PROTECTED_ROOT_BYTES: 7882956334
PROTECTED_ROOT_SHA256: ec186a6688129e95d34471930cd7bb6cb9d484aa745c6d5ba505b8abb4577cae
TRACKED_PROTECTED_DIFFS: 0
```

User-provided resources remain authorized for the intended project use. Generation does not introduce a new copyright, licensing or provenance gate.

## Production installation and currentness

The formal production write staged and decoded the complete output before crossing the atomic commit boundary. The installed tree was then measured directly:

```text
PRODUCTION_MEDIA_FILES: 2736
PRODUCTION_MEDIA_BYTES: 616538053
PRODUCTION_DERIVATIVE_FILES: 2735
PRODUCTION_DERIVATIVE_BYTES: 612770984
PRODUCTION_MANIFEST_BYTES: 3767069
PRODUCTION_MANIFEST_SHA256: b292f10e698f30e51ae0f4e27935a8d0c551f286b3b3d5f0a4b1d74ec5c763d8
PUBLIC_TRANSACTION_LEFTOVERS: 0
```

`npm run generate:media -- --check` performed another complete 778-source/2,735-variant generation in isolated scratch, decoded its staging tree, and compared every production derivative plus canonical manifest bytes. It finished with `Responsive media derivatives and manifest are current.` This was a real full regeneration, not a manifest-only shortcut.

The independent Node validator then reconciled Python's tuple ordering, canonical policy identity, source and lineage bytes, roles, all output hashes and image decodes. Its installed-tree result was:

```text
INVENTORY_SOURCES: 778
MANIFEST_SOURCES: 778
VARIANTS: 2735
MISSING_DERIVATIVES: 0
STALE_DERIVATIVES: 0
ORPHAN_DERIVATIVES: 0
CORRUPT_DERIVATIVES: 0
OWNER_SHARDS: 42/42
```

The Node stable-order check compares tuple fields independently. A focused production fixture now covers the prefix case in which one variant serves `work-cells-series-thumbnail` and the next serves that role plus `work-cells-topic-hero`; this matches Python tuple semantics without weakening ordering validation.

## Generation acceptance status

```text
RIGHTS_STATUS: PASS_BY_USER_AUTHORIZATION
SOURCE_PROTECTED_ROOTS_UNCHANGED: VERIFIED
MEDIA_SOURCE_PARITY: PASS
MEDIA_ROLE_COVERAGE: PASS
DERIVATIVE_DECODE_STATUS: PASS
MISSING_DERIVATIVES: 0
STALE_DERIVATIVES: 0
ORPHAN_DERIVATIVES: 0
DUPLICATE_OUTPUT_PATHS: 0
POLICY_HASH_STATUS: PASS
MEDIA_DETERMINISM_STATUS: PASS
PRODUCTION_WRITE_STATUS: PASS
PRODUCTION_CHECK_STATUS: PASS
INSTALLED_TREE_VALIDATE_MEDIA_STATUS: PASS
MEDIA_SHARD_STATUS: PASS_42_OF_42
```
