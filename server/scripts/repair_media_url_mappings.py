"""Repair cross-wired TOEIC media URLs with transactional safeguards.

The canonical year and test name come from the dataset directory, not from the
raw ``year`` field in test_info.json. The script deliberately updates only
non-null URLs whose current object key differs from the canonical key. It does
not synthesize missing media, so passages that intentionally have no image stay
unchanged.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse

import pymysql


SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from app import config  # noqa: E402


DATASET_ROOT = Path("C:/android-server/dautoeic/mock_test_data/downloads")
SQLITE_PATH = SERVER_DIR / "toeic.db"
EXPECTED_REPAIR_COUNT = 390
MEDIA_FIELDS = (("audio_url", "audio"), ("image_url", "images"))


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def source_filename(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(str(value))
    path = parsed.path if parsed.scheme else str(value).split("?", 1)[0]
    return Path(unquote(path.replace("\\", "/"))).name or None


def expected_url(year: int, test_name: str, kind: str, value: str | None) -> str | None:
    filename = source_filename(value)
    if not filename:
        return None
    key = "/".join(
        quote(part, safe="")
        for part in (str(year), test_name, kind, filename)
    )
    return f"{config.R2_PUBLIC_BASE_URL}/{key}"


def media_key(value: str | None) -> str | None:
    if not value:
        return None
    normalized = unquote(urlparse(str(value)).path).lstrip("/")
    for marker in (
        "storage/v1/object/public/media/",
        "storage/v1/object/public/mock-test-media/",
        "media/",
    ):
        if marker in normalized:
            return normalized.split(marker, 1)[1]
    return normalized


def canonical_rows() -> tuple[dict[str, dict[str, Any]], set[str]]:
    rows: dict[str, dict[str, Any]] = {}
    test_ids: set[str] = set()
    for year_dir in sorted(DATASET_ROOT.iterdir()):
        if not year_dir.is_dir() or not year_dir.name.isdigit():
            continue
        year = int(year_dir.name)
        for test_dir in sorted(year_dir.glob("Test *")):
            if not test_dir.is_dir():
                continue
            data_dir = test_dir / "data"
            test_info = read_json(data_dir / "test_info.json")
            test_ids.add(test_info["id"])
            for table in ("questions", "passages"):
                for row in read_json(data_dir / f"{table}.json"):
                    key = f"{table}:{row['id']}"
                    rows[key] = {
                        "table": table,
                        "id": row["id"],
                        "test_id": test_info["id"],
                        "year": year,
                        "test": test_dir.name,
                        "audio_url": expected_url(year, test_dir.name, "audio", row.get("audio_url")),
                        "image_url": expected_url(year, test_dir.name, "images", row.get("image_url")),
                    }
    return rows, test_ids


def mysql_connection(*, autocommit: bool = False):
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=autocommit,
        connect_timeout=10,
    )


def mysql_media_rows(connection, table: str, test_ids: set[str]) -> list[dict[str, Any]]:
    placeholders = ",".join(["%s"] * len(test_ids))
    query = (
        f"SELECT id, test_id, audio_url, image_url FROM `{table}` "
        f"WHERE test_id IN ({placeholders})"
    )
    with connection.cursor() as cursor:
        cursor.execute(query, tuple(sorted(test_ids)))
        return list(cursor.fetchall())


def build_repair_plan(
    canonical: dict[str, dict[str, Any]],
    mysql_rows: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for table, rows in mysql_rows.items():
        for current in rows:
            expected = canonical.get(f"{table}:{current['id']}")
            if not expected:
                continue
            for field, _kind in MEDIA_FIELDS:
                old_url = current.get(field)
                new_url = expected.get(field)
                # A null current value represents intentionally absent media.
                # It must never be fabricated from a stale source reference.
                if not old_url or not new_url or media_key(old_url) == media_key(new_url):
                    continue
                plan.append(
                    {
                        "table": table,
                        "id": current["id"],
                        "test_id": current["test_id"],
                        "year": expected["year"],
                        "test": expected["test"],
                        "field": field,
                        "old_url": old_url,
                        "new_url": new_url,
                        "old_key": media_key(old_url),
                        "new_key": media_key(new_url),
                    }
                )
    return plan


def create_backup(plan: list[dict[str, Any]]) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    backup_dir = SERVER_DIR / "backups" / f"before-media-url-repair-{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=False)
    (backup_dir / "media-url-repair-plan.json").write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    shutil.copy2(SQLITE_PATH, backup_dir / "toeic.db")
    return backup_dir


def apply_mysql_transaction(connection, plan: list[dict[str, Any]]) -> int:
    updated = 0
    connection.begin()
    try:
        with connection.cursor() as cursor:
            for item in plan:
                cursor.execute(
                    f"UPDATE `{item['table']}` SET `{item['field']}` = %s "
                    f"WHERE id = %s AND `{item['field']}` = %s",
                    (item["new_url"], item["id"], item["old_url"]),
                )
                updated += cursor.rowcount
        if updated != EXPECTED_REPAIR_COUNT:
            raise RuntimeError(
                f"MySQL touched {updated} rows; expected {EXPECTED_REPAIR_COUNT}. Rolling back."
            )
        connection.commit()
        return updated
    except Exception:
        connection.rollback()
        raise


def apply_sqlite_transaction(plan: list[dict[str, Any]]) -> int:
    connection = sqlite3.connect(SQLITE_PATH)
    updated = 0
    try:
        connection.execute("BEGIN IMMEDIATE")
        for item in plan:
            cursor = connection.execute(
                f'UPDATE "{item["table"]}" SET "{item["field"]}" = ? '
                f'WHERE id = ? AND "{item["field"]}" = ?',
                (item["new_url"], item["id"], item["old_url"]),
            )
            updated += cursor.rowcount
        if updated != EXPECTED_REPAIR_COUNT:
            raise RuntimeError(
                f"SQLite touched {updated} rows; expected {EXPECTED_REPAIR_COUNT}. Rolling back."
            )
        connection.commit()
        return updated
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def restore_mysql_transaction(connection, plan: list[dict[str, Any]]) -> None:
    restored = 0
    connection.begin()
    try:
        with connection.cursor() as cursor:
            for item in plan:
                cursor.execute(
                    f"UPDATE `{item['table']}` SET `{item['field']}` = %s "
                    f"WHERE id = %s AND `{item['field']}` = %s",
                    (item["old_url"], item["id"], item["new_url"]),
                )
                restored += cursor.rowcount
        if restored != EXPECTED_REPAIR_COUNT:
            raise RuntimeError(
                f"MySQL compensation restored {restored} rows; "
                f"expected {EXPECTED_REPAIR_COUNT}."
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def verify_mysql(connection, plan: list[dict[str, Any]]) -> None:
    with connection.cursor() as cursor:
        for item in plan:
            cursor.execute(
                f"SELECT `{item['field']}` AS media_url FROM `{item['table']}` WHERE id = %s",
                (item["id"],),
            )
            row = cursor.fetchone()
            if not row or media_key(row["media_url"]) != item["new_key"]:
                raise RuntimeError(f"Verification failed for {item['table']}:{item['id']}:{item['field']}")


def verify_sqlite(plan: list[dict[str, Any]]) -> None:
    connection = sqlite3.connect(SQLITE_PATH)
    try:
        for item in plan:
            row = connection.execute(
                f'SELECT "{item["field"]}" FROM "{item["table"]}" WHERE id = ?',
                (item["id"],),
            ).fetchone()
            if not row or media_key(row[0]) != item["new_key"]:
                raise RuntimeError(
                    f"SQLite verification failed for "
                    f"{item['table']}:{item['id']}:{item['field']}"
                )
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and summarize the exact repair plan without writing anything.",
    )
    arguments = parser.parse_args()

    if not config.R2_PUBLIC_BASE_URL:
        raise RuntimeError("R2_PUBLIC_BASE_URL is not configured")
    if not DATASET_ROOT.exists() or not SQLITE_PATH.exists():
        raise FileNotFoundError("Dataset root or SQLite database is missing")

    canonical, test_ids = canonical_rows()
    connection = mysql_connection()
    try:
        current_rows = {
            table: mysql_media_rows(connection, table, test_ids)
            for table in ("questions", "passages")
        }
        plan = build_repair_plan(canonical, current_rows)
        if len(plan) != EXPECTED_REPAIR_COUNT:
            raise RuntimeError(
                f"Refusing to mutate databases: found {len(plan)} repairs, "
                f"expected exactly {EXPECTED_REPAIR_COUNT}."
            )

        affected = Counter(f"{item['year']}/{item['test']}" for item in plan)
        media_types = Counter(item["field"] for item in plan)
        if arguments.dry_run:
            print(
                json.dumps(
                    {
                        "success": True,
                        "dryRun": True,
                        "plannedUpdates": len(plan),
                        "affectedTests": dict(sorted(affected.items())),
                        "updatedFields": dict(sorted(media_types.items())),
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return

        backup_dir = create_backup(plan)
        mysql_updated = apply_mysql_transaction(connection, plan)
        try:
            sqlite_updated = apply_sqlite_transaction(plan)
        except Exception:
            restore_mysql_transaction(connection, plan)
            raise
        verify_mysql(connection, plan)
        verify_sqlite(plan)

        print(
            json.dumps(
                {
                    "success": True,
                    "backupDirectory": str(backup_dir),
                    "mysqlUpdated": mysql_updated,
                    "sqliteUpdated": sqlite_updated,
                    "affectedTests": dict(sorted(affected.items())),
                    "updatedFields": dict(sorted(media_types.items())),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        connection.close()


if __name__ == "__main__":
    main()
