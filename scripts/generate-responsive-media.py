#!/usr/bin/env python3
"""Generate deterministic responsive image derivatives for FR-P5.

The script never mutates protected source roots or current product originals. It reads
an accepted media reference inventory and a locally frozen quality policy, then writes
only under public/media or an explicitly allowed FR-P5 scratch/output directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from typing import Any, Iterable

try:
    from PIL import Image, ImageOps, __version__ as PILLOW_VERSION
except ImportError as exc:  # pragma: no cover - local environment gate
    raise SystemExit("Pillow is required for FR-P5 media generation.") from exc

ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json"
POLICY_PATH = ROOT / "reports/portfolio/fr-p5/fr-p5-media-quality-policy.json"
MANIFEST_PATH = ROOT / "public/media/media-manifest.json"
DERIVED_ROOT = ROOT / "public/media/derived"
SCRATCH_ROOT = ROOT / "task-scratch/fr-p5"
GENERATOR_VERSION = "fr-p5-media-1"
ALLOWED_OUTPUT_PREFIXES = (
    ROOT / "public/media",
    ROOT / "reports/portfolio/fr-p5",
    SCRATCH_ROOT,
)


def ordinal_key(value: Any) -> str:
    return str(value)


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n").encode("utf-8")


def canonical_hash(value: Any) -> str:
    compact = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(compact).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repository_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(ROOT.resolve()).as_posix()
    except ValueError as exc:
        raise ValueError(f"Path is outside the repository: {path}") from exc


def resolve_repository_path(value: str) -> Path:
    raw = str(value).strip().replace("\\", "/")
    if not raw or raw.startswith("/") or ":/" in raw:
        raise ValueError(f"Unsafe repository path: {value!r}")
    parts = raw.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError(f"Unsafe repository path segments: {value!r}")
    target = (ROOT / Path(*parts)).resolve()
    repository_path(target)
    return target


def assert_allowed_output(path: Path) -> Path:
    resolved = path.resolve()
    for prefix in ALLOWED_OUTPUT_PREFIXES:
        prefix_resolved = prefix.resolve()
        if resolved == prefix_resolved or prefix_resolved in resolved.parents:
            return resolved
    raise ValueError(f"FR-P5 output path is outside the allowlist: {path}")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_hash(value: Any, label: str) -> str:
    text = str(value or "").lower()
    if len(text) != 64 or any(character not in "0123456789abcdef" for character in text):
        raise ValueError(f"{label} must be a SHA-256 digest.")
    return text


def normalized_format(value: str) -> str:
    format_name = str(value or "").lower().lstrip(".")
    if format_name == "jpg":
        return "jpeg"
    if format_name not in {"avif", "jpeg", "png", "webp"}:
        raise ValueError(f"Unsupported output format: {value}")
    return format_name


def safe_stem(source_path: str) -> str:
    stem = Path(source_path).stem.lower()
    output = []
    previous_dash = False
    for character in stem:
        if character.isascii() and (character.isalnum() or character in "_-"):
            output.append(character)
            previous_dash = False
        elif not previous_dash:
            output.append("-")
            previous_dash = True
    return "".join(output).strip("-") or "media"


def derivative_repository_path(source_path: str, source_hash: str, profile_id: str, extension: str) -> str:
    profile = str(profile_id).strip().lower()
    if not profile or not all(character.isalnum() or character in "_-" for character in profile):
        raise ValueError(f"Invalid profile id: {profile_id}")
    ext = normalized_format(extension)
    suffix = "jpg" if ext == "jpeg" else ext
    return (
        f"public/media/derived/{source_hash[:2]}/{source_hash[2:14]}/"
        f"{safe_stem(source_path)}-{profile}.{suffix}"
    )


def image_has_alpha(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info)


def normalized_image(source_path: Path) -> tuple[Image.Image, str, bool]:
    with Image.open(source_path) as source:
        source_format = str(source.format or source_path.suffix.lstrip(".")).lower()
        image = ImageOps.exif_transpose(source)
        image.load()
        has_alpha = image_has_alpha(image)
        return image.copy(), source_format, has_alpha


def resize_image(image: Image.Image, width: int) -> Image.Image:
    if width <= 0:
        raise ValueError("Derivative width must be positive.")
    target_width = min(width, image.width)
    if target_width == image.width:
        return image.copy()
    target_height = max(1, round(image.height * target_width / image.width))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def prepare_mode(image: Image.Image, output_format: str, preserve_alpha: bool) -> Image.Image:
    has_alpha = image_has_alpha(image)
    if output_format == "jpeg":
        if has_alpha:
            background = Image.new("RGB", image.size, "white")
            alpha_image = image.convert("RGBA")
            background.paste(alpha_image, mask=alpha_image.getchannel("A"))
            return background
        return image.convert("RGB")
    if preserve_alpha and has_alpha:
        return image.convert("RGBA")
    if image.mode not in {"RGB", "RGBA"}:
        return image.convert("RGB")
    return image


def save_variant(image: Image.Image, target: Path, profile: dict[str, Any]) -> None:
    output_format = normalized_format(profile["format"])
    preserve_alpha = bool(profile.get("preserveAlpha", True))
    prepared = prepare_mode(image, output_format, preserve_alpha)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.tmp")
    options: dict[str, Any] = {}
    if output_format == "webp":
        options = {
            "format": "WEBP",
            "lossless": bool(profile.get("lossless", False)),
            "quality": int(profile.get("quality", 86)),
            "method": int(profile.get("method", 6)),
            "exact": True,
        }
    elif output_format == "jpeg":
        options = {
            "format": "JPEG",
            "quality": int(profile.get("quality", 88)),
            "optimize": False,
            "progressive": bool(profile.get("progressive", True)),
            "subsampling": int(profile.get("subsampling", 0)),
        }
    elif output_format == "png":
        options = {
            "format": "PNG",
            "compress_level": int(profile.get("compressLevel", 9)),
            "optimize": False,
        }
    elif output_format == "avif":
        options = {
            "format": "AVIF",
            "quality": int(profile.get("quality", 70)),
            "speed": int(profile.get("speed", 6)),
        }
    prepared.save(temporary, **options)
    os.replace(temporary, target)


def validate_policy(policy: dict[str, Any]) -> None:
    if policy.get("schemaVersion") != 1:
        raise ValueError("Unsupported media quality policy schemaVersion.")
    encoder = policy.get("encoder") or {}
    if encoder.get("name") != "Pillow":
        raise ValueError("The accepted FR-P5 policy must name Pillow as the active encoder for this generator.")
    if str(encoder.get("version")) != PILLOW_VERSION:
        raise ValueError(
            f"Pillow version mismatch: policy={encoder.get('version')} runtime={PILLOW_VERSION}."
        )
    profiles = policy.get("profiles")
    if not isinstance(profiles, list) or not profiles:
        raise ValueError("Media quality policy profiles must be non-empty.")
    ids: set[str] = set()
    for profile in profiles:
        profile_id = str(profile.get("id") or "")
        if not profile_id or profile_id in ids:
            raise ValueError(f"Invalid or duplicate media profile id: {profile_id}")
        ids.add(profile_id)
        if not isinstance(profile.get("roles"), list) or not profile["roles"]:
            raise ValueError(f"Profile {profile_id} must declare roles.")
        if int(profile.get("width", 0)) <= 0:
            raise ValueError(f"Profile {profile_id} must declare a positive width.")
        normalized_format(profile.get("format"))


def selected_profiles(policy: dict[str, Any], roles: Iterable[str], role_filter: str | None) -> list[dict[str, Any]]:
    role_set = set(roles)
    selected = []
    for profile in policy["profiles"]:
        profile_roles = set(profile.get("roles") or [])
        matching_roles = sorted(role_set & profile_roles)
        if role_filter and role_filter not in matching_roles:
            continue
        if not matching_roles:
            continue
        selected.append({**profile, "matchingRoles": matching_roles})
    return sorted(selected, key=lambda item: str(item["id"]))


def create_entry(
    record: dict[str, Any],
    policy: dict[str, Any],
    output_root: Path,
    sample_filter: str | None,
    role_filter: str | None,
    write_files: bool,
) -> dict[str, Any] | None:
    source_path = str(record["path"])
    media_id = str(record.get("mediaId") or source_path)
    if sample_filter and sample_filter not in {media_id, source_path}:
        return None
    profiles = selected_profiles(policy, record.get("roles") or [], role_filter)
    if not profiles:
        return None
    source_file = resolve_repository_path(source_path)
    source_bytes = source_file.read_bytes()
    source_hash = sha256_bytes(source_bytes)
    image, source_format, has_alpha = normalized_image(source_file)
    variants = []
    for profile in profiles:
        target_width = min(int(profile["width"]), image.width)
        resized = resize_image(image, target_width)
        output_format = normalized_format(profile["format"])
        derivative_path = derivative_repository_path(source_path, source_hash, profile["id"], output_format)
        relative_inside_media = Path(derivative_path).relative_to("public/media")
        target = output_root / relative_inside_media
        if write_files:
            save_variant(resized, target, profile)
            variant_bytes = target.stat().st_size
            variant_hash = sha256_file(target)
        else:
            variant_bytes = 0
            variant_hash = "0" * 64
        variants.append({
            "profileId": profile["id"],
            "path": derivative_path,
            "width": resized.width,
            "height": resized.height,
            "format": output_format,
            "bytes": variant_bytes,
            "sha256": variant_hash,
            "roles": profile["matchingRoles"],
            "sourceHash": source_hash,
            "lossless": bool(profile.get("lossless", False)),
            **({"quality": int(profile["quality"])} if "quality" in profile else {}),
        })
    variants.sort(key=lambda item: (",".join(item["roles"]), item["width"], item["format"], item["profileId"], item["path"]))
    fallback_profile = str(policy.get("fallbackProfileId") or "")
    fallback = next((item["path"] for item in variants if item["profileId"] == fallback_profile), source_path)
    return {
        "sourcePath": source_path,
        "sourceHash": source_hash,
        "sourceWidth": image.width,
        "sourceHeight": image.height,
        "sourceBytes": len(source_bytes),
        "sourceFormat": source_format,
        "sourceMode": image.mode,
        "hasAlpha": has_alpha,
        "roles": sorted(record.get("roles") or []),
        "fallbackPath": fallback,
        "variants": variants,
    }


def build_manifest(
    inventory: dict[str, Any],
    policy: dict[str, Any],
    output_root: Path,
    sample_filter: str | None,
    role_filter: str | None,
    write_files: bool,
) -> dict[str, Any]:
    entries = []
    for record in sorted(inventory.get("media") or [], key=lambda item: str(item["path"])):
        entry = create_entry(record, policy, output_root, sample_filter, role_filter, write_files)
        if entry:
            entries.append(entry)
    manifest = {
        "schemaVersion": 1,
        "generatorVersion": GENERATOR_VERSION,
        "policyHash": canonical_hash(policy),
        "media": entries,
    }
    manifest["totals"] = {
        "sources": len(entries),
        "sourceBytes": sum(entry["sourceBytes"] for entry in entries),
        "variants": sum(len(entry["variants"]) for entry in entries),
        "derivativeBytes": sum(
            variant["bytes"] for entry in entries for variant in entry["variants"]
        ),
    }
    return manifest


def compare_tree(expected_root: Path, actual_root: Path, manifest: dict[str, Any]) -> list[str]:
    findings: list[str] = []
    expected_paths = {
        Path(variant["path"]).relative_to("public/media").as_posix(): variant
        for entry in manifest["media"]
        for variant in entry["variants"]
    }
    actual_derived = actual_root / "derived"
    actual_paths = {
        path.relative_to(actual_root).as_posix()
        for path in actual_derived.rglob("*")
        if path.is_file()
    } if actual_derived.exists() else set()
    for relative_path, variant in expected_paths.items():
        candidate = actual_root / relative_path
        if not candidate.is_file():
            findings.append(f"missing:{relative_path}")
            continue
        if candidate.stat().st_size != variant["bytes"] or sha256_file(candidate) != variant["sha256"]:
            findings.append(f"stale:{relative_path}")
    for relative_path in sorted(actual_paths - set(expected_paths)):
        findings.append(f"extra:{relative_path}")
    expected_manifest = canonical_json(manifest)
    actual_manifest = actual_root / "media-manifest.json"
    if not actual_manifest.is_file():
        findings.append("missing:media-manifest.json")
    elif actual_manifest.read_bytes().replace(b"\r\n", b"\n") != expected_manifest:
        findings.append("stale:media-manifest.json")
    return findings


def atomic_install(staging_media_root: Path) -> None:
    final_media_root = assert_allowed_output(ROOT / "public/media")
    final_media_root.mkdir(parents=True, exist_ok=True)
    staged_derived = staging_media_root / "derived"
    staged_manifest = staging_media_root / "media-manifest.json"
    replacement_derived = final_media_root / ".derived-replacement"
    if replacement_derived.exists():
        shutil.rmtree(replacement_derived)
    shutil.copytree(staged_derived, replacement_derived)
    if DERIVED_ROOT.exists():
        shutil.rmtree(DERIVED_ROOT)
    os.replace(replacement_derived, DERIVED_ROOT)
    temporary_manifest = final_media_root / ".media-manifest.json.tmp"
    shutil.copyfile(staged_manifest, temporary_manifest)
    os.replace(temporary_manifest, MANIFEST_PATH)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--write", action="store_true")
    modes.add_argument("--check", action="store_true")
    modes.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output")
    parser.add_argument("--sample")
    parser.add_argument("--role")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not INVENTORY_PATH.is_file():
        raise SystemExit("Run `npm run inventory:media -- --write` before media generation.")
    if not POLICY_PATH.is_file():
        raise SystemExit("The accepted FR-P5 media quality policy is missing.")
    inventory = load_json(INVENTORY_PATH)
    policy = load_json(POLICY_PATH)
    validate_policy(policy)

    if args.dry_run:
        manifest = build_manifest(inventory, policy, ROOT / "public/media", args.sample, args.role, False)
        print(json.dumps({
            "pillowVersion": PILLOW_VERSION,
            "sources": manifest["totals"]["sources"],
            "variants": manifest["totals"]["variants"],
            "sample": args.sample,
            "role": args.role,
        }, ensure_ascii=False, indent=2))
        return 0

    if args.output:
        output_root = assert_allowed_output((ROOT / args.output).resolve())
        output_root.mkdir(parents=True, exist_ok=True)
        manifest = build_manifest(inventory, policy, output_root, args.sample, args.role, True)
        (output_root / "media-manifest.json").write_bytes(canonical_json(manifest))
        print(repository_path(output_root / "media-manifest.json"))
        return 0

    with tempfile.TemporaryDirectory(prefix="generate-", dir=SCRATCH_ROOT.parent if SCRATCH_ROOT.parent.exists() else ROOT) as temp:
        staging = Path(temp) / "media"
        staging.mkdir(parents=True, exist_ok=True)
        manifest = build_manifest(inventory, policy, staging, args.sample, args.role, True)
        (staging / "media-manifest.json").write_bytes(canonical_json(manifest))

        if args.check:
            findings = compare_tree(staging, ROOT / "public/media", manifest)
            if findings:
                for finding in findings:
                    print(finding, file=sys.stderr)
                return 1
            print("Responsive media derivatives and manifest are current.")
            return 0

        if args.write or not any((args.check, args.dry_run, args.output)):
            atomic_install(staging)
            print(
                f"Generated {manifest['totals']['variants']} variants for "
                f"{manifest['totals']['sources']} sources."
            )
            return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
