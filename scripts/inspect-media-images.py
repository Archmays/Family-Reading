#!/usr/bin/env python3
"""Read-only, deterministic Pillow metadata inspection for FR-P5 images.

Input is a JSON object on stdin with one ``paths`` array of repository-relative
paths that have already passed the JavaScript media path policy. This script
revalidates every path, decodes every image, and emits a single deterministic
JSON object. Any missing, corrupt, non-image, animated-metadata, orientation, or
path-safety error makes the whole batch fail closed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

try:
    from PIL import Image, ImageOps, __version__ as PILLOW_VERSION
except ImportError as exc:  # pragma: no cover - environment gate
    raise SystemExit("Pillow is required for FR-P5 media inspection.") from exc


ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
DECODED_FORMATS = {"avif", "gif", "jpeg", "png", "webp"}
WINDOWS_RESERVED_NAME = re.compile(
    r"^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)",
    re.IGNORECASE,
)
UNSAFE_PATH_CHARACTER = re.compile(r'[\x00-\x1f\x7f<>"|?*]')
VALID_ORIENTATIONS = set(range(1, 9))


def utf16_ordinal_key(value: str) -> bytes:
    """Match JavaScript's UTF-16 code-unit ordinal comparison exactly."""
    return value.encode("utf-16-be", errors="surrogatepass")


def normalize_repository_path(value: Any) -> str:
    raw = str(value or "").strip().replace("\\", "/")
    if (
        not raw
        or raw.startswith("/")
        or re.match(r"^[A-Za-z]:/", raw)
        or "//" in raw
    ):
        raise ValueError(f"Unsafe repository-relative image path: {raw or '<empty>'}")
    parts = raw.split("/")
    if any(
        not part
        or part in {".", ".."}
        or part.endswith((".", " "))
        or ":" in part
        or UNSAFE_PATH_CHARACTER.search(part)
        or WINDOWS_RESERVED_NAME.search(part)
        for part in parts
    ):
        raise ValueError(f"Unsafe image path segment: {raw}")
    if parts[0] != "public":
        raise ValueError(f"Inspected image must stay under public/: {raw}")
    if Path(raw).suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(f"Unsupported inspected image extension: {raw}")
    return "/".join(parts)


def resolve_repository_path(repository_path: str) -> Path:
    normalized = normalize_repository_path(repository_path)
    target = (ROOT / Path(*normalized.split("/"))).resolve(strict=True)
    try:
        target.relative_to(ROOT.resolve(strict=True))
    except ValueError as exc:
        raise ValueError(f"Inspected path escaped the repository: {normalized}") from exc
    if not target.is_file():
        raise ValueError(f"Inspected path is not a regular file: {normalized}")
    return target


def image_has_alpha(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or (
        image.mode == "P" and "transparency" in image.info
    )


def normalized_format(value: Any) -> str:
    format_name = str(value or "").lower()
    if format_name == "jpg":
        return "jpeg"
    if format_name not in DECODED_FORMATS:
        raise ValueError(f"Unsupported decoded image format: {value!r}")
    return format_name


def normalized_pixel_hash(image: Image.Image) -> str:
    canonical_mode = "RGBA" if image_has_alpha(image) else "RGB"
    canonical = image.convert(canonical_mode)
    digest = hashlib.sha256()
    digest.update(b"fr-p5-normalized-pixels-v1\0")
    digest.update(f"{canonical.width}x{canonical.height}\0{canonical_mode}\0".encode("ascii"))
    digest.update(canonical.tobytes())
    return digest.hexdigest()


def inspect_image(repository_path: str) -> dict[str, Any]:
    target = resolve_repository_path(repository_path)
    try:
        with Image.open(target) as probe:
            decoded_format = normalized_format(
                probe.format or target.suffix.lstrip(".")
            )
            expected_format = normalized_format(target.suffix.lstrip("."))
            if decoded_format != expected_format:
                raise ValueError(
                    f"Decoded format {decoded_format} does not match extension "
                    f"{expected_format}: {repository_path}"
                )
            stored_width, stored_height = probe.size
            stored_mode = probe.mode
            frame_count = int(getattr(probe, "n_frames", 1))
            animated = bool(getattr(probe, "is_animated", False) or frame_count > 1)
            raw_orientation = probe.getexif().get(274, 1)
            try:
                exif_orientation = int(raw_orientation or 1)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"Invalid EXIF orientation {raw_orientation!r}: {repository_path}"
                ) from exc
            if exif_orientation not in VALID_ORIENTATIONS:
                raise ValueError(
                    f"Unsupported EXIF orientation {exif_orientation}: {repository_path}"
                )

        # Pillow requires verify() to be the first operation after open for
        # some decoders. Metadata reads above intentionally use a separate
        # handle so format-specific lazy loading cannot invalidate verification.
        with Image.open(target) as verification:
            verification.verify()

        with Image.open(target) as source:
            normalized = ImageOps.exif_transpose(source)
            normalized.seek(0)
            normalized.load()
            metadata = {
                "path": repository_path,
                "storedWidth": stored_width,
                "storedHeight": stored_height,
                "width": normalized.width,
                "height": normalized.height,
                "decodedFormat": decoded_format,
                "storedMode": stored_mode,
                "mode": normalized.mode,
                "hasAlpha": image_has_alpha(normalized),
                "exifOrientation": exif_orientation,
                "orientationNormalized": exif_orientation != 1,
                "frameCount": frame_count,
                "animated": animated,
                "pixelHash": normalized_pixel_hash(normalized),
                "decodeStatus": "ok",
            }
    except (OSError, SyntaxError, ValueError) as exc:
        raise ValueError(f"Image decode failed for {repository_path}: {exc}") from exc
    return metadata


def read_request() -> list[str]:
    try:
        request = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"Inspector stdin must be valid JSON: {exc}") from exc
    if not isinstance(request, dict) or set(request) != {"paths"}:
        raise ValueError("Inspector input must contain exactly one paths array.")
    paths = request["paths"]
    if not isinstance(paths, list):
        raise ValueError("Inspector paths must be an array.")
    normalized = [normalize_repository_path(value) for value in paths]
    if len(set(normalized)) != len(normalized):
        raise ValueError("Inspector paths contain duplicates.")
    if normalized != sorted(normalized, key=utf16_ordinal_key):
        raise ValueError("Inspector paths must use stable ordinal order.")
    return normalized


def main() -> int:
    try:
        paths = read_request()
        media = [inspect_image(repository_path) for repository_path in paths]
    except (OSError, ValueError) as exc:
        sys.stderr.buffer.write((str(exc) + "\n").encode("utf-8", errors="replace"))
        return 1
    result = {
        "schemaVersion": 1,
        "pillowVersion": PILLOW_VERSION,
        "media": media,
    }
    encoded = json.dumps(
        result,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=False,
    ).encode("utf-8")
    sys.stdout.buffer.write(encoded + b"\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
