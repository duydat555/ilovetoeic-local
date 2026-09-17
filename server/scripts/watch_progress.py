"""
watch_progress.py
-----------------
Theo dõi trực tiếp tiến trình dịch song ngữ Reading Passages (Part 6 & Part 7).
Hiển thị thống kê DB thực tế và stream log thời gian thực.

Cách chạy:
    cd C:\android-server\toeic-website\server
    python scripts/watch_progress.py
"""

import glob
import os
import sys
import time
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db


def find_latest_log() -> Path:
    base_brain = Path(r"C:\Users\GAMING F15\.gemini\antigravity-cli\brain")
    log_files = glob.glob(str(base_brain / "*" / ".system_generated" / "tasks" / "task-*.log"))
    if not log_files:
        return None
    # Sort by modification time, newest first
    log_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return Path(log_files[0])


def print_db_summary():
    try:
        rows = db.fetch_all("""
            SELECT 
                part,
                COUNT(*) as total,
                SUM(CASE WHEN passage_sentence_pairs IS NOT NULL THEN 1 ELSE 0 END) as done
            FROM passages
            WHERE part IN (6, 7)
            GROUP BY part
            ORDER BY part ASC
        """)
        tot = db.fetch_one("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN passage_sentence_pairs IS NOT NULL THEN 1 ELSE 0 END) as done
            FROM passages
            WHERE part IN (6, 7)
        """)

        print("\n" + "=" * 60)
        print("📊 TIẾN ĐỘ THỰC TẾ TRONG DATABASE (MySQL toeic_db):")
        print("-" * 60)
        for r in rows:
            p = r["part"]
            total = r["total"]
            done = int(r["done"] or 0)
            pct = done * 100.0 / total if total > 0 else 0
            status_icon = "🟢 Xong 100%" if done == total else "🟡 Đang chạy"
            print(f"  • Part {p}: {done:>4}/{total:<4} ({pct:>5.1f}%)  [{status_icon}]")

        total_all = tot["total"]
        done_all = int(tot["done"] or 0)
        pct_all = done_all * 100.0 / total_all if total_all > 0 else 0
        print("-" * 60)
        print(f"  ⭐️ TỔNG CỘNG: {done_all:>4}/{total_all:<4} ({pct_all:>5.1f}%)")
        print("=" * 60 + "\n")
    except Exception as e:
        print(f"[!] Không thể đọc thống kê DB: {e}\n")


def stream_log(log_path: Path):
    print(f"🔴 Đang stream log trực tiếp từ:\n   {log_path}\n(Nhấn Ctrl+C để thoát bất kỳ lúc nào)\n")
    print("-" * 60)

    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            # Read and show the last 20 lines
            lines = f.readlines()
            tail_lines = lines[-20:] if len(lines) > 20 else lines
            for line in tail_lines:
                sys.stdout.write(line)
            sys.stdout.flush()

            # Now stream new lines as they arrive
            while True:
                line = f.readline()
                if line:
                    sys.stdout.write(line)
                    sys.stdout.flush()
                else:
                    time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n\n[✓] Đã dừng theo dõi log.")


def main():
    print_db_summary()
    latest_log = find_latest_log()
    if not latest_log or not latest_log.exists():
        print("[!] Chưa tìm thấy file log tiến trình nào đang chạy.")
        return
    stream_log(latest_log)


if __name__ == "__main__":
    main()
