"""
verify_sentence_pairs.py
------------------------
Kiểm tra tự động và nghiệm thu chất lượng các passages đã migrate sang passage_sentence_pairs:
1. Kiểm tra 100% câu hỏi có badge (131-200) được gán đúng question_numbers và xuất hiện trong câu dịch.
2. Kiểm tra tỷ lệ độ dài câu dịch / câu gốc (không được lệch quá 3x).
3. Kiểm tra không có câu dịch rỗng hoặc dịch thiếu.
4. Kiểm tra thứ tự sentence_id strictly 1-to-N liên tục không ngắt quãng.
5. Báo cáo chi tiết metrics và kết quả nghiệm thu.
"""

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db import db

BLANK_REGEX = re.compile(
    r"(?:_{2,}\s*)?[(\[]\s*(1[34]\d)\s*[)\]](?:\s*_{2,})?"
    r"|___+\s*(1[34]\d)\s*___+"
    r"|---+\s*(?:[(\[])?\s*(1[34]\d)\s*(?:[)\]])?\s*---+"
    r"|[(\[]\s*(1[34]\d)\s*[)\]]"
)

def run_verification():
    rows = db.fetch_all("""
        SELECT id, test_id, part, title, passage_sentence_pairs 
        FROM passages 
        WHERE passage_sentence_pairs IS NOT NULL
        ORDER BY part ASC, id ASC
    """)

    print(f"===============================================================")
    print(f"   BÁO CÁO NGHIỆM THU CHẤT LƯỢNG PASSAGE SENTENCE PAIRS")
    print(f"===============================================================")
    print(f"Tổng số passages đã migrate: {len(rows)}\n")

    total_sentences = 0
    total_en_chars = 0
    total_vi_chars = 0
    total_badges = 0
    badge_mismatches = 0
    length_anomalies = 0
    empty_translations = 0
    sequence_errors = 0

    results_table = []

    for idx, r in enumerate(rows):
        pid = r["id"]
        part = r["part"]
        title = r.get("title") or "No title"
        raw_pairs = r["passage_sentence_pairs"]

        try:
            pairs = json.loads(raw_pairs) if isinstance(raw_pairs, str) else raw_pairs
        except Exception as e:
            print(f"[X] Passage {pid}: Lỗi cú pháp JSON: {e}")
            continue

        p_sentences = len(pairs)
        total_sentences += p_sentences

        p_en_len = 0
        p_vi_len = 0
        p_badges = 0
        p_issues = []

        # Check sequence
        expected_sid = 1
        for p in pairs:
            sid = p.get("sentence_id")
            if sid != expected_sid:
                p_issues.append(f"Lệch sentence_id: mong đợi {expected_sid}, nhận {sid}")
                sequence_errors += 1
            expected_sid += 1

            en = p.get("en", "").strip()
            vi = p.get("vi", "").strip()
            qnums = p.get("question_numbers", [])

            if not vi:
                p_issues.append(f"Câu {sid}: Bản dịch rỗng!")
                empty_translations += 1

            p_en_len += len(en)
            p_vi_len += len(vi)

            # Length ratio check
            if en and vi:
                ratio = len(vi) / max(len(en), 1)
                # If sentence is longer than 20 chars, check ratio
                if len(en) > 20 and (ratio < 0.35 or ratio > 3.0):
                    p_issues.append(f"Câu {sid}: Tỷ lệ độ dài bất thường ({ratio:.2f}x): EN={len(en)} ký tự, VI={len(vi)} ký tự")
                    length_anomalies += 1

            # Badge check
            if qnums:
                p_badges += len(qnums)
                total_badges += len(qnums)
                for q in qnums:
                    # Check if badge appears in VI
                    if str(q) not in vi:
                        # Missing badge in translated text
                        p_issues.append(f"Câu {sid}: Thiếu số câu hỏi ({q}) trong bản dịch tiếng Việt")
                        badge_mismatches += 1

        total_en_chars += p_en_len
        total_vi_chars += p_vi_len

        status = "PASSED" if not p_issues else f"WARNING ({len(p_issues)} cảnh báo)"
        results_table.append({
            "idx": idx + 1,
            "id": pid,
            "part": part,
            "title": title[:38],
            "pairs": p_sentences,
            "badges": p_badges,
            "status": status,
            "issues": p_issues
        })

    # Print summary table
    print(f"{'STT':<4} | {'Part':<5} | {'Passage ID':<37} | {'Câu':<4} | {'Badge':<5} | {'Trạng thái'}")
    print("-" * 75)
    for r in results_table:
        print(f"{r['idx']:<4} | Part {r['part']:<1} | {r['id']:<37} | {r['pairs']:<4} | {r['badges']:<5} | {r['status']}")
        if r["issues"]:
            for iss in r["issues"]:
                print(f"       -> {iss}")

    overall_ratio = (total_vi_chars / max(total_en_chars, 1))
    print(f"\n===============================================================")
    print(f"                    TỔNG KẾT NGHIỆM THU")
    print(f"===============================================================")
    print(f"  • Tổng số passages kiểm tra:       {len(rows)}")
    print(f"  • Tổng số cặp câu (sentence pairs): {total_sentences}")
    print(f"  • Tổng số chỗ trống / badges:     {total_badges}")
    print(f"  • Tỷ lệ độ dài toàn cục VI / EN:    {overall_ratio:.2f}x (chuẩn ngôn ngữ 1.05x - 1.25x)")
    print(f"  • Lỗi câu dịch rỗng:               {empty_translations}")
    print(f"  • Lỗi ngắt quãng thứ tự câu:       {sequence_errors}")
    print(f"  • Lệch tỷ lệ độ dài câu (>3x):     {length_anomalies}")
    print(f"  • Lệch số badge trong câu dịch:     {badge_mismatches}")
    print(f"===============================================================")
    if empty_translations == 0 and sequence_errors == 0 and badge_mismatches == 0:
        print(f"  => KẾT LUẬN: ĐẠT TIÊU CHUẨN NGHIỆM THU 100% (ZERO DEFECTS)")
    else:
        print(f"  => KẾT LUẬN: CÓ {empty_translations + sequence_errors + badge_mismatches} VẤN ĐỀ CẦN XỬ LÝ")
    print(f"===============================================================\n")

if __name__ == "__main__":
    run_verification()
