import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db


def generate_listening_migration():
    out_path = BASE_DIR / "migrations" / "20260915_02_seed_listening_practice_data.sql"
    print(f"Generating {out_path}...")

    with db.connection() as conn:
        categories = db.fetch_all("SELECT * FROM listening_categories ORDER BY order_index", use_cache=False)
        sets = db.fetch_all("SELECT * FROM listening_sets ORDER BY order_index", use_cache=False)
        sentences = db.fetch_all("SELECT * FROM listening_sentences ORDER BY set_id, order_index", use_cache=False)
        stats = db.fetch_all("SELECT * FROM listening_difficulty_stats", use_cache=False)

        lines = [
            "-- Migration: 20260915_02_seed_listening_practice_data.sql",
            "-- Description: Seed ETS 2026 listening categories, sets, sentences, and difficulty stats",
            "SET NAMES utf8mb4;",
            "START TRANSACTION;",
            "",
        ]

        # 1. Categories
        if categories:
            lines.append("-- 1. Listening Categories")
            cat_cols = list(categories[0].keys())
            cols_str = ", ".join(f"`{c}`" for c in cat_cols)
            val_clauses = []
            for row in categories:
                vals = [conn.escape(json.dumps(row[c], ensure_ascii=False) if isinstance(row[c], (dict, list)) else row[c]) for c in cat_cols]
                val_clauses.append(f"({', '.join(vals)})")
            update_clause = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in cat_cols if c != "id")
            lines.append(f"INSERT INTO `listening_categories` ({cols_str}) VALUES\n" + ",\n".join(val_clauses))
            lines.append(f"ON DUPLICATE KEY UPDATE {update_clause};")
            lines.append("")

        # 2. Sets
        if sets:
            lines.append("-- 2. Listening Sets")
            set_cols = list(sets[0].keys())
            cols_str = ", ".join(f"`{c}`" for c in set_cols)
            val_clauses = []
            for row in sets:
                vals = [conn.escape(json.dumps(row[c], ensure_ascii=False) if isinstance(row[c], (dict, list)) else row[c]) for c in set_cols]
                val_clauses.append(f"({', '.join(vals)})")
            update_clause = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in set_cols if c != "id")
            lines.append(f"INSERT INTO `listening_sets` ({cols_str}) VALUES\n" + ",\n".join(val_clauses))
            lines.append(f"ON DUPLICATE KEY UPDATE {update_clause};")
            lines.append("")

        # 3. Difficulty stats
        if stats:
            lines.append("-- 3. Listening Difficulty Stats")
            stat_cols = list(stats[0].keys())
            cols_str = ", ".join(f"`{c}`" for c in stat_cols)
            val_clauses = []
            for row in stats:
                vals = [conn.escape(json.dumps(row[c], ensure_ascii=False) if isinstance(row[c], (dict, list)) else row[c]) for c in stat_cols]
                val_clauses.append(f"({', '.join(vals)})")
            update_clause = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in stat_cols if c != "id")
            lines.append(f"INSERT INTO `listening_difficulty_stats` ({cols_str}) VALUES\n" + ",\n".join(val_clauses))
            lines.append(f"ON DUPLICATE KEY UPDATE {update_clause};")
            lines.append("")

        # 4. Sentences (in chunks of 50 to avoid max_allowed_packet limits)
        if sentences:
            lines.append("-- 4. Listening Sentences")
            sent_cols = list(sentences[0].keys())
            cols_str = ", ".join(f"`{c}`" for c in sent_cols)
            update_clause = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in sent_cols if c != "id")
            chunk_size = 50
            for i in range(0, len(sentences), chunk_size):
                chunk = sentences[i : i + chunk_size]
                val_clauses = []
                for row in chunk:
                    vals = [conn.escape(json.dumps(row[c], ensure_ascii=False) if isinstance(row[c], (dict, list)) else row[c]) for c in sent_cols]
                    val_clauses.append(f"({', '.join(vals)})")
                lines.append(f"INSERT INTO `listening_sentences` ({cols_str}) VALUES\n" + ",\n".join(val_clauses))
                lines.append(f"ON DUPLICATE KEY UPDATE {update_clause};")
            lines.append("")

        lines.append("COMMIT;")
        lines.append("")

    content = "\n".join(lines)
    out_path.write_text(content, encoding="utf-8")
    print(f"Generated {out_path} ({len(content)} characters, {len(sentences)} sentences).")


def generate_passage_sentence_pairs_migration():
    out_path = BASE_DIR / "migrations" / "20260916_02_seed_passage_sentence_pairs.sql"
    print(f"Generating {out_path}...")

    with db.connection() as conn:
        rows = db.fetch_all(
            "SELECT id, passage_sentence_pairs FROM passages WHERE passage_sentence_pairs IS NOT NULL ORDER BY id",
            use_cache=False,
        )

        lines = [
            "-- Migration: 20260916_02_seed_passage_sentence_pairs.sql",
            "-- Description: Seed bilingual passage sentence pairs for Part 6 and 7",
            "SET NAMES utf8mb4;",
            "START TRANSACTION;",
            "",
        ]

        for row in rows:
            p_id = conn.escape(row["id"])
            pairs_val = row["passage_sentence_pairs"]
            if isinstance(pairs_val, (dict, list)):
                pairs_str = json.dumps(pairs_val, ensure_ascii=False)
            elif isinstance(pairs_val, str):
                pairs_str = pairs_val
            else:
                continue
            pairs_esc = conn.escape(pairs_str)
            lines.append(f"UPDATE `passages` SET `passage_sentence_pairs` = {pairs_esc} WHERE `id` = {p_id};")

        lines.append("")
        lines.append("COMMIT;")
        lines.append("")

    content = "\n".join(lines)
    out_path.write_text(content, encoding="utf-8")
    print(f"Generated {out_path} ({len(content)} characters, {len(rows)} passages).")


if __name__ == "__main__":
    generate_listening_migration()
    generate_passage_sentence_pairs_migration()
