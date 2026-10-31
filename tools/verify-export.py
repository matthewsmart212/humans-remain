#!/usr/bin/env python3
"""Verify an extracted, unmodified Humans Remain source export."""
import csv
import hashlib
import json
import sys
from pathlib import Path, PurePosixPath

root = Path(__file__).resolve().parents[1]
inventory = root / "FILE-INVENTORY.csv"
if not inventory.is_file():
    raise SystemExit("Missing FILE-INVENTORY.csv; extract every numbered ZIP into the same parent.")
failures = []
count = 0
total = 0
with inventory.open(newline="", encoding="utf-8") as handle:
    for row in csv.DictReader(handle):
        relative = PurePosixPath(row["path"])
        if relative.is_absolute() or ".." in relative.parts or "\\" in row["path"]:
            failures.append({"path": row["path"], "error": "unsafe inventory path"})
            continue
        target = root.joinpath(*relative.parts)
        if target.is_symlink() or not target.is_file():
            failures.append({"path": row["path"], "error": "missing or not a regular file"})
            continue
        expected_size = int(row["bytes"])
        digest = hashlib.sha256()
        with target.open("rb") as data:
            for block in iter(lambda: data.read(1024 * 1024), b""):
                digest.update(block)
        if target.stat().st_size != expected_size or digest.hexdigest() != row["sha256"]:
            failures.append({"path": row["path"], "error": "size or SHA-256 mismatch"})
        count += 1
        total += target.stat().st_size
print(json.dumps({"checked_files": count, "checked_bytes": total, "failures": failures}, indent=2))
if failures:
    print("Verification failed. Confirm all parts were extracted; intentional later edits also change hashes.", file=sys.stderr)
    raise SystemExit(1)
print("PASS: Every inventoried export payload file is present and matches its SHA-256.")
print("FILE-INVENTORY.csv and INVENTORY-SUMMARY.json are self-excluded and covered by the ZIP checksums.")
