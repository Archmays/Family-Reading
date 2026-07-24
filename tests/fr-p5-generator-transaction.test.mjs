import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

const rollbackHarness = String.raw`
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

generator_path = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("fr_p5_generator_transaction", generator_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def snapshot(root):
    return {
        path.relative_to(root).as_posix(): {
            "bytes": path.stat().st_size,
            "sha256": sha256(path.read_bytes()),
        }
        for path in sorted(
            (candidate for candidate in root.rglob("*") if candidate.is_file()),
            key=lambda candidate: candidate.relative_to(root).as_posix(),
        )
    }


def configure_root(root):
    module.ROOT = root
    module.MANIFEST_PATH = root / "public/media/media-manifest.json"
    module.DERIVED_ROOT = root / "public/media/derived"
    module.SCRATCH_ROOT = root / "task-scratch/fr-p5"
    module.ALLOWED_OUTPUT_PREFIXES = (
        root / "public/media",
        root / "reports/portfolio/fr-p5",
        module.SCRATCH_ROOT,
    )


def prepare_fixture(root):
    final_media = root / "public/media"
    module.DERIVED_ROOT.mkdir(parents=True)
    (module.DERIVED_ROOT / "nested").mkdir()
    (module.DERIVED_ROOT / "nested/old.bin").write_bytes(b"old-derivative")
    module.MANIFEST_PATH.write_bytes(b"old-manifest\n")

    staging = root / "staging/media"
    staged_derivative = staging / "derived/fixture/new.bin"
    staged_derivative.parent.mkdir(parents=True)
    staged_derivative.write_bytes(b"new-derivative")
    manifest = {
        "media": [
            {
                "variants": [
                    {
                        "path": "public/media/derived/fixture/new.bin",
                        "bytes": staged_derivative.stat().st_size,
                        "sha256": sha256(staged_derivative.read_bytes()),
                    }
                ]
            }
        ]
    }
    (staging / "media-manifest.json").write_bytes(module.canonical_json(manifest))
    return final_media, staging


scenarios = (sys.argv[2],)
results = []

for scenario in scenarios:
    with tempfile.TemporaryDirectory(prefix="fr-p5-generator-transaction-") as temporary:
        fixture_root = Path(temporary).resolve()
        configure_root(fixture_root)
        final_media, staging = prepare_fixture(fixture_root)
        before = snapshot(final_media)
        marker = f"injected-{scenario}-failure"
        real_replace = module.os.replace
        real_validate = module.validate_installed_media

        def injected_replace(source, destination, *args, **kwargs):
            source_path = Path(source)
            destination_path = Path(destination)
            should_fail = (
                (
                    scenario == "manifest-backup-move"
                    and source_path == module.MANIFEST_PATH
                    and destination_path.name == ".fr-p5-manifest-backup.json"
                )
                or (
                    scenario == "derived-install"
                    and source_path.name == ".fr-p5-derived-replacement"
                    and destination_path == module.DERIVED_ROOT
                )
                or (
                    scenario == "manifest-install"
                    and source_path.name == ".fr-p5-manifest-replacement.json"
                    and destination_path == module.MANIFEST_PATH
                )
            )
            if should_fail:
                raise OSError(marker)
            return real_replace(source, destination, *args, **kwargs)

        def injected_validation(_staging):
            raise ValueError(marker)

        module.os.replace = injected_replace
        if scenario == "post-install-validation":
            module.validate_installed_media = injected_validation
        error = None
        try:
            module.atomic_install(staging)
        except BaseException as caught:
            error = caught
        finally:
            module.os.replace = real_replace
            module.validate_installed_media = real_validate

        if error is None:
            raise AssertionError(f"{scenario} unexpectedly succeeded")
        if marker not in str(error):
            raise AssertionError(f"{scenario} propagated the wrong error: {error}")
        after = snapshot(final_media)
        if after != before:
            raise AssertionError(
                f"{scenario} did not restore exact pre-run files: "
                f"before={before}, after={after}"
            )
        transaction_paths = [
            final_media / ".fr-p5-derived-replacement",
            final_media / ".fr-p5-manifest-replacement.json",
            final_media / ".fr-p5-derived-backup",
            final_media / ".fr-p5-manifest-backup.json",
        ]
        leftovers = [str(candidate) for candidate in transaction_paths if candidate.exists()]
        if leftovers:
            raise AssertionError(f"{scenario} left transaction paths behind: {leftovers}")
        results.append(scenario)

sys.stdout.write(json.dumps({"passed": results}))
`;

const scenarios = [
  ['manifest backup move', 'manifest-backup-move'],
  ['derived install', 'derived-install'],
  ['manifest install', 'manifest-install'],
  ['post-install validation', 'post-install-validation'],
];

