#!/usr/bin/env python3
"""
Backfill XP Hồi Tố & Điều Chỉnh Bảng Xếp Hạng
=============================================
Thực thi quy đổi XP hồi tố công bằng cho học viên dựa trên lịch sử học tập:
- Thành phần A: Luyện câu hỏi (Practice + Grammar + Missing legacy exam questions). Áp trần Level 10 (XP < 6,600).
- Thành phần B: Full Test (mode = 'exam') theo đúng công thức live (100 + total_score // 10 hoặc +30). Không áp trần.
- Thành phần C: Streak Milestones (3, 7, 14, 30, 60, 100, 200, 365 ngày) theo longest_streak. Không áp trần.

Modes:
  --dry-run (mặc định): Tính toán và in bảng báo cáo toàn bộ học viên, KHÔNG ghi vào DB.
  --apply: Thực hiện ghi sổ cái XP, cập nhật users.xp / users.level và gửi thông báo tri ân.
  --rollback: Xóa các bản ghi hồi tố v1 và tính toán lại users.xp / level từ ledger.
  --remote: Thực thi trực tiếp trên Production VPS thông qua SSH.
"""

import argparse
import io
import json
import os
import subprocess
import sys
import uuid
from typing import Any, Dict, List, Optional, Tuple

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SSH_KEY = r"C:\Users\GAMING F15\.ssh\id_ed25519_github_actions_vps"
REMOTE_HOST = "root@160.191.55.140"

LEVEL_CAP_XP = 6599  # Level 10 cap: level 11 starts at 6600 XP

STREAK_MILESTONES = [
    (3, 50),
    (7, 100),
    (14, 200),
    (30, 500),
    (60, 1000),
    (100, 2000),
    (200, 3000),
    (365, 5000),
]


