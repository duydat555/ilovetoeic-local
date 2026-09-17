"""
export_untranslated_passages.py
-------------------------------
Xuất các reading passages (Part 6 & 7) chưa có bản dịch song ngữ ra file JSON
để upload lên Google Colab dịch bằng GPU T4 siêu tốc.

Các item câu (en) được parse sẵn theo đúng chuẩn BeautifulSoup & regex của pipeline,
giúp Colab chỉ việc nạp prompt dịch LLM mà không cần lo về parsing logic.
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db
from scripts.translate_sentence_pairs import parse_passage_to_items

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("export_passages")


def export_passages(
    output_path: Path,
    part: int = None,
    limit: int = None,
    test_id: str = None,
    force_all: bool = False,
) -> int:
    query = "SELECT id, test_id, part, title, passage_text, passage_sentence_pairs FROM passages WHERE part IN (6, 7)"
    params = []

    if not force_all:
        query += " AND passage_sentence_pairs IS NULL"

    if part:
        query += " AND part = %s"
        params.append(part)

    if test_id:
        query += " AND test_id = %s"
        params.append(test_id)

    query += " ORDER BY part ASC, id ASC"

    if limit:
        query += f" LIMIT {limit}"

    logger.info(f"Đang truy vấn cơ sở dữ liệu MySQL...")
    rows = db.fetch_all(query, tuple(params))
    logger.info(f"Tìm thấy {len(rows)} passage cần xử lý.")

    if not rows:
        logger.info("Không có passage nào cần xuất. Tất cả đã được dịch!")
        return 0

    exported_data: List[Dict[str, Any]] = []
    total_items_count = 0
    skipped_empty = 0

    for row in rows:
        pid = row["id"]
        title = row.get("title") or ""
        html = row.get("passage_text") or ""

        if not html.strip():
            logger.warning(f"Passage {pid} rỗng passage_text, bỏ qua.")
            skipped_empty += 1
            continue

        items = parse_passage_to_items(html)
        if not items:
            logger.warning(f"Passage {pid} parse ra 0 items, bỏ qua.")
            skipped_empty += 1
            continue

        total_items_count += len(items)
        exported_data.append({
            "id": pid,
            "test_id": row.get("test_id"),
            "part": row.get("part"),
            "title": title,
            "items": items,
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(exported_data, f, ensure_ascii=False, indent=2)

    logger.info(f"==================================================")
    logger.info(f"Xuất thành công {len(exported_data)} passages ra: {output_path}")
    logger.info(f"Tổng số câu/item cần dịch: {total_items_count:,} câu")
    logger.info(f"Trung bình: {total_items_count / max(1, len(exported_data)):.1f} câu/passage")
    if skipped_empty:
        logger.warning(f"Bỏ qua {skipped_empty} passage rỗng hoặc không parse được câu.")
    logger.info(f"==================================================")
    return len(exported_data)


def main():
    parser = argparse.ArgumentParser(description="Xuất reading passages chưa dịch ra file JSON cho Google Colab.")
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="untranslated_passages.json",
        help="Đường dẫn file JSON xuất ra (mặc định: untranslated_passages.json trong thư mục server).",
    )
    parser.add_argument("--part", type=int, choices=[6, 7], default=None, help="Chỉ xuất Part 6 hoặc Part 7.")
    parser.add_argument("--limit", type=int, default=None, help="Giới hạn số lượng passage xuất.")
    parser.add_argument("--test-id", type=str, default=None, help="Chỉ xuất passage của một test cụ thể.")
    parser.add_argument("--force-all", action="store_true", help="Xuất cả những passage đã có bản dịch.")

    args = parser.parse_args()
    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = BASE_DIR / out_path

    export_passages(
        output_path=out_path,
        part=args.part,
        limit=args.limit,
        test_id=args.test_id,
        force_all=args.force_all,
    )


if __name__ == "__main__":
    main()
