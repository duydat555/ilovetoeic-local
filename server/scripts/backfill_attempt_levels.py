import argparse
import json
import logging
import os
import sys
import time

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("backfill_attempt_levels")


def backfill_attempt_levels(batch_size: int = 1000, dry_run: bool = False) -> dict:
    start_time = time.time()
    logger.info("Starting attempt level backfill (batch_size=%d, dry_run=%s)", batch_size, dry_run)

    # Count total candidate rows
    count_row = db.fetch_one(
        """
        SELECT COUNT(*) AS total
        FROM test_attempts
        WHERE level IS NULL
          AND (
            JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) = 'level_practice'
            OR JSON_EXTRACT(metadata, '$.selected_level') IS NOT NULL
          )
        """,
        use_cache=False,
    )
    total_candidates = (count_row or {}).get("total", 0)
    logger.info("Found %d candidate test_attempts to backfill", total_candidates)

    if total_candidates == 0:
        logger.info("No rows require backfill. All caught up!")
        return {"total_candidates": 0, "updated": 0, "skipped": 0, "elapsed_seconds": 0}

    total_updated = 0
    total_skipped = 0
    last_id = ""

    while True:
        # Fetch next batch using primary key cursor pagination to prevent OFFSET performance hit
        rows = db.fetch_all(
            """
            SELECT id, metadata
            FROM test_attempts
            WHERE level IS NULL
              AND id > ?
              AND (
                JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) = 'level_practice'
                OR JSON_EXTRACT(metadata, '$.selected_level') IS NOT NULL
              )
            ORDER BY id ASC
            LIMIT ?
            """,
            (last_id, batch_size),
            use_cache=False,
        )

        if not rows:
            break

        updates = []
        for row in rows:
            attempt_id = str(row["id"])
            last_id = attempt_id

            raw_meta = row.get("metadata")
            level_val = None
            if isinstance(raw_meta, dict):
                meta = raw_meta
            elif isinstance(raw_meta, str):
                try:
                    meta = json.loads(raw_meta)
                except Exception:
                    meta = {}
            else:
                meta = {}

            raw_level = meta.get("selected_level") or meta.get("level")
            if raw_level is not None:
                try:
                    level_val = int(raw_level)
                    if 1 <= level_val <= 5:
                        updates.append((level_val, attempt_id))
                    else:
                        total_skipped += 1
                except (ValueError, TypeError):
                    total_skipped += 1
            else:
                total_skipped += 1

        if updates and not dry_run:
            with db.transaction() as conn:
                with conn.cursor() as cursor:
                    cursor.executemany(
                        "UPDATE test_attempts SET level = %s WHERE id = %s",
                        updates,
                    )
            total_updated += len(updates)
            logger.info("Progress: updated %d / %d rows", total_updated, total_candidates)
        elif updates and dry_run:
            total_updated += len(updates)
            logger.info("[Dry Run] Would update %d rows in this batch", len(updates))

    elapsed = time.time() - start_time
    logger.info(
        "Backfill completed in %.2fs: %d updated, %d skipped out of %d candidates",
        elapsed,
        total_updated,
        total_skipped,
        total_candidates,
    )
    return {
        "total_candidates": total_candidates,
        "updated": total_updated,
        "skipped": total_skipped,
        "elapsed_seconds": elapsed,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill level column on test_attempts")
    parser.add_argument("--batch-size", type=int, default=1000, help="Batch size per transaction (default 1000)")
    parser.add_argument("--dry-run", action="store_true", help="Preview updates without writing to DB")
    args = parser.parse_args()

    backfill_attempt_levels(batch_size=args.batch_size, dry_run=args.dry_run)