class DatabaseClient:
    def __init__(self, is_remote: bool):
        self.is_remote = is_remote
        if not is_remote:
            from app.db import db
            self.local_db = db

    def query(self, sql: str, params: Tuple = ()) -> List[Dict[str, Any]]:
        if not self.is_remote:
            return self.local_db.fetch_all(sql, params, use_cache=False)
        
        # Format query for remote mysql
        formatted_sql = sql
        if params:
            escaped_params = []
            for p in params:
                if p is None:
                    escaped_params.append("NULL")
                elif isinstance(p, (int, float)):
                    escaped_params.append(str(p))
                else:
                    s = str(p).replace("\\", "\\\\").replace("'", "\\'")
                    escaped_params.append(f"'{s}'")
            # Replace %s or ? with params
            parts = formatted_sql.split("?")
            if len(parts) == 1 and "%s" in formatted_sql:
                parts = formatted_sql.split("%s")
            if len(parts) - 1 == len(escaped_params):
                res = []
                for i, part in enumerate(parts[:-1]):
                    res.append(part)
                    res.append(escaped_params[i])
                res.append(parts[-1])
                formatted_sql = "".join(res)

        cmd = [
            "ssh", "-i", SSH_KEY,
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            REMOTE_HOST,
            f"mysql -u root toeic_db --default-character-set=utf8mb4 -B -e {json.dumps(formatted_sql)}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"Remote MySQL query error: {res.stderr}")
        
        lines = [line.strip().split("\t") for line in res.stdout.splitlines() if line.strip() and not line.startswith("PAGER set")]
        if not lines:
            return []
        headers = lines[0]
        rows = []
        for r in lines[1:]:
            if len(r) == len(headers):
                rows.append(dict(zip(headers, r)))
            else:
                # Pad or truncate if split mismatch
                row_dict = {}
                for idx, h in enumerate(headers):
                    row_dict[h] = r[idx] if idx < len(r) else ""
                rows.append(row_dict)
        return rows

    def execute(self, sql: str, params: Tuple = ()) -> int:
        if not self.is_remote:
            return self.local_db.execute(sql, params)
        
        formatted_sql = sql
        if params:
            escaped_params = []
            for p in params:
                if p is None:
                    escaped_params.append("NULL")
                elif isinstance(p, (int, float)):
                    escaped_params.append(str(p))
                else:
                    s = str(p).replace("\\", "\\\\").replace("'", "\\'")
                    escaped_params.append(f"'{s}'")
            parts = formatted_sql.split("?")
            if len(parts) == 1 and "%s" in formatted_sql:
                parts = formatted_sql.split("%s")
            if len(parts) - 1 == len(escaped_params):
                res = []
                for i, part in enumerate(parts[:-1]):
                    res.append(part)
                    res.append(escaped_params[i])
                res.append(parts[-1])
                formatted_sql = "".join(res)

        cmd = [
            "ssh", "-i", SSH_KEY,
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            REMOTE_HOST,
            f"mysql -u root toeic_db --default-character-set=utf8mb4 -e {json.dumps(formatted_sql)}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"Remote MySQL execute error: {res.stderr}")
        return 1

    def execute_script(self, sql_script: str) -> None:
        if not self.is_remote:
            statements = [s.strip() for s in sql_script.split(";") if s.strip()]
            with self.local_db.transaction() as conn:
                with conn.cursor() as cursor:
                    for stmt in statements:
                        cursor.execute(stmt)
            return

        cmd = [
            "ssh", "-i", SSH_KEY,
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=no",
            REMOTE_HOST,
            "mysql -u root toeic_db --default-character-set=utf8mb4"
        ]
        res = subprocess.run(cmd, input=sql_script, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError(f"Remote script execution error: {res.stderr}")


def load_level_definitions(client: DatabaseClient) -> List[Dict[str, Any]]:
    rows = client.query("SELECT level, xp_required, title, badge_icon, color FROM level_definitions ORDER BY level ASC")
    levels = []
    for r in rows:
        levels.append({
            "level": int(r["level"]),
            "xp_required": int(r["xp_required"]),
            "title": r["title"],
            "badge_icon": r.get("badge_icon", ""),
            "color": r.get("color", "")
        })
    return levels


def get_level_info(xp: int, levels: List[Dict[str, Any]]) -> Tuple[int, str]:
    safe_xp = max(0, int(xp or 0))
    current_level = levels[0]["level"]
    current_title = levels[0]["title"]
    for lvl in levels:
        if safe_xp >= lvl["xp_required"]:
            current_level = lvl["level"]
            current_title = lvl["title"]
        else:
            break
    return current_level, current_title


def compute_retroactive_xp(client: DatabaseClient, levels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Tính toán đầy đủ 3 thành phần A, B, C cho tất cả học viên."""
    
    # 1. Lấy danh sách tất cả học viên
    students_raw = client.query("""
        SELECT id, full_name, xp, level, total_questions_answered, total_correct_answers, streak_days, longest_streak
        FROM users
        WHERE role = 'student'
        ORDER BY total_questions_answered DESC, full_name ASC
    """)
    students = {}
    for s in students_raw:
        uid = s["id"]
        students[uid] = {
            "id": uid,
            "full_name": s["full_name"],
            "current_xp": int(s.get("xp") or 0),
            "current_level": int(s.get("level") or 1),
            "total_questions": int(s.get("total_questions_answered") or 0),
            "total_correct": int(s.get("total_correct_answers") or 0),
            "streak_days": int(s.get("streak_days") or 0),
            "longest_streak": int(s.get("longest_streak") or 0),
            # Thành phần A
            "practice_correct": 0,
            "practice_wrong": 0,
            "raw_practice_xp": 0,
            "practice_grant": 0,
            # Thành phần B
            "fulltest_bonus": 0,
            "fulltest_entries": [],
            # Thành phần C
            "streak_bonus": 0,
            "streak_entries": [],
            # Tổng kết
            "total_grant": 0,
            "new_xp": int(s.get("xp") or 0),
            "new_level": int(s.get("level") or 1),
            "new_level_title": "",
        }

    # 2. Thành phần A - user_question_activity chưa có trong ledger
    uqa_rows = client.query("""
        SELECT uqa.user_id,
               SUM(CASE WHEN uqa.is_correct = 1 THEN 1 ELSE 0 END) AS correct_cnt,
               SUM(CASE WHEN uqa.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_cnt
        FROM user_question_activity uqa
        LEFT JOIN user_xp_ledger lg
          ON lg.dedupe_key = CONCAT('xp:q:', uqa.attempt_id, ':', uqa.question_id)
        WHERE lg.id IS NULL
        GROUP BY uqa.user_id
    """)
    for r in uqa_rows:
        uid = r["user_id"]
        if uid in students:
            students[uid]["practice_correct"] += int(r.get("correct_cnt") or 0)
            students[uid]["practice_wrong"] += int(r.get("wrong_cnt") or 0)

    # 3. Thành phần A - user_grammar_question_activity chưa có trong ledger
    gqa_rows = client.query("""
        SELECT ugqa.user_id,
               SUM(CASE WHEN ugqa.is_correct = 1 THEN 1 ELSE 0 END) AS correct_cnt,
               SUM(CASE WHEN ugqa.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_cnt
        FROM user_grammar_question_activity ugqa
        LEFT JOIN user_xp_ledger lg
          ON lg.dedupe_key = CONCAT('xp:q:', ugqa.attempt_id, ':', ugqa.question_id)
        WHERE lg.id IS NULL
        GROUP BY ugqa.user_id
    """)
    for r in gqa_rows:
        uid = r["user_id"]
        if uid in students:
            students[uid]["practice_correct"] += int(r.get("correct_cnt") or 0)
            students[uid]["practice_wrong"] += int(r.get("wrong_cnt") or 0)

    # 4. Thành phần A - Bù đắp cho các bài test_attempts (mode = 'exam') chưa từng có chi tiết trong user_question_activity
    # (Đặc biệt xử lý các bài thi cũ trước 11/08/2026 của Ngoc_K35, Tân_K38, Phúc_K38)
    legacy_exam_rows = client.query("""
        SELECT ta.user_id,
               SUM(ta.correct_answers) as legacy_correct,
               SUM(GREATEST(0, ta.answered_questions - ta.correct_answers)) as legacy_wrong
        FROM test_attempts ta
        WHERE ta.mode = 'exam'
          AND NOT EXISTS (
              SELECT 1 FROM user_question_activity uqa
              WHERE uqa.user_id = ta.user_id AND uqa.attempt_id = ta.id
          )
        GROUP BY ta.user_id
    """)
    for r in legacy_exam_rows:
        uid = r["user_id"]
        if uid in students:
            c = int(r.get("legacy_correct") or 0)
            w = int(r.get("legacy_wrong") or 0)
            students[uid]["practice_correct"] += c
            students[uid]["practice_wrong"] += w

    # 5. Thành phần B - Full Test (mode = 'exam') chưa nhận XP hoàn thành đề
    ft_rows = client.query("""
        SELECT ta.id AS attempt_id, ta.user_id, ta.total_questions, ta.total_score,
               COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ta.metadata, '$.test_name')), 'Đề thi TOEIC') as test_name
        FROM test_attempts ta
        LEFT JOIN user_xp_ledger lg ON lg.dedupe_key = CONCAT('xp:test:', ta.id)
        WHERE ta.mode = 'exam' AND lg.id IS NULL
    """)
    for r in ft_rows:
        uid = r["user_id"]
        if uid in students:
            tq = int(r.get("total_questions") or 0)
            score = int(r.get("total_score") or 0)
            attempt_id = r["attempt_id"]
            test_name = r.get("test_name") or "Đề thi TOEIC"

            if tq >= 200:
                bonus = 100 + max(0, score // 10)
                desc = f"Hoàn thành đề thi full: {test_name} (+{bonus} XP)"
            else:
                bonus = 30
                desc = f"Hoàn thành phần thi: {test_name}"

            students[uid]["fulltest_bonus"] += bonus
            students[uid]["fulltest_entries"].append({
                "attempt_id": attempt_id,
                "bonus": bonus,
                "desc": desc,
                "dedupe_key": f"xp:test:{attempt_id}",
            })

    # 6. Thành phần C - Streak Milestone theo longest_streak
    existing_streaks = client.query("SELECT user_id, dedupe_key FROM user_xp_ledger WHERE activity_type = 'streak_milestone'")
    awarded_streak_keys = {r["dedupe_key"] for r in existing_streaks if r.get("dedupe_key")}

    for uid, s in students.items():
        max_streak = s["longest_streak"]
        for days, bonus in STREAK_MILESTONES:
            if max_streak >= days:
                key = f"xp:streak:{uid}:{days}"
                if key not in awarded_streak_keys:
                    s["streak_bonus"] += bonus
                    s["streak_entries"].append({
                        "days": days,
                        "bonus": bonus,
                        "desc": f"Đạt mốc chuỗi học {days} ngày liên tiếp",
                        "dedupe_key": key,
                    })

    # 7. Áp trần cho Thành phần A & Tính tổng grant cuối cùng
    for uid, s in students.items():
        # raw practice: đúng * 5 + sai * 1
        s["raw_practice_xp"] = s["practice_correct"] * 5 + s["practice_wrong"] * 1
        
        uncapped_bonus = s["fulltest_bonus"] + s["streak_bonus"]
        # Trần Level 10 (6,599 XP): room_for_practice = max(0, 6599 - current_xp - uncapped_bonus)
        room_for_practice = max(0, LEVEL_CAP_XP - s["current_xp"] - uncapped_bonus)
        s["practice_grant"] = min(s["raw_practice_xp"], room_for_practice)

        s["total_grant"] = s["practice_grant"] + uncapped_bonus
        s["new_xp"] = s["current_xp"] + s["total_grant"]
        
        new_lvl, new_title = get_level_info(s["new_xp"], levels)
        s["new_level"] = new_lvl
        s["new_level_title"] = new_title

    return list(students.values())


def print_dry_run_report(results: List[Dict[str, Any]]) -> None:
    """In bảng thống kê chi tiết theo format chuẩn để kiểm tra và duyệt."""
    print("\n" + "=" * 138)
    print(" BÁO CÁO DRY-RUN QUY ĐỔI XP HỒI TỐ TOÀN HỆ THỐNG (79 HỌC VIÊN)")
    print("=" * 138)
    header = f"{'STT':<4} {'Học viên':<18} {'XP Cũ':<7} {'Lvl Cũ':<7} {'A: Practice Raw':<16} {'A: Cấp (Cap)':<13} {'B: Test':<8} {'C: Streak':<10} {'Tổng Grant':<11} {'XP Mới':<8} {'Lvl Mới':<8} {'Danh hiệu mới'}"
    print(header)
    print("-" * 138)

    # Sort by new_xp DESC
    sorted_res = sorted(results, key=lambda x: (-x["new_xp"], -x["total_questions"], x["full_name"]))

    total_practice_raw = sum(r["raw_practice_xp"] for r in results)
    total_practice_granted = sum(r["practice_grant"] for r in results)
    total_fulltest = sum(r["fulltest_bonus"] for r in results)
    total_streak = sum(r["streak_bonus"] for r in results)
    grand_total_granted = sum(r["total_grant"] for r in results)

    capped_count = 0

    for idx, r in enumerate(sorted_res, 1):
        is_capped = r["raw_practice_xp"] > r["practice_grant"]
        if is_capped:
            capped_count += 1
        cap_flag = f"{r['practice_grant']}*" if is_capped else str(r['practice_grant'])
        line = (
            f"{idx:<4} "
            f"{r['full_name']:<18} "
            f"{r['current_xp']:<7} "
            f"Lvl {r['current_level']:<3} "
            f"{r['raw_practice_xp']:<16} "
            f"{cap_flag:<13} "
            f"{r['fulltest_bonus']:<8} "
            f"{r['streak_bonus']:<10} "
            f"{'+' + str(r['total_grant']):<11} "
            f"{r['new_xp']:<8} "
            f"Lvl {r['new_level']:<3} "
            f"{r['new_level_title']}"
        )
        print(line)

    print("-" * 138)
    print(f"TỔNG CỘNG: {len(results)} học viên")
    print(f"  • Tổng Practice Raw XP tính được: {total_practice_raw:,} XP")
    print(f"  • Tổng Practice XP sau áp trần Level 10: {total_practice_granted:,} XP (Có {capped_count} học viên chạm trần Level 10)")
    print(f"  • Tổng Full Test Bonus: {total_fulltest:,} XP")
    print(f"  • Tổng Streak Milestone Bonus: {total_streak:,} XP")
    print(f"  • TỔNG XP QUY ĐỔI HỒI TỐ SẼ CẤP: {grand_total_granted:,} XP")
    print("=" * 138)
    print("(*) Dấu hoa thị: Học viên bị áp trần Level 10 (< 6,600 XP) cho phần luyện tập.\n")


def apply_backfill(client: DatabaseClient, results: List[Dict[str, Any]]) -> None:
    """Thực hiện ghi thật vào Database theo giao thức Idempotent an toàn."""
    print("\n>>> BẮT ĐẦU THỰC HIỆN GHI XP HỒI TỐ VÀO DATABASE...")
    
    statements = []
    
    # 1. Ghi Thành phần B (Full Test) vào ledger
    ft_count = 0
    for r in results:
        uid = r["id"]
        for ft in r["fulltest_entries"]:
            esc_desc = ft["desc"].replace("'", "\\'")
            statements.append(f"""
                INSERT IGNORE INTO user_xp_ledger (user_id, xp_amount, activity_type, dedupe_key, description, created_at)
                VALUES ('{uid}', {ft['bonus']}, 'test_completion', '{ft['dedupe_key']}', '{esc_desc}', NOW());
            """)
            ft_count += 1

    # 2. Ghi Thành phần C (Streak Milestones) vào ledger
    sm_count = 0
    for r in results:
        uid = r["id"]
        for sm in r["streak_entries"]:
            esc_desc = sm["desc"].replace("'", "\\'")
            statements.append(f"""
                INSERT IGNORE INTO user_xp_ledger (user_id, xp_amount, activity_type, dedupe_key, description, created_at)
                VALUES ('{uid}', {sm['bonus']}, 'streak_milestone', '{sm['dedupe_key']}', '{esc_desc}', NOW());
            """)
            sm_count += 1

    # 3. Ghi Thành phần A (Practice grant) vào ledger
    pr_count = 0
    for r in results:
        uid = r["id"]
        if r["practice_grant"] > 0:
            key = f"xp:retro_practice_v1:{uid}"
            desc = f"Quy đổi hồi tố {r['practice_correct'] + r['practice_wrong']} câu hỏi luyện tập (áp trần Level 10)"
            esc_desc = desc.replace("'", "\\'")
            statements.append(f"""
                INSERT IGNORE INTO user_xp_ledger (user_id, xp_amount, activity_type, dedupe_key, description, created_at)
                VALUES ('{uid}', {r['practice_grant']}, 'retroactive_practice_backfill_v1', '{key}', '{esc_desc}', NOW());
            """)
            pr_count += 1

    # 4. Cập nhật users.xp và users.level
    user_upd_count = 0
    for r in results:
        if r["total_grant"] > 0:
            uid = r["id"]
            statements.append(f"""
                UPDATE users
                SET xp = xp + {r['total_grant']}, level = {r['new_level']}
                WHERE id = '{uid}';
            """)
            user_upd_count += 1

    # 5. Tạo thông báo tri ân cá nhân hóa vào user_notifications (Phase 3)
    notify_count = 0
    for r in results:
        if r["total_grant"] > 0:
            uid = r["id"]
            notif_id = str(uuid.uuid4())
            dedupe_notif = f"xp:retro_notify_v1:{uid}"
            
            level_msg = f", nâng cấp danh hiệu lên Cấp {r['new_level']}: {r['new_level_title']}" if r["new_level"] > r["current_level"] else ""
            msg = (
                f"Tri ân quá trình nỗ lực: Hệ thống đã quy đổi {r['total_questions']:,} câu hỏi bạn đã luyện tập trước đây "
                f"thành +{r['total_grant']:,} XP{level_msg}. Cảm ơn bạn đã luôn đồng hành cùng TOEICMaster!"
            )
            esc_title = "Tri ân nỗ lực học tập: Cập nhật XP & Danh hiệu".replace("'", "\\'")
            esc_msg = msg.replace("'", "\\'")
            
            statements.append(f"""
                INSERT IGNORE INTO user_notifications (id, user_id, type, title, message, action_url, dedupe_key, created_at)
                VALUES ('{notif_id}', '{uid}', 'system', '{esc_title}', '{esc_msg}', '/dashboard', '{dedupe_notif}', NOW());
            """)
            notify_count += 1

    print(f"Tổng số câu lệnh SQL chuẩn bị thực thi:")
    print(f"  • Full Test Ledger entries: {ft_count}")
    print(f"  • Streak Milestone entries: {sm_count}")
    print(f"  • Practice Grant entries: {pr_count}")
    print(f"  • User XP & Level Updates: {user_upd_count}")
    print(f"  • In-app Notifications: {notify_count}")

    sql_script = "\n".join(statements)
    client.execute_script(sql_script)
    print(">>> ĐÃ GHI THÀNH CÔNG TOÀN BỘ BẢN GHI VÀO CƠ SỞ DỮ LIỆU!")

    # 6. Xóa cache Redis leaderboard
    print(">>> Đang xóa cache Redis leaderboard...")
    try:
        if client.is_remote:
            cmd = ["ssh", "-i", SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", REMOTE_HOST,
                   "redis-cli -n 0 DEL leaderboard:ranking_data"]
            subprocess.run(cmd, capture_output=True, text=True)
        else:
            from app.services.cache_service import cache_service
            cache_service.delete("leaderboard:ranking_data")
        print(">>> Đã xóa cache Redis leaderboard:ranking_data thành công!")
    except Exception as e:
        print(f"Lưu ý: Không thể xóa cache Redis tự động: {e}")


def rollback_backfill(client: DatabaseClient, levels: List[Dict[str, Any]]) -> None:
    """Rollback an toàn: Xóa các ledger hồi tố v1 và tính toán lại users.xp / level từ ledger còn lại."""
    print("\n>>> BẮT ĐẦU ROLLBACK HỆ THỐNG XP VỀ TRẠNG THÁI TRƯỚC HỒI TỐ...")
    
    script = """
        -- 1. Xóa các bản ghi ledger hồi tố practice
        DELETE FROM user_xp_ledger WHERE dedupe_key LIKE 'xp:retro_practice_v1:%';
        
        -- 2. Xóa thông báo tri ân hồi tố
        DELETE FROM user_notifications WHERE dedupe_key LIKE 'xp:retro_notify_v1:%';
    """
    client.execute_script(script)
    print("Đã xóa các bản ghi ledger và notification hồi tố v1.")

    # 3. Tính toán lại users.xp từ tổng user_xp_ledger còn lại
    print("Đang đồng bộ lại users.xp từ sổ cái user_xp_ledger còn lại...")
    client.execute_script("""
        UPDATE users u
        LEFT JOIN (
            SELECT user_id, COALESCE(SUM(xp_amount), 0) as ledger_total
            FROM user_xp_ledger
            GROUP BY user_id
        ) l ON l.user_id = u.id
        SET u.xp = COALESCE(l.ledger_total, 0)
        WHERE u.role = 'student';
    """)

    # 4. Tính toán lại users.level theo users.xp mới
    users_after = client.query("SELECT id, xp FROM users WHERE role = 'student'")
    upd_level_stmts = []
    for u in users_after:
        uid = u["id"]
        uxp = int(u.get("xp") or 0)
        lvl, _ = get_level_info(uxp, levels)
        upd_level_stmts.append(f"UPDATE users SET level = {lvl} WHERE id = '{uid}';")
    
    client.execute_script("\n".join(upd_level_stmts))
    print("Đã tính toán và cập nhật lại users.level chính xác theo ledger.")

    # 5. Xóa cache Redis
    try:
        if client.is_remote:
            cmd = ["ssh", "-i", SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", REMOTE_HOST,
                   "redis-cli -n 0 DEL leaderboard:ranking_data"]
            subprocess.run(cmd, capture_output=True, text=True)
        else:
            from app.services.cache_service import cache_service
            cache_service.delete("leaderboard:ranking_data")
        print("Đã xóa cache Redis leaderboard.")
    except Exception as e:
        print(f"Lưu ý: Không thể xóa cache Redis: {e}")

    print(">>> ROLLBACK HOÀN TẤT THÀNH CÔNG!")


def main():
    parser = argparse.ArgumentParser(description="Quy đổi XP Hồi tố & Thiết lập Bảng Xếp hạng")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Chạy kiểm tra và xuất báo cáo (không ghi DB)")
    parser.add_argument("--apply", action="store_true", default=False, help="Ghi thật dữ liệu vào DB")
    parser.add_argument("--rollback", action="store_true", default=False, help="Rollback dữ liệu hồi tố v1")
    parser.add_argument("--remote", action="store_true", default=False, help="Kết nối tới Production VPS")
    parser.add_argument("-y", "--yes", action="store_true", default=False, help="Bỏ qua lời nhắc xác nhận")
    args = parser.parse_args()

    # Mặc định là dry-run nếu không chỉ định apply hay rollback
    if not args.apply and not args.rollback:
        args.dry_run = True

    target_env = "PRODUCTION (VPS)" if args.remote else "LOCAL DEVELOPMENT"
    print(f"[*] Môi trường đích: {target_env}")
    
    client = DatabaseClient(is_remote=args.remote)
    levels = load_level_definitions(client)

    if args.rollback:
        confirm = "yes" if args.yes else input(f"BẠN CÓ CHẮC CHẮN MUỐN ROLLBACK TRÊN {target_env}? (Nhập 'yes' để xác nhận): ")
        if confirm.strip().lower() == "yes":
            rollback_backfill(client, levels)
        else:
            print("Hủy thao tác rollback.")
        return

    results = compute_retroactive_xp(client, levels)

    if args.dry_run and not args.apply:
        print_dry_run_report(results)
        print("[*] ĐÂY LÀ CHẾ ĐỘ DRY-RUN: KHÔNG CÓ DỮ LIỆU NÀO ĐƯỢC GHI VÀO DB.")
        print("[*] Đạt vui lòng kiểm tra và duyệt bảng số liệu trên. Để ghi thật, hãy chạy: python backfill_retroactive_xp.py --apply --remote")
        return

    if args.apply:
        print_dry_run_report(results)
        confirm = "yes" if args.yes else input(f"BẠN CÓ CHẮC CHẮN MUỐN ÁP DỤNG BACKFILL TRÊN {target_env}? (Nhập 'yes' để xác nhận): ")
        if confirm.strip().lower() == "yes":
            apply_backfill(client, results)
        else:
            print("Hủy thao tác apply.")


if __name__ == "__main__":
    main()
