# Mô hình dữ liệu & Đặc tả API: Luyện theo Levels (Practice by Levels)

> Tài liệu này cung cấp định nghĩa chi tiết về lược đồ cơ sở dữ liệu MySQL, cấu trúc chỉ mục, Pydantic Models và đặc tả các RESTful API endpoints của tính năng **Luyện theo Levels**.

---

## 1. Lược đồ cơ sở dữ liệu MySQL (Database Schema)

### 1.1. Bảng `questions` (Ngân hàng câu hỏi)

Lưu trữ từng câu hỏi trắc nghiệm của bài thi TOEIC. Thuộc tính `difficulty_level` được đánh số từ 1 (Cơ bản) đến 5 (Nâng cao).

```sql
CREATE TABLE questions (
    id VARCHAR(100) NOT NULL PRIMARY KEY,
    test_id VARCHAR(100) NOT NULL,
    passage_id VARCHAR(100) NULL,
    part INT NOT NULL,
    section ENUM('listening', 'reading') NOT NULL,
    question_number INT NOT NULL,
    audio_url VARCHAR(500) NULL,
    image_url VARCHAR(500) NULL,
    question_text TEXT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    explanation_vi TEXT NULL,
    explanation_en TEXT NULL,
    dich_nghia TEXT NULL,
    tu_vung TEXT NULL,
    dich_nghia_dap_an TEXT NULL,
    difficulty_level INT NOT NULL DEFAULT 3,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_questions_part CHECK (part BETWEEN 1 AND 7),
    CONSTRAINT chk_questions_level CHECK (difficulty_level BETWEEN 1 AND 5),
    INDEX idx_questions_part_level (part, difficulty_level),
    INDEX idx_questions_test_order (test_id, order_index, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2. Bảng `passages` (Ngữ cảnh đoạn văn & hội thoại)

Lưu đoạn văn hoặc bài đọc dùng chung cho một nhóm câu hỏi (Part 3, 4, 6, 7).

```sql
CREATE TABLE passages (
    id VARCHAR(100) NOT NULL,
    test_id VARCHAR(100) NOT NULL,
    part INT NOT NULL,
    title VARCHAR(255) NULL,
    passage_text LONGTEXT NULL,
    passage_text_2 LONGTEXT NULL,
    passage_text_3 LONGTEXT NULL,
    passage_text_vi_html LONGTEXT NULL,
    passage_text_2_vi_html LONGTEXT NULL,
    passage_text_3_vi_html LONGTEXT NULL,
    passage_sentence_pairs JSON NULL,
    transcript LONGTEXT NULL,
    audio_url VARCHAR(500) NULL,
    image_url VARCHAR(500) NULL,
    order_index INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id, test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3. Bảng `test_attempts` (Kết quả nộp bài)

Lưu trữ bản ghi khi học viên hoàn thành hoặc nộp bài luyện tập theo Level.

```sql
CREATE TABLE test_attempts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    test_id VARCHAR(100) NULL,
    mode ENUM('exam', 'practice') NOT NULL DEFAULT 'practice',
    part INT NULL,
    total_questions INT NOT NULL,
    answered_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    accuracy_rate FLOAT NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    listening_correct INT NOT NULL DEFAULT 0,
    reading_correct INT NOT NULL DEFAULT 0,
    listening_score INT NOT NULL DEFAULT 0,
    reading_score INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    answers JSON NOT NULL,
    question_ids JSON NOT NULL,
    metadata JSON NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempts_user (user_id, completed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Định dạng trường `metadata` trong chế độ Luyện theo Level:**
```json
{
  "source": "level_practice",
  "selected_parts": [5],
  "selected_part": 5,
  "selected_level": 3
}
```

### 1.4. Bảng `user_wrong_questions` (Ngân hàng câu sai)

Bảng tổng hợp theo dõi các câu học viên làm sai để phục vụ chức năng làm lại câu sai (`RotateCcw`).

```sql
CREATE TABLE user_wrong_questions (
    user_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    source_type ENUM('test', 'level') NOT NULL DEFAULT 'level',
    test_id VARCHAR(100) NULL,
    part INT NOT NULL,
    level INT NULL,
    wrong_count INT NOT NULL DEFAULT 1,
    first_wrong_at DATETIME NOT NULL,
    last_wrong_at DATETIME NOT NULL,
    PRIMARY KEY (user_id, question_id, source_type),
    INDEX idx_wrong_user_source (user_id, source_type, part, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. Đặc tả RESTful API Endpoints

### 2.1. Lấy thống kê số lượng câu hỏi theo Level (`GET /practice-by-level/summary`)

- **URL:** `/api/v1/practice-by-level/summary`
- **Method:** `GET`
- **Xác thực:** Không bắt buộc (Public API).
- **Cache Headers:** `Cache-Control: public, max-age=180, stale-while-revalidate=300`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "part": 1, "level": 1, "question_count": 48 },
    { "part": 1, "level": 2, "question_count": 64 },
    { "part": 1, "level": 3, "question_count": 56 },
    { "part": 1, "level": 4, "question_count": 40 },
    { "part": 1, "level": 5, "question_count": 32 },
    { "part": 2, "level": 1, "question_count": 72 },
    { "part": 5, "level": 3, "question_count": 120 }
  ]
}
```

---

### 2.2. Lấy ngân hàng câu hỏi theo Part & Level (`GET /practice-by-level/questions`)

- **URL:** `/api/v1/practice-by-level/questions`
- **Method:** `GET`
- **Xác thực:** Không bắt buộc (Public API).
- **Query Parameters:**
  | Tham số | Kiểu dữ liệu | Bắt buộc | Ràng buộc | Mô tả |
  |---|---|---|---|---|
  | `part` | Integer | Có | `ge=1, le=7` | Phần thi TOEIC (Part 1 đến Part 7) |
  | `level` | Integer | Có | `ge=1, le=5` | Độ khó câu hỏi (1: Cơ bản đến 5: Nâng cao) |

**Response Headers:**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=180, stale-while-revalidate=300
```

