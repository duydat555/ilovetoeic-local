"""
import_translated_passages.py
-------------------------------
Nhập kết quả dịch song ngữ từ Google Colab (translated_passages.json) vào MySQL.
Tuân thủ nghiêm ngặt quy định an toàn production (docs/agents/database.md):
1. Kiểm tra cấu trúc & schema hợp lệ trước khi chạm vào DB.
2. Tự động sao lưu dữ liệu hiện tại của các passage liên quan ra server/backups/.
3. Cập nhật passages.passage_sentence_pairs an toàn theo transaction.
4. Kiểm tra đối soát toàn vẹn dữ liệu (verify) sau khi nhập.
"""

import argparse
import datetime
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Ensure stdout handles UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db
from scripts.translate_sentence_pairs import verify_stored_sentence_pairs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("import_passages")


def backup_existing_passages(passage_ids: List[str], backup_dir: Path) -> Path:
    """Tạo bản backup JSON của các passage trước khi ghi đè, tuân thủ database.md."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"passages_backup_{timestamp}.json"

    placeholders = ",".join(["%s"] * len(passage_ids))
    rows = db.fetch_all(
        f"SELECT id, test_id, part, title, passage_sentence_pairs FROM passages WHERE id IN ({placeholders})",
        tuple(passage_ids),
    )

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    logger.info(f"[BACKUP AN TOÀN] Đã lưu snapshot {len(rows)} passage trước khi update vào: {backup_file}")
    return backup_file


def validate_entry(entry: Dict[str, Any]) -> Tuple[bool, str]:
    if not isinstance(entry, dict):
        return False, "Bản ghi không phải là dictionary"
    pid = entry.get("id")
    if not pid:
        return False, "Thiếu id của passage"
    pairs = entry.get("passage_sentence_pairs")
    if not isinstance(pairs, list):
        return False, f"Passage {pid}: passage_sentence_pairs phải là list"
    if len(pairs) == 0:
        return False, f"Passage {pid}: Danh sách câu dịch bị rỗng"

    for p in pairs:
        if not isinstance(p, dict):
            return False, f"Passage {pid}: Item câu không phải dictionary"
        if "sentence_id" not in p or "en" not in p or "vi" not in p:
            return False, f"Passage {pid}: Item câu thiếu các trường bắt buộc (sentence_id, en, vi)"
        if not str(p.get("vi", "")).strip():
            return False, f"Passage {pid}: Câu #{p.get('sentence_id')} có bản dịch vi bị rỗng"

    return True, "OK"


def import_passages(
    input_file: Path,
    dry_run: bool = False,
    force: bool = False,
) -> bool:
    if not input_file.exists():
        logger.error(f"Không tìm thấy file kết quả từ Colab: {input_file}")
        return False

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        logger.error(f"Dữ liệu trong {input_file} phải là một JSON array!")
        return False

    logger.info(f"Đọc {len(data)} passage từ file {input_file.name}...")

    # BƯỚC 1: Validate toàn bộ dữ liệu trước khi đụng vào DB
    invalid_count = 0
    valid_entries: List[Dict[str, Any]] = []
    for entry in data:
        is_ok, reason = validate_entry(entry)
        if not is_ok:
            logger.warning(f"Bản ghi không hợp lệ: {reason}")
            invalid_count += 1
            continue
        valid_entries.append(entry)

    logger.info(f"Kiểm tra hợp lệ: {len(valid_entries)} hợp lệ, {invalid_count} không hợp lệ.")
    if not valid_entries:
        logger.error("Không có bản ghi nào hợp lệ để nhập vào DB!")
        return False

    # BƯỚC 2: Kiểm tra sự tồn tại trong DB
    target_ids = [e["id"] for e in valid_entries]
    placeholders = ",".join(["%s"] * len(target_ids))
    db_rows = db.fetch_all(
        f"SELECT id, passage_sentence_pairs FROM passages WHERE id IN ({placeholders})",
        tuple(target_ids),
    )
    existing_map = {r["id"]: r.get("passage_sentence_pairs") for r in db_rows}

    to_update = []
    skipped_existing = 0
    for e in valid_entries:
        pid = e["id"]
        if pid not in existing_map:
            logger.warning(f"Passage ID {pid} không tồn tại trong DB, bỏ qua.")
            continue
        if existing_map[pid] is not None and not force:
            skipped_existing += 1
            continue
        to_update.append(e)

    logger.info(f"Passage sẽ được cập nhật: {len(to_update)} | Đã có sẵn bị bỏ qua: {skipped_existing}")

    if not to_update:
        logger.info("Không có passage nào cần cập nhật.")
        return True

    if dry_run:
        logger.info("[DRY-RUN] Chế độ chạy thử nghiệm: Không ghi vào DB.")
        for e in to_update[:3]:
            pairs = e["passage_sentence_pairs"]
            logger.info(f"  Sample passage {e['id']} ({len(pairs)} câu):")
            for p in pairs[:2]:
                logger.info(f"    #{p['sentence_id']} [EN]: {p['en']}")
                logger.info(f"    #{p['sentence_id']} [VI]: {p['vi']}")
        return True

    # BƯỚC 3: Backup an toàn trước khi ghi
    backup_dir = BASE_DIR / "backups"
    backup_existing_passages([e["id"] for e in to_update], backup_dir)

    # BƯỚC 4: Cập nhật DB
    updated_count = 0
    fail_count = 0
    for e in to_update:
        pid = e["id"]
        pairs_json = json.dumps(e["passage_sentence_pairs"], ensure_ascii=False)
        try:
            db.execute(
                "UPDATE passages SET passage_sentence_pairs = %s WHERE id = %s",
                (pairs_json, pid),
            )
            updated_count += 1
        except Exception as err:
            logger.error(f"Lỗi khi cập nhật passage {pid}: {err}")
            fail_count += 1

    logger.info(f"==================================================")
    logger.info(f"Nhập dữ liệu hoàn tất: {updated_count} thành công, {fail_count} lỗi.")
    logger.info(f"==================================================")

    # BƯỚC 5: Chạy đối soát verify integrity
    logger.info("Đang chạy đối soát tính toàn vẹn dữ liệu sau khi nhập...")
    verify_stored_sentence_pairs()

    return fail_count == 0


def main():
    parser = argparse.ArgumentParser(description="Nhập kết quả dịch từ Google Colab vào MySQL an toàn.")
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        default="translated_passages.json",
        help="Đường dẫn tới file translated_passages.json tải về từ Colab (mặc định: translated_passages.json).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Kiểm tra dữ liệu mà không ghi vào DB.")
    parser.add_argument("--force", action="store_true", help="Ghi đè cả các passage đã có passage_sentence_pairs.")

    args = parser.parse_args()
    in_path = Path(args.input)
    if not in_path.is_absolute():
        in_path = BASE_DIR / in_path

    import_passages(in_path, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
