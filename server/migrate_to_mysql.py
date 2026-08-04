"""Create the MySQL schema and import existing TOEIC data.

Examples:
    python migrate_to_mysql.py
    python migrate_to_mysql.py --sqlite toeic.db --json-dir mysql-import

The optional JSON directory accepts one file per table (for example
``users.json`` or ``user_vocabulary.json``). Each file must contain either a
JSON array or an object with a ``data`` array. Unknown columns are ignored, so
exports can contain provider-specific metadata without changing the importer.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

import pymysql
from dotenv import load_dotenv


SERVER_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = SERVER_DIR / "mysql_schema.sql"
DEFAULT_SQLITE_PATH = SERVER_DIR / "toeic.db"

TABLE_ORDER = (
    "test_sets",
    "tests",
    "passages",
    "questions",
    "toeic_score_conversion",
    "users",
    "user_sessions",
    "test_attempts",
    "user_vocabulary",
    "user_vocabulary_topic_overrides",
    "translation_cache",
)
SQLITE_CONTENT_TABLES = {
    "test_sets",
    "tests",
    "passages",
    "questions",
    "toeic_score_conversion",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate TOEIC data to MySQL")
    parser.add_argument(
        "--sqlite",
        type=Path,
        default=DEFAULT_SQLITE_PATH,
        help="Existing SQLite content database (default: server/toeic.db)",
    )
    parser.add_argument(
        "--json-dir",
        type=Path,
        help="Optional directory with <table>.json exports for user data",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Delete target rows before importing. Use only on a disposable target.",
    )
    return parser.parse_args()


def mysql_options() -> dict[str, Any]:
    return {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": False,
        "database": database_name(),
    }


def database_name() -> str:
    name = os.getenv("DB_NAME", "toeic_db")
    if not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise ValueError("DB_NAME may contain only letters, numbers, and underscores")
    return name


def schema_statements() -> Iterable[str]:
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema not found: {SCHEMA_PATH}")
    schema = "\n".join(
        line
        for line in SCHEMA_PATH.read_text(encoding="utf-8").splitlines()
        if not line.strip().startswith("--")
    )
    return (statement.strip() for statement in schema.split(";") if statement.strip())


def apply_schema() -> None:
    connection = pymysql.connect(**mysql_options())
    try:
        with connection.cursor() as cursor:
            for statement in schema_statements():
                cursor.execute(statement)
        connection.commit()
    finally:
        connection.close()


def target_columns(connection, table: str) -> list[dict[str, Any]]:
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM `{table}`")
        return list(cursor.fetchall())


def normalize_value(value: Any, mysql_type: str) -> Any:
    if value == "":
        return None if mysql_type.startswith(("date", "datetime", "timestamp")) else value
    if value is None:
        return None
    if mysql_type.startswith(("json",)) and not isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if mysql_type.startswith(("datetime", "timestamp")) and isinstance(value, str):
        raw = value.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(raw).replace(tzinfo=None)
        except ValueError:
            return value
    return value


def upsert_rows(connection, table: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    definitions = target_columns(connection, table)
    allowed = {column["Field"]: str(column["Type"]).lower() for column in definitions}
    columns = [name for name in allowed if any(name in row for row in rows)]
    if not columns:
        return 0

    primary_columns = {
        column["Field"] for column in definitions if column.get("Key") == "PRI"
    }
    updates = [column for column in columns if column not in primary_columns]
    placeholders = ", ".join(["%s"] * len(columns))
    column_sql = ", ".join(f"`{column}`" for column in columns)
    if updates:
        update_sql = ", ".join(
            f"`{column}` = VALUES(`{column}`)" for column in updates
        )
    else:
        first_column = columns[0]
        update_sql = f"`{first_column}` = VALUES(`{first_column}`)"
    query = (
        f"INSERT INTO `{table}` ({column_sql}) VALUES ({placeholders}) "
        f"ON DUPLICATE KEY UPDATE {update_sql}"
    )
    values = [
        tuple(normalize_value(row.get(column), allowed[column]) for column in columns)
        for row in rows
    ]
    with connection.cursor() as cursor:
        cursor.executemany(query, values)
    return len(values)


def sqlite_rows(source: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    exists = source.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    if not exists:
        return []
    return [dict(row) for row in source.execute(f'SELECT * FROM "{table}"').fetchall()]


def json_rows(directory: Path, table: str) -> list[dict[str, Any]]:
    path = directory / f"{table}.json"
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        payload = payload.get("data", [])
    if not isinstance(payload, list) or any(not isinstance(row, dict) for row in payload):
        raise ValueError(f"{path} must contain a JSON row array")
    return payload


def truncate_target(connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        for table in reversed(TABLE_ORDER):
            cursor.execute(f"TRUNCATE TABLE `{table}`")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    connection.commit()


def migrate(sqlite_path: Path, json_dir: Path | None, truncate: bool) -> None:
    apply_schema()
    target = pymysql.connect(**mysql_options())
    source = None
    try:
        if truncate:
            truncate_target(target)
        if sqlite_path.exists():
            source = sqlite3.connect(sqlite_path)
            source.row_factory = sqlite3.Row
        elif not json_dir:
            raise FileNotFoundError(f"SQLite source not found: {sqlite_path}")

        total = 0
        for table in TABLE_ORDER:
            rows: list[dict[str, Any]] = []
            if source and table in SQLITE_CONTENT_TABLES:
                rows.extend(sqlite_rows(source, table))
            if json_dir:
                rows.extend(json_rows(json_dir, table))
            imported = upsert_rows(target, table, rows)
            target.commit()
            total += imported
            if imported:
                print(f"[+] {table}: {imported} rows")
        print(f"[+] Migration complete: {total} rows written to {database_name()}.")
    except Exception:
        target.rollback()
        raise
    finally:
        if source:
            source.close()
        target.close()


if __name__ == "__main__":
    load_dotenv(SERVER_DIR / ".env")
    arguments = parse_args()
    migrate(
        sqlite_path=arguments.sqlite.resolve(),
        json_dir=arguments.json_dir.resolve() if arguments.json_dir else None,
        truncate=arguments.truncate,
    )
