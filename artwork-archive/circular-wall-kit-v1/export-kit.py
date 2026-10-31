#!/usr/bin/env python3
"""Package the reviewed circular wall kit; Python standard library only.

Run from any directory after all assets and their visual review are complete:

    python path/to/export-kit.py --output /path/outside/the/repo/wall-kit.zip

This script performs no image editing and makes no source-tree changes. It
creates/replaces only the requested ZIP and its adjacent .completion.json
receipt, after checking the required asset and review preconditions.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import struct
import sys
import tempfile
import zipfile


ARCHIVE_ROOT = "humans-remain-circular-wall-kit-v1"
DEFAULT_OUTPUT = Path(
    "/workspace/scratch/adfc85f29e84/humans-remain-circular-wall-kit-v1.zip"
)
KIT_RELATIVE = Path("artwork-archive/circular-wall-kit-v1")
ASSETS_RELATIVE = Path("public/survival/camp-circular-wall-v1")
EXPECTED_IDS = tuple(f"wall-{number:02d}" for number in range(1, 17))
CHUNK_SIZE = 1024 * 1024

EXCLUDED_PARTS = {
    ".git", ".hg", ".svn", "node_modules", "__pycache__", ".pytest_cache",
    ".cache", ".mypy_cache", ".ruff_cache", ".aws", ".ssh", "tmp", "temp",
    "temporary", "rejected", "intermediate", "intermediates", "old-qa",
    "old_qa", "oldqa", "obsolete", "cache", "caches",
}
EXCLUDED_SUFFIXES = {
    ".pyc", ".pyo", ".tmp", ".temp", ".bak", ".swp", ".swo", ".part",
    ".log", ".pem", ".key", ".p12", ".p8", ".mobileprovision", ".keystore",
    ".jks", ".zip",
}
DISCARDED_NAME = re.compile(
    r"(?:^|[-_.])(?:rejected|intermediate|temporary|old[-_]?qa)(?:[-_.]|$)",
    re.IGNORECASE,
)


class ExportError(RuntimeError):
    """An input or verification condition makes this export incomplete."""


@dataclass(frozen=True)
class PayloadFile:
    source: Path
    relative_path: str
    size: int
    sha256: str

    @property
    def archive_member(self) -> str:
        return f"{ARCHIVE_ROOT}/{self.relative_path}"

    def inventory_record(self) -> dict:
        return {
            "path": self.relative_path,
            "archive_member": self.archive_member,
            "size_bytes": self.size,
            "sha256": self.sha256,
        }


def within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def digest_stream(stream) -> tuple:
    digest = hashlib.sha256()
    size = 0
    while True:
        block = stream.read(CHUNK_SIZE)
        if not block:
            break
        digest.update(block)
        size += len(block)
    return size, digest.hexdigest()


def digest_file(path: Path) -> tuple:
    with path.open("rb") as stream:
        return digest_stream(stream)


def require_file(path: Path) -> None:
    if path.is_symlink() or not path.is_file():
        raise ExportError(f"Required regular file is missing or is a symlink: {path}")
    if path.stat().st_size == 0:
        raise ExportError(f"Required file is empty: {path}")


def load_json_with_hash(path: Path) -> tuple:
    require_file(path)
    try:
        raw = path.read_bytes()
        value = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ExportError(f"Cannot read valid JSON from {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ExportError(f"Expected a JSON object: {path}")
    return value, hashlib.sha256(raw).hexdigest()


def load_json(path: Path) -> dict:
    return load_json_with_hash(path)[0]


def require_image_header(path: Path, kind: str) -> None:
    """Reject absent/empty files and LFS pointer text; do not decode or edit art."""
    require_file(path)
    with path.open("rb") as stream:
        header = stream.read(32)
    if kind == "png":
        if (len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n"
                or header[12:16] != b"IHDR"):
            raise ExportError(f"Expected real PNG bytes, not a pointer or substitute: {path}")
        width, height = struct.unpack(">II", header[16:24])
        if not width or not height:
            raise ExportError(f"PNG has invalid dimensions: {path}")
    elif kind == "webp":
        if len(header) < 16 or header[:4] != b"RIFF" or header[8:12] != b"WEBP":
            raise ExportError(f"Expected real WebP bytes, not a pointer or substitute: {path}")
    else:
        raise ExportError(f"Unsupported header check: {kind}")


def checked_review_binding(repo: Path, record: dict, expected_relative: str) -> tuple:
    if not isinstance(record, dict) or record.get("path") != expected_relative:
        raise ExportError(f"Visual review must identify the exact file: {expected_relative}")
    expected_sha = record.get("sha256")
    if not isinstance(expected_sha, str) or re.fullmatch(r"[0-9a-f]{64}", expected_sha) is None:
        raise ExportError(f"Visual review lacks a valid SHA-256 for: {expected_relative}")
    path = repo / expected_relative
    require_file(path)
    if digest_file(path)[1] != expected_sha:
        raise ExportError(f"Current bytes differ from the accepted visual review: {expected_relative}")
    return expected_relative, expected_sha


def check_review_bindings(repo: Path, review: dict, review_sha256: str) -> dict:
    records = review.get("assets")
    if not isinstance(records, list) or len(records) != 16:
        raise ExportError("Visual review must record exactly 16 reviewed asset entries.")
    ids = [record.get("id") for record in records if isinstance(record, dict)]
    if len(ids) != 16 or set(ids) != set(EXPECTED_IDS):
        raise ExportError("Visual review must identify wall-01 through wall-16 exactly once.")

    bindings = {}
    by_id = {record["id"]: record for record in records}
    for asset_id in EXPECTED_IDS:
        record = by_id[asset_id]
        for extension in ("png", "webp"):
            relative = (ASSETS_RELATIVE / f"{asset_id}.{extension}").as_posix()
            relative, sha = checked_review_binding(repo, record.get(extension), relative)
            bindings[relative] = sha
        source_relative = (KIT_RELATIVE / "generated" / f"{asset_id}.png").as_posix()
        relative, sha = checked_review_binding(repo, record.get("source"), source_relative)
        bindings[relative] = sha

    assembly_relative = (KIT_RELATIVE / "previews" / "assembled-circle.png").as_posix()
    require_image_header(repo / assembly_relative, "png")
    relative, sha = checked_review_binding(repo, review.get("assembledPreview"), assembly_relative)
    bindings[relative] = sha
    review_relative = (KIT_RELATIVE / "visual-review.json").as_posix()
    bindings[review_relative] = review_sha256
    return bindings


def check_preconditions(repo: Path, kit: Path, assets: Path) -> dict:
    for directory in (kit, assets):
        if directory.is_symlink() or not directory.is_dir():
            raise ExportError(f"Required ordinary directory is unavailable: {directory}")

    manifest = load_json(assets / "manifest.json")
    records = manifest.get("assets")
    if not isinstance(records, list) or len(records) != 16:
        raise ExportError("The runtime manifest must contain exactly 16 asset records.")
    ids = [record.get("id") for record in records if isinstance(record, dict)]
    if len(ids) != 16 or set(ids) != set(EXPECTED_IDS):
        raise ExportError("Manifest IDs must be wall-01 through wall-16, with no duplicates.")
    if manifest.get("generatedCount") != 16 or manifest.get("expectedCount") != 16:
        raise ExportError("Manifest generatedCount and expectedCount must both equal 16.")
    if manifest.get("missing") != []:
        raise ExportError("Manifest still reports missing assets, or lacks an empty missing list.")

    review_path = kit / "visual-review.json"
    review, review_sha256 = load_json_with_hash(review_path)
    recorded_review = manifest.get("visualReview", {})
    if (manifest.get("status") != "accepted-asset-kit"
            or recorded_review.get("accepted") is not True
            or recorded_review.get("reviewSha256") != review_sha256):
        raise ExportError("Rerun process-kit.mjs: the manifest must reference this exact accepted review.")
    if review.get("reviewed") is not True:
        raise ExportError("visual-review.json must explicitly contain reviewed: true.")
    if review.get("approvalStatus") != "accepted":
        raise ExportError("visual-review.json approvalStatus must equal accepted; reviewed alone is insufficient.")

    required_support = (
        "README.md", "process-kit.mjs", "export-kit.py", "prompts.json",
        "production-spec.json", "registration-report.json",
        "geometry/build-guides.mjs", "geometry/manifest.json",
        "reference/approved-spiked-mossy-wall.png",
    )
    for relative in required_support:
        require_file(kit / relative)

    by_id = {record["id"]: record for record in records}
    for asset_id in EXPECTED_IDS:
        record = by_id[asset_id]
        for extension in ("png", "webp"):
            expected_name = f"{asset_id}.{extension}"
            if record.get(extension) != expected_name:
                raise ExportError(f"Unexpected {extension} filename for {asset_id}.")
            require_image_header(assets / expected_name, extension)
        original = kit / "generated" / f"{asset_id}.png"
        require_image_header(original, "png")
        require_image_header(kit / "geometry" / f"{asset_id}.png", "png")
        original_sha = record.get("sourceSha256")
        if original_sha and digest_file(original)[1] != original_sha:
            raise ExportError(f"Original {asset_id} no longer matches its manifest source hash.")

    review_bindings = check_review_bindings(repo, review, review_sha256)
    return {
        "asset_count": 16,
        "delivery_image_count": 32,
        "original_image_count": 16,
        "geometry_guide_count": 16,
        "visual_review": {
            "path": review_path.relative_to(repo).as_posix(),
            "reviewed": True,
            "approval_status": "accepted",
            "sha256": review_bindings[review_path.relative_to(repo).as_posix()],
            "all_delivery_sprites_match_accepted_review": True,
            "all_originals_match_accepted_review": True,
            "assembled_preview_matches_accepted_review": True,
        },
        "reviewed_file_hashes": review_bindings,
    }


def exclusion_reason(relative: Path) -> str:
    for component in relative.parts:
        lower = component.lower()
        if lower in EXCLUDED_PARTS:
            return "temporary, discarded, cache or non-deliverable directory/name"
        if lower.startswith(".env"):
            return "environment file"
        if lower in (".ds_store", "thumbs.db", "desktop.ini"):
            return "operating-system metadata"
        if DISCARDED_NAME.search(component):
            return "discarded or intermediate variant"
    if relative.suffix.lower() in EXCLUDED_SUFFIXES:
        return "temporary, private, cache or nested-archive file type"
    if relative.name.endswith("~"):
        return "editor backup"
    return ""


def collect_payload(repo: Path, roots: tuple) -> tuple:
    payload = []
    excluded = []
    for root in roots:
        for directory, child_dirs, child_files in os.walk(root, followlinks=False):
            directory_path = Path(directory)
            for name in list(child_dirs):
                path = directory_path / name
                relative = path.relative_to(repo)
                reason = exclusion_reason(relative)
                if path.is_symlink():
                    raise ExportError(f"Refusing a symlink inside the payload: {relative}")
                if reason:
                    child_dirs.remove(name)
                    excluded.append({"path": relative.as_posix() + "/", "reason": reason})
            for name in child_files:
                path = directory_path / name
                relative = path.relative_to(repo)
                reason = exclusion_reason(relative)
                if reason:
                    excluded.append({"path": relative.as_posix(), "reason": reason})
                    continue
                if path.is_symlink() or not path.is_file():
                    raise ExportError(f"Refusing a non-regular payload file: {relative}")
                size, sha = digest_file(path)
                payload.append(PayloadFile(path, relative.as_posix(), size, sha))

    root_readme = roots[0] / "README.md"
    size, sha = digest_file(root_readme)
    payload.append(PayloadFile(root_readme, "README.md", size, sha))
    payload.sort(key=lambda record: record.relative_path)
    names = [record.relative_path for record in payload]
    if len(names) != len(set(names)):
        raise ExportError("The proposed ZIP contains duplicate payload paths.")
    return payload, sorted(excluded, key=lambda record: record["path"])


def check_payload_review_bindings(payload: list, bindings: dict) -> None:
    planned_hashes = {record.relative_path: record.sha256 for record in payload}
    for relative, reviewed_sha in bindings.items():
        if planned_hashes.get(relative) != reviewed_sha:
            raise ExportError(f"Payload no longer matches the accepted visual review: {relative}")


def json_bytes(value: dict) -> bytes:
    return (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def zip_info(member: str) -> zipfile.ZipInfo:
    path = PurePosixPath(member)
    if path.is_absolute() or ".." in path.parts or path.parts[0] != ARCHIVE_ROOT:
        raise ExportError(f"Unsafe archive member: {member}")
    info = zipfile.ZipInfo(member, date_time=(2000, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    return info


def write_archive(path: Path, payload: list, inventory: bytes) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=6, allowZip64=True) as archive:
        for record in payload:
            digest = hashlib.sha256()
            written = 0
            with record.source.open("rb") as source:
                with archive.open(zip_info(record.archive_member), "w", force_zip64=True) as target:
                    while True:
                        block = source.read(CHUNK_SIZE)
                        if not block:
                            break
                        target.write(block)
                        digest.update(block)
                        written += len(block)
            if written != record.size or digest.hexdigest() != record.sha256:
                raise ExportError(f"Source changed while packaging: {record.relative_path}")
        archive.writestr(zip_info(f"{ARCHIVE_ROOT}/FILE-INVENTORY.json"), inventory)


def verify_archive(path: Path, payload: list, inventory: bytes) -> dict:
    inventory_member = f"{ARCHIVE_ROOT}/FILE-INVENTORY.json"
    expected = {
        record.archive_member: (record.size, record.sha256) for record in payload
    }
    expected[inventory_member] = (len(inventory), hashlib.sha256(inventory).hexdigest())

    with zipfile.ZipFile(path, "r") as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise ExportError(f"ZIP integrity check failed: {bad_member}")

    # Reopen independently after CRC testing; hash every uncompressed entry.
    with zipfile.ZipFile(path, "r") as archive:
        entries = archive.infolist()
        if len(entries) != len(expected):
            raise ExportError("Reopened ZIP entry count does not match the payload inventory.")
        names = [entry.filename for entry in entries]
        if len(names) != len(set(names)) or set(names) != set(expected):
            raise ExportError("Reopened ZIP contains missing, extra or duplicate entries.")
        for entry in entries:
            if entry.is_dir():
                raise ExportError(f"Unexpected directory entry: {entry.filename}")
            with archive.open(entry, "r") as stream:
                actual = digest_stream(stream)
            if actual != expected[entry.filename] or entry.file_size != actual[0]:
                raise ExportError(f"Reopened ZIP content verification failed: {entry.filename}")
        recorded = json.loads(archive.read(inventory_member).decode("utf-8"))
        if recorded["files"] != [record.inventory_record() for record in payload]:
            raise ExportError("Archived inventory does not match the verified payload plan.")

    return {
        "testzip_passed": True,
        "archive_reopened": True,
        "entry_count_verified": True,
        "every_entry_size_and_sha256_verified": True,
        "inventory_matches_payload": True,
        "entry_count": len(expected),
        "payload_file_count": len(payload),
        "inventory": {
            "archive_member": inventory_member,
            "size_bytes": len(inventory),
            "sha256": hashlib.sha256(inventory).hexdigest(),
        },
    }


def write_json_atomic(path: Path, value: dict) -> None:
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile("wb", prefix=f".{path.name}-", suffix=".tmp",
                                         dir=path.parent, delete=False) as stream:
            temp_path = Path(stream.name)
            stream.write(json_bytes(value))
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT,
        help="ZIP destination outside the source checkout; overrides the workspace default.",
    )
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    kit = repo / KIT_RELATIVE
    assets = repo / ASSETS_RELATIVE
    output = args.output.expanduser().resolve()
    receipt_path = output.with_suffix(".completion.json")
    if output.suffix.lower() != ".zip":
        raise ExportError("The output filename must end in .zip.")
    if within(output, repo) or within(receipt_path, repo):
        raise ExportError("Choose an output outside the repository; the receipt must also stay outside it.")

    # No output directory or archive is created before all required inputs pass.
    preconditions = check_preconditions(repo, kit, assets)
    payload, excluded = collect_payload(repo, (kit, assets))
    check_payload_review_bindings(payload, preconditions["reviewed_file_hashes"])
    inventory_object = {
        "version": 1,
        "archive_root": ARCHIVE_ROOT,
        "coverage": "Every payload file, including the copied root README.md.",
        "self_hash_note": (
            "FILE-INVENTORY.json cannot contain its own SHA-256. Its size/hash and the ZIP's "
            "size/hash are recorded in the adjacent external completion receipt. Archive "
            "verification independently checks this inventory entry as well as every payload entry."
        ),
        "payload_file_count": len(payload),
        "payload_total_bytes": sum(record.size for record in payload),
        "required_inputs": preconditions,
        "excluded": excluded,
        "files": [record.inventory_record() for record in payload],
    }
    inventory = json_bytes(inventory_object)

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("wb", prefix=f".{output.stem}-", suffix=".zip.tmp",
                                         dir=output.parent, delete=False) as stream:
            temporary = Path(stream.name)
        write_archive(temporary, payload, inventory)
        verification = verify_archive(temporary, payload, inventory)
        os.replace(temporary, output)
        archive_size, archive_sha = digest_file(output)
        receipt = {
            "status": "created_and_verified",
            "checked_at_utc": datetime.now(timezone.utc).isoformat(),
            "archive_path": str(output),
            "archive_root": ARCHIVE_ROOT,
            "archive_size_bytes": archive_size,
            "archive_sha256": archive_sha,
            "receipt_path": str(receipt_path),
            "source_repository": str(repo),
            "source_folders": [KIT_RELATIVE.as_posix(), ASSETS_RELATIVE.as_posix()],
            "required_inputs": preconditions,
            "verification": verification,
            "excluded": excluded,
            "source_files_modified": False,
            "image_editing_performed": False,
        }
        write_json_atomic(receipt_path, receipt)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()

    print(json.dumps({
        "status": receipt["status"],
        "archive": str(output),
        "size_bytes": archive_size,
        "sha256": archive_sha,
        "entry_count": verification["entry_count"],
        "receipt": str(receipt_path),
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ExportError, OSError, zipfile.BadZipFile) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        raise SystemExit(1)
