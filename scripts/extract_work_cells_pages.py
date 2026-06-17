import argparse
import hashlib
import html
import json
import posixpath
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree

from PIL import Image, ImageOps


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT_DIRS = [
    Path("source-private/cells-at-work"),
    Path("source-private/\u5de5\u4f5c\u7ec6\u80de"),
    Path("private/cells-at-work"),
    Path("private/\u5de5\u4f5c\u7ec6\u80de"),
    Path("local-epubs/cells-at-work"),
    Path("local-epubs/\u5de5\u4f5c\u7ec6\u80de"),
    Path("source/\u5de5\u4f5c\u7ec6\u80de"),
]
PUBLIC_FORBIDDEN_DIRS = ["public", "dist", "build", "docs"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"}
HTML_MEDIA_TYPES = {"application/xhtml+xml", "text/html", "application/xml", "text/xml"}
TAG_PATTERN = re.compile(r"<(?:[\w.-]+:)?(?:img|image)\b([^<>]*)>", re.IGNORECASE)
ATTR_PATTERN = re.compile(
    r"""([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))""",
    re.IGNORECASE,
)


def to_posix(project_path):
    return project_path.as_posix()


def relative_posix(path):
    return to_posix(Path(path).resolve().relative_to(ROOT_DIR))


def assert_inside(base_path, target_path):
    base = Path(base_path).resolve()
    target = Path(target_path).resolve()
    try:
        target.relative_to(base)
    except ValueError as error:
        raise RuntimeError(f"Refusing to write outside {base}: {target}") from error


def local_name(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def first_child(element, name):
    for child in list(element):
        if local_name(child.tag) == name:
            return child
    return None


def children(element, name):
    if element is None:
        return []
    return [child for child in list(element) if local_name(child.tag) == name]


def parse_xml(xml_bytes):
    return ElementTree.fromstring(xml_bytes)


def read_text(zip_file, name):
    return zip_file.read(name).decode("utf-8-sig")


def normalize_zip_path(zip_path):
    return posixpath.normpath(zip_path.replace("\\", "/")).lstrip("/")


def strip_href_suffix(href):
    return href.split("#", 1)[0].split("?", 1)[0]


def resolve_href(base_path, href):
    clean_href = strip_href_suffix(html.unescape(href or "")).strip()
    if not clean_href or clean_href.startswith("data:"):
        return None
    return normalize_zip_path(posixpath.join(posixpath.dirname(base_path), unquote(clean_href)))


def parse_attrs(attribute_text):
    attrs = {}
    for match in ATTR_PATTERN.finditer(attribute_text or ""):
        attrs[match.group(1)] = html.unescape(match.group(2) or match.group(3) or match.group(4) or "")
    return attrs


def image_refs_from_document(document_text):
    refs = []
    for match in TAG_PATTERN.finditer(document_text):
        attrs = parse_attrs(match.group(1))
        href = attrs.get("src") or attrs.get("href") or attrs.get("xlink:href")
        if href:
            refs.append(href)
    return refs


def is_html_item(item):
    media_type = (item.get("mediaType") or "").lower()
    item_path = item.get("path") or ""
    return media_type in HTML_MEDIA_TYPES or item_path.lower().endswith((".xhtml", ".html", ".htm"))


def is_image_item(item):
    media_type = (item.get("mediaType") or "").lower()
    item_path = item.get("path") or ""
    return media_type.startswith("image/") or Path(item_path).suffix.lower() in IMAGE_EXTENSIONS


def infer_volume_number(file_name):
    match = re.search(r"(\d+)\s*\u5377", file_name)
    if not match:
        match = re.search(r"(?:vol(?:ume)?\.?[-_\s]*)(\d+)", file_name, re.IGNORECASE)
    if not match:
        match = re.search(r"(\d+)", file_name)
    return int(match.group(1)) if match else None


def collect_epubs(input_dir):
    if not input_dir.exists():
        return []
    return sorted(input_dir.rglob("*.epub"), key=lambda item: (infer_volume_number(item.name) or 999, item.name))


def choose_input_dir(explicit_input):
    if explicit_input:
        return (ROOT_DIR / explicit_input).resolve()
    for candidate in DEFAULT_INPUT_DIRS:
        candidate_path = (ROOT_DIR / candidate).resolve()
        if collect_epubs(candidate_path):
            return candidate_path
    return (ROOT_DIR / DEFAULT_INPUT_DIRS[0]).resolve()


def git_output(args):
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT_DIR,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result


def git_tracked_epubs():
    result = git_output(["ls-files", "--", "*.epub", "source/**", "source-private/**", "public/**/*.epub", "dist/**/*.epub", "build/**/*.epub", "docs/**/*.epub"])
    if result.returncode != 0:
        return []
    return [line for line in result.stdout.splitlines() if line.lower().endswith(".epub")]


def git_ignore_status(paths):
    statuses = {}
    for path in paths:
        rel_path = relative_posix(path)
        result = git_output(["check-ignore", "-v", "--", rel_path])
        statuses[rel_path] = {
            "ignored": result.returncode == 0,
            "rule": result.stdout.strip() if result.returncode == 0 else None,
        }
    return statuses


def public_epub_leaks():
    leaks = []
    for directory_name in PUBLIC_FORBIDDEN_DIRS:
        directory = ROOT_DIR / directory_name
        if directory.exists():
            leaks.extend(relative_posix(path) for path in directory.rglob("*.epub"))
    return sorted(leaks)


def parse_epub_page_order(epub_path):
    with zipfile.ZipFile(epub_path) as zip_file:
        container = parse_xml(zip_file.read("META-INF/container.xml"))
        rootfile = next(
            element
            for element in container.iter()
            if local_name(element.tag) == "rootfile" and element.attrib.get("full-path")
        )
        opf_path = normalize_zip_path(rootfile.attrib["full-path"])
        opf_dir = posixpath.dirname(opf_path)
        opf = parse_xml(zip_file.read(opf_path))
        manifest = first_child(opf, "manifest")
        spine = first_child(opf, "spine")

        manifest_items = []
        manifest_by_id = {}
        manifest_by_path = {}
        for index, item in enumerate(children(manifest, "item"), start=1):
            href = item.attrib.get("href", "")
            item_path = resolve_href(opf_path, href) if href else ""
            parsed_item = {
                "manifestIndex": index,
                "id": item.attrib.get("id", ""),
                "href": href,
                "path": item_path,
                "mediaType": item.attrib.get("media-type", ""),
                "properties": item.attrib.get("properties", ""),
            }
            manifest_items.append(parsed_item)
            if parsed_item["id"]:
                manifest_by_id[parsed_item["id"]] = parsed_item
            if parsed_item["path"]:
                manifest_by_path[parsed_item["path"]] = parsed_item

        pages = []
        seen = set()
        zip_names = set(zip_file.namelist())
        for spine_index, itemref in enumerate(children(spine, "itemref"), start=1):
            item = manifest_by_id.get(itemref.attrib.get("idref", ""))
            if not item:
                continue

            source_paths = []
            if is_image_item(item):
                source_paths.append(item["path"])
            elif is_html_item(item) and item["path"] in zip_names:
                document_text = read_text(zip_file, item["path"])
                for href in image_refs_from_document(document_text):
                    image_path = resolve_href(item["path"], href)
                    if image_path:
                        source_paths.append(image_path)

            for source_path in source_paths:
                image_item = manifest_by_path.get(source_path)
                if source_path in seen or source_path not in zip_names:
                    continue
                if image_item and not is_image_item(image_item):
                    continue
                if not image_item and Path(source_path).suffix.lower() not in IMAGE_EXTENSIONS:
                    continue

                seen.add(source_path)
                pages.append({
                    "spineIndex": spine_index,
                    "resourceIndex": len(pages) + 1,
                    "sourceDocumentPath": item["path"],
                    "sourceImagePath": source_path,
                    "sourceManifestId": image_item["id"] if image_item else None,
                    "sourceMediaType": image_item["mediaType"] if image_item else None,
                })

        if not pages:
            for item in manifest_items:
                if not is_image_item(item) or item["path"] not in zip_names:
                    continue
                pages.append({
                    "spineIndex": None,
                    "resourceIndex": len(pages) + 1,
                    "sourceDocumentPath": None,
                    "sourceImagePath": item["path"],
                    "sourceManifestId": item["id"],
                    "sourceMediaType": item["mediaType"],
                })

        toc_count = sum(
            1
            for item in manifest_items
            if "nav" in (item["properties"] or "").split()
            or item["path"].lower().endswith(".ncx")
        )

        return {
            "opfPath": opf_path,
            "spineItemCount": len(children(spine, "itemref")),
            "tocResourceCount": toc_count,
            "pages": pages,
        }


def webp_bytes_from_image(image_bytes, quality):
    with Image.open(BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        output = BytesIO()
        image.save(output, format="WEBP", quality=quality, method=6)
        return output.getvalue(), image.width, image.height


def output_record_from_existing(target_path):
    data = target_path.read_bytes()
    with Image.open(target_path) as image:
        width, height = image.size
    return data, width, height


def write_if_changed(target_path, data):
    if target_path.exists() and target_path.read_bytes() == data:
        return "unchanged"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    status = "updated" if target_path.exists() else "created"
    target_path.write_bytes(data)
    return status


def extract_volume(epub_path, volume_id, output_base, quality):
    epub_info = parse_epub_page_order(epub_path)
    volume_output = output_base / volume_id
    assert_inside(ROOT_DIR / "public", volume_output)
    records = []

    with zipfile.ZipFile(epub_path) as zip_file:
        for page_number, source in enumerate(epub_info["pages"], start=1):
            page_file = f"page-{page_number:03d}.webp"
            output_path = volume_output / page_file
            if output_path.exists():
                webp_data, width, height = output_record_from_existing(output_path)
                write_status = "unchanged"
            else:
                webp_data, width, height = webp_bytes_from_image(zip_file.read(source["sourceImagePath"]), quality)
                write_status = write_if_changed(output_path, webp_data)
            file_hash = hashlib.sha256(webp_data).hexdigest()
            records.append({
                "volumeId": volume_id,
                "pageNumber": page_number,
                "outputImagePath": relative_posix(output_path),
                "width": width,
                "height": height,
                "fileSize": len(webp_data),
                "hash": f"sha256:{file_hash}",
                "spineIndex": source["spineIndex"],
                "resourceIndex": source["resourceIndex"],
                "sourceDocumentPath": source["sourceDocumentPath"],
                "sourceImagePath": source["sourceImagePath"],
                "sourceManifestId": source["sourceManifestId"],
                "sourceMediaType": source["sourceMediaType"],
                "importStatus": "imported",
                "writeStatus": write_status,
            })

    return {
        "volumeId": volume_id,
        "sourceEpubPath": relative_posix(epub_path),
        "opfPath": epub_info["opfPath"],
        "spineItemCount": epub_info["spineItemCount"],
        "tocResourceCount": epub_info["tocResourceCount"],
        "pageCount": len(records),
        "pages": records,
    }


def build_index(input_dir, output_base, index_path, quality):
    epub_files = collect_epubs(input_dir)
    if not epub_files:
        raise RuntimeError(f"No EPUB files found in {relative_posix(input_dir)}")

    tracked_epubs = git_tracked_epubs()
    leaks = public_epub_leaks()
    ignore_status = git_ignore_status(epub_files)
    if leaks:
        raise RuntimeError(f"Full EPUB files found in public/deployable directories: {', '.join(leaks)}")

    volumes = []
    for epub_path in epub_files:
        volume_number = infer_volume_number(epub_path.name)
        if volume_number is None:
            raise RuntimeError(f"Cannot infer volume number from EPUB name: {epub_path.name}")
        volumes.append(extract_volume(epub_path, f"v{volume_number:02d}", output_base, quality))

    index = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "seriesId": "cells-at-work",
        "sourcePolicy": {
            "fullEpubPublicRelease": "forbidden",
            "fullEpubEnteredPublicDirectory": False,
            "checkedPublicDirectories": [f"{name}/" for name in PUBLIC_FORBIDDEN_DIRS],
            "publicEpubLeaks": leaks,
            "gitTrackedEpubs": tracked_epubs,
            "inputDirectory": relative_posix(input_dir),
            "epubIgnoreStatus": ignore_status,
            "migrationRequired": bool(tracked_epubs or leaks or any(not item["ignored"] for item in ignore_status.values())),
        },
        "output": {
            "pagesBaseDirectory": f"{relative_posix(output_base)}/",
            "indexPath": relative_posix(index_path),
            "imageFormat": "webp",
            "naming": "pages-by-volume/vNN/page-NNN.webp",
        },
        "volumePageIndex": volumes,
    }

    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return index


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Extract Work Cells EPUB page images by spine order.")
    parser.add_argument("--input", help="Directory containing the six EPUB files.")
    parser.add_argument(
        "--output",
        default="public/assets/cells-at-work/pages-by-volume",
        help="Public directory for converted page images.",
    )
    parser.add_argument(
        "--index",
        default="public/assets/cells-at-work/volume-page-index.json",
        help="JSON index output path.",
    )
    parser.add_argument("--quality", default=92, type=int, help="WebP quality, 1-100.")
    return parser.parse_args(argv)


def main(argv):
    args = parse_args(argv)
    input_dir = choose_input_dir(args.input)
    output_base = (ROOT_DIR / args.output).resolve()
    index_path = (ROOT_DIR / args.index).resolve()
    assert_inside(ROOT_DIR / "public", output_base)
    assert_inside(ROOT_DIR / "public", index_path)

    index = build_index(input_dir, output_base, index_path, args.quality)
    for volume in index["volumePageIndex"]:
        print(f"{volume['volumeId']}: {volume['pageCount']} pages")
    print(f"pages: {index['output']['pagesBaseDirectory']}")
    print(f"index: {index['output']['indexPath']}")
    print("full EPUB public leaks: 0")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
