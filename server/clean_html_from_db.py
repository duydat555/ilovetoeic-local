"""
Script làm sạch toàn bộ mã HTML/CSS rác trong bảng passages của toeic.db và cập nhật chuẩn dữ liệu thô.
"""

import sys
import os
import re
import html
import sqlite3
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent
SQLITE_DB = BASE_DIR / "toeic.db"

def clean_passage_html(text: str | None) -> str | None:
    if not text or not isinstance(text, str):
        return text

    # Unescape HTML entities
    clean = html.unescape(text)
    clean = clean.replace("\xa0", " ").replace("&nbsp;", " ")

    # Replace line breaks and paragraph closings with newlines
    clean = re.sub(r'<br\s*/?>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</p\s*>', '\n\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</div\s*>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</tr>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'</td>', ' ', clean, flags=re.IGNORECASE)

    # Strip all remaining HTML tags
    clean = re.sub(r'<[^>]+>', '', clean)

    # Normalize empty lines and leading/trailing whitespace
    lines = [line.strip() for line in clean.split('\n')]
    cleaned_text = '\n'.join([line for line in lines if line])

    return cleaned_text

def main():
    if not SQLITE_DB.exists():
        print(f"[!] LOI: Khong tim thay {SQLITE_DB}")
        return

    print("[+] Dang lam sach ma HTML/CSS trong bang passages...")
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()

    cursor.execute("SELECT id, passage_text, passage_text_2, passage_text_3 FROM passages")
    p_rows = cursor.fetchall()
    cleaned_count = 0

    for p_id, p1, p2, p3 in p_rows:
        np1 = clean_passage_html(p1)
        np2 = clean_passage_html(p2)
        np3 = clean_passage_html(p3)

        if (np1, np2, np3) != (p1, p2, p3):
            cursor.execute("UPDATE passages SET passage_text = ?, passage_text_2 = ?, passage_text_3 = ? WHERE id = ?", (np1, np2, np3, p_id))
            cleaned_count += 1

    conn.commit()
    conn.close()

    print("=" * 60)
    print(f"[+] THANH CONG! Da lam sach ma HTML/CSS cho {cleaned_count} bai doc trong toeic.db.")
    print("=" * 60)

if __name__ == "__main__":
    main()