**Response Body (200 OK):**
```json
{
  "success": true,
  "part": 5,
  "level": 3,
  "total_questions": 45,
  "questions": [
    {
      "id": "q-101-uuid",
      "test_id": "ets-2024-test-1",
      "passage_id": null,
      "part": 5,
      "section": "reading",
      "question_number": 101,
      "audio_url": null,
      "image_url": null,
      "question_text": "Customer reviews indicate that many modern mobile devices are often _______ unnecessarily.",
      "option_a": "complication",
      "option_b": "complicated",
      "option_c": "complicate",
      "option_d": "complicating",
      "correct_answer": "B",
      "explanation_vi": "Cấu trúc to be + trạng từ + V-ed/P2...",
      "explanation_en": "Passive voice structure with adverb modifier...",
      "dich_nghia": "Đánh giá của khách hàng chỉ ra rằng...",
      "difficulty_level": 3,
      "order_index": 1,
      "passage_text": null,
      "passage_sentence_pairs": null
    }
  ]
}
```

**Lỗi thường gặp:**
- `400 Bad Request`: `part` hoặc `level` nằm ngoài khoảng quy định.
- `404 Not Found`: Không tìm thấy câu hỏi phù hợp với bộ lọc.

---

### 2.3. Ghi nhận hoạt động câu hỏi theo mảng (`POST /user-question-activity/batch`)

Được Client gọi định kỳ hoặc khi học viên xác nhận câu trả lời nhằm ghi nhận tiến độ thời gian thực.

- **URL:** `/api/v1/user-question-activity/batch`
- **Method:** `POST`
- **Xác thực:** Yêu cầu `Authorization: Bearer <JWT Token>`.

**Request Body Schema:**
```json
{
  "attemptId": "a8c0816f-1fbc-49b8-b4b3-d648439df689",
  "sourceType": "level",
  "testId": null,
  "part": 5,
  "level": 3,
  "answers": [
    {
      "questionId": "q-101-uuid",
      "selectedAnswer": "B",
      "answeredAt": "2026-09-18T14:30:00Z"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "saved": 1
}
```

**Quy tắc Backend xử lý tự động:**
1. Kiểm tra xác thực xem câu hỏi `q-101-uuid` có đúng `difficulty_level == 3` hay không.
2. Lưu/cập nhật bản ghi vào `user_question_activity`.
3. Kiểm tra đúng/sai:
   - Nếu `selectedAnswer == correct_answer`: Xóa câu hỏi khỏi `user_wrong_questions`.
   - Nếu `selectedAnswer != correct_answer`: Chèn hoặc tăng `wrong_count` trong `user_wrong_questions`.
4. Gọi `record_practice_streak(user)` cập nhật chuỗi học tập trong ngày.

---

### 2.4. Nộp và hoàn tất bài luyện tập (`PUT /study-attempts/{attempt_id}`)

- **URL:** `/api/v1/study-attempts/{attempt_id}`
- **Method:** `PUT`
- **Xác thực:** Yêu cầu `Authorization: Bearer <JWT Token>`.

**Request Body Schema:**
```json
{
  "id": "a8c0816f-1fbc-49b8-b4b3-d648439df689",
  "userId": "usr-123456",
  "testId": null,
  "mode": "practice",
  "part": 5,
  "totalQuestions": 45,
  "answeredQuestions": 45,
  "correctAnswers": 36,
  "accuracyRate": 80.0,
  "timeSpentSeconds": 1800,
  "listeningCorrect": 0,
  "readingCorrect": 36,
  "listeningScore": 0,
  "readingScore": 0,
  "totalScore": 0,
  "answers": {
    "q-101-uuid": "B"
  },
  "questionIds": ["q-101-uuid"],
  "metadata": {
    "source": "level_practice",
    "selected_parts": [5],
    "selected_part": 5,
    "selected_level": 3
  },
  "completedAt": "2026-09-18T15:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### 2.5. Truy vấn danh sách câu sai theo Level (`GET /wrong-questions`)

- **URL:** `/api/v1/wrong-questions?source_type=level&part={part}&level={level}`
- **Method:** `GET`
- **Xác thực:** Yêu cầu `Authorization: Bearer <JWT Token>`.

**Response Body (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "questionId": "q-102-uuid",
      "testId": "ets-2024-test-1",
      "sourceType": "level",
      "part": 5,
      "level": 3,
      "wrongCount": 2,
      "firstWrongAt": "2026-09-17T10:15:00Z",
      "lastWrongAt": "2026-09-18T09:20:00Z",
      "testName": "ETS TOEIC 2024 Test 1",
      "testYear": 2024
    }
  ]
}
```

---

### 2.6. Xóa lịch sử làm bài và dọn dẹp dữ liệu Level (`DELETE /study-attempts`)

- **URL:** `/api/v1/study-attempts?source_type=level&part={part}&level={level}`
- **Method:** `DELETE`
- **Xác thực:** Yêu cầu `Authorization: Bearer <JWT Token>`.

**Response Body (200 OK):**
```json
{
  "success": true,
  "deletedCount": 3
}
```
*(Số lượng `deletedCount` thể hiện số bản ghi trong `test_attempts` đã được xóa sạch).*