for (const [label, scenario] of scenarios) {
  test(`FR-P5 generator restores exact pre-run media after ${label} failure`, () => {
    const result = spawnSync('python', [
      '-c',
      rollbackHarness,
      path.join(root, 'scripts', 'generate-responsive-media.py'),
      scenario,
    ], {
      cwd: root,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(JSON.parse(result.stdout), { passed: [scenario] });
  });
}

const committedCleanupHarness = String.raw`
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

generator_path = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("fr_p5_generator_committed_cleanup", generator_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def configure_root(root):
    module.ROOT = root
    module.MANIFEST_PATH = root / "public/media/media-manifest.json"
    module.DERIVED_ROOT = root / "public/media/derived"
    module.SCRATCH_ROOT = root / "task-scratch/fr-p5"
    module.ALLOWED_OUTPUT_PREFIXES = (
        root / "public/media",
        root / "reports/portfolio/fr-p5",
        module.SCRATCH_ROOT,
    )


def prepare_fixture(root):
    module.DERIVED_ROOT.mkdir(parents=True)
    (module.DERIVED_ROOT / "old.bin").write_bytes(b"old-derivative")
    module.MANIFEST_PATH.write_bytes(b"old-manifest\n")
    staging = root / "staging/media"
    derivative = staging / "derived/fixture/new.bin"
    derivative.parent.mkdir(parents=True)
    derivative.write_bytes(b"new-derivative")
    manifest = {
        "media": [
            {
                "variants": [
                    {
                        "path": "public/media/derived/fixture/new.bin",
                        "bytes": derivative.stat().st_size,
                        "sha256": sha256(derivative.read_bytes()),
                    }
                ]
            }
        ]
    }
    (staging / "media-manifest.json").write_bytes(module.canonical_json(manifest))
    return staging


with tempfile.TemporaryDirectory(prefix="fr-p5-generator-committed-cleanup-") as temporary:
    fixture_root = Path(temporary).resolve()
    configure_root(fixture_root)
    staging = prepare_fixture(fixture_root)
    final_media = fixture_root / "public/media"
    backup_root = staging.parent / ".fr-p5-install-backups"
    fixed_backup = backup_root / ".fr-p5-derived-backup"
    real_remove = module.remove_file_or_tree

    def injected_remove(path):
        if Path(path) == fixed_backup:
            raise OSError("injected-committed-cleanup-failure")
        return real_remove(path)

    module.remove_file_or_tree = injected_remove
    try:
        first_warnings = module.atomic_install(staging)
        if len(first_warnings) != 1 or "injected-committed-cleanup-failure" not in first_warnings[0]:
            raise AssertionError(f"unexpected first cleanup warnings: {first_warnings}")
        if not fixed_backup.is_dir():
            raise AssertionError("failed committed backup cleanup did not preserve recovery evidence")
        if (module.DERIVED_ROOT / "fixture/new.bin").read_bytes() != b"new-derivative":
            raise AssertionError("validated derivative install was rolled back after cleanup failure")
        if module.MANIFEST_PATH.read_bytes() != (staging / "media-manifest.json").read_bytes():
            raise AssertionError("validated manifest install was rolled back after cleanup failure")
        public_transaction_paths = [
            candidate
            for candidate in final_media.iterdir()
            if candidate.name.startswith(".fr-p5-")
        ]
        if public_transaction_paths:
            raise AssertionError(
                f"committed cleanup leaked transaction paths into public/media: "
                f"{public_transaction_paths}"
            )

        second_warnings = module.atomic_install(staging)
        if second_warnings:
            raise AssertionError(f"stale committed backup blocked clean retry: {second_warnings}")
        if not fixed_backup.is_dir():
            raise AssertionError("later run overwrote committed recovery evidence")
        if (module.DERIVED_ROOT / "fixture/new.bin").read_bytes() != b"new-derivative":
            raise AssertionError("later safe run did not preserve the validated derivative tree")
        if (final_media / ".fr-p5-derived-replacement").exists():
            raise AssertionError("later safe run left a replacement path")
        if (final_media / ".fr-p5-manifest-replacement.json").exists():
            raise AssertionError("later safe run left a manifest replacement path")
        public_transaction_paths = [
            candidate
            for candidate in final_media.iterdir()
            if candidate.name.startswith(".fr-p5-")
        ]
        if public_transaction_paths:
            raise AssertionError(
                f"later run leaked transaction paths into public/media: "
                f"{public_transaction_paths}"
            )
    finally:
        module.remove_file_or_tree = real_remove

    sys.stdout.write(json.dumps({
        "firstWarnings": len(first_warnings),
        "secondWarnings": len(second_warnings),
        "scratchBackupPreserved": fixed_backup.exists(),
        "publicTransactionPaths": len(public_transaction_paths),
    }))
`;

test('FR-P5 generator treats validated installs as committed when backup cleanup fails', () => {
  const result = spawnSync('python', [
    '-c',
    committedCleanupHarness,
    path.join(root, 'scripts', 'generate-responsive-media.py'),
  ], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    firstWarnings: 1,
    secondWarnings: 0,
    scratchBackupPreserved: true,
    publicTransactionPaths: 0,
  });
});
