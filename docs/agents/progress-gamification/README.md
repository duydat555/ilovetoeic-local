# Domain Rules: Tiến độ học tập, Gamification (XP/Level/Streak), Phân tích AI & Bảng xếp hạng

Tài liệu này quy định các nguyên tắc thiết kế, kiến trúc DB, bảo vệ hiệu năng và an toàn production cho các tính năng:
- **Theo dõi tiến độ & Thống kê học tập**: Study Time hàng ngày, Weekly bar chart, Điểm danh tuần & Streak tổng quát hóa.
- **Hệ thống Gamification**: Cấp độ (Level 1..N), Kinh nghiệm (XP), Sổ cái idempotency (`user_xp_ledger`).
- **Tiến độ bài học theo 4 kỹ năng**: Listening, Reading, Grammar, Vocabulary.
- **Mục tiêu điểm & Dự đoán AI**: Dự đoán điểm thống kê theo chuẩn ETS (`toeic_score_conversion`), nhận xét định tính qua Gemini.
- **Biểu đồ Radar năng lực**: Phân loại `skill_tag` trên ngân hàng câu hỏi.
- **Bảng xếp hạng (Leaderboard)**: Tối ưu triệt để nợ kỹ thuật cũ (`COALESCE` full table scan), chuyển sang Redis Sorted Set.
- **Cộng đồng**: Hệ thống tương tác (Follow / Study Group / Feed).

---

## 1. Nguyên tắc an toàn & Idempotency (Bắt buộc)

1. **Idempotency tuyệt đối trên mọi luồng ghi XP/Streak/Thời gian**:
   - Mọi hành động cộng XP phải ghi nhận qua `user_xp_ledger` có `UNIQUE KEY uq_dedupe (dedupe_key)`.
   - Sử dụng `INSERT IGNORE` kèm dedupe key định dạng chuẩn:
     - Trả lời đúng câu hỏi: `question_correct:{attempt_id}:{question_id}`
     - Hoàn thành Level practice (accuracy >= 70%): `level_complete:{attempt_id}`
     - Hoàn thành Full test: `full_test_complete:{attempt_id}`
     - Thưởng duy trì streak tuần: `streak_bonus:{user_id}:{iso_year}_W{week_number}`
   - Chỉ khi insert ledger thành công (`rowcount > 0`) mới thực hiện `UPDATE users SET total_xp = total_xp + amount`.
2. **Không lặp lại nợ kỹ thuật hiệu năng đã biết**:
   - Tuyệt đối **không** dùng `COALESCE(...)` trong mệnh đề `WHERE` hoặc `ORDER BY` trên các bảng có số lượng dòng lớn.
   - Không gọi `query_ram_cache.clear()` toàn cục khi ghi điểm/XP; dùng Redis key cụ thể hoặc in-memory TTL scoped.
   - Không chạy query DB không cache trên middleware/auth request path.
3. **Phân tách rõ ràng giữa Thống kê tính toán và Trí tuệ nhân tạo (AI)**:
   - Điểm dự đoán TOEIC (Total, Listening, Reading) phải được tính bằng thuật toán thống kê tất định kết hợp bảng quy đổi `toeic_score_conversion`.
   - Gemini chỉ được dùng để sinh lời khuyên / nhận xét định tính bằng ngôn ngữ tự nhiên từ số liệu thống kê đã tính. Không để AI tự sinh điểm số dự đoán.
4. **Rollout an toàn qua Feature Flag**:
   - Mọi endpoint và UI widget mới phải được bọc qua Feature Flag (`feature_flags` table & `useFeatureFlags` hook).
   - Rollout theo tỉ lệ phần trăm, không bật 100% đồng loạt trên production có user thật.

---

## 2. Thiết kế Schema & Migration Plan

### Phase A: `user_daily_study_time`
```sql
CREATE TABLE IF NOT EXISTS user_daily_study_time (
    user_id CHAR(36) NOT NULL,
    study_date DATE NOT NULL,
    total_seconds INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, study_date),
    CONSTRAINT fk_daily_study_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Phase B: `level_definitions` & `user_xp_ledger`
```sql
CREATE TABLE IF NOT EXISTS level_definitions (
    level INT PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    min_xp INT NOT NULL,
    INDEX idx_min_xp (min_xp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_xp_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    xp_amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    dedupe_key VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dedupe (dedupe_key),
    INDEX idx_user_created (user_id, created_at),
    CONSTRAINT fk_xp_ledger_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm cột vào bảng users (nếu chưa có)
-- total_xp INT NOT NULL DEFAULT 0;
-- current_level INT NOT NULL DEFAULT 1;
```

### Phase D: `user_study_goals` & `user_predicted_scores`
```sql
CREATE TABLE IF NOT EXISTS user_study_goals (
    user_id CHAR(36) PRIMARY KEY,
    target_score INT NOT NULL,
    target_date DATE NULL,
    daily_goal_minutes INT NOT NULL DEFAULT 30,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_predicted_scores (
    user_id CHAR(36) PRIMARY KEY,
    predicted_total INT NOT NULL,
    predicted_listening INT NOT NULL,
    predicted_reading INT NOT NULL,
    ai_feedback TEXT NULL,
    computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_predicted_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Phase E: Phân loại kỹ năng câu hỏi (`skill_tag`)
```sql
ALTER TABLE questions 
    ADD COLUMN skill_tag ENUM('listening', 'grammar', 'vocabulary', 'reading_comprehension') NULL;

CREATE INDEX idx_questions_skill_tag ON questions (skill_tag);
```

---

## 3. Kiến trúc Leaderboard trên Redis (Phase F)

- Bỏ câu query `GROUP BY u.id ... ORDER BY total_score DESC` gây full table scan cũ.
- Sử dụng Redis Sorted Set:
  - Tuần: `leaderboard:weekly:{iso_year}-W{week_number}`
  - Tháng: `leaderboard:monthly:{year}-{month}`
  - Điểm số: `ZINCRBY leaderboard:weekly:{key} <score_diff> {user_id}`
  - Lấy bảng xếp hạng: `ZREVRANGE leaderboard:weekly:{key} 0 49 WITHSCORES`
  - Đọc profile thông tin user từ MySQL bằng `WHERE id IN (...)` (chỉ query đúng Top N user, có index primary key).

---

## 4. Tài liệu Chi tiết liên quan

- [Quy chuẩn Toàn bộ Luồng Cộng Điểm XP & Hệ thống Gamification](xp-system-flows.md): Bảng tổng hợp tất cả các luồng phát sinh XP (luyện tập, full test, streak, mục tiêu ngày), dedupe keys, sổ cái bất biến `user_xp_ledger`, bảng 16 cấp bậc (Level 1..16) và ma trận hiển thị UI.
- [Quy tắc Tính điểm & Xếp hạng 4 Tiêu chí (XP, Accuracy, Số câu, Streak)](ranking-metrics.md): Công thức toán học, nguyên tắc tie-break không làm tròn, giải thuật cụm Epsilon-gap và ma trận các màn hình áp dụng.
