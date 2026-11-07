# Local development repository

This repository is duydat555/ilovetoeic-local, for development on a local machine only.
Do not deploy to VPS, configure production services, or connect to production databases.
The inherited production documentation below is reference material for the source project.
The deployment workflow is disabled (deploy.yml.disabled). Push changes only to ilovetoeic-local.

# Project collaboration rules

Đây là **production app có user thật** (ilovetoeic.com / TOEICMaster). Mọi thay đổi phải an toàn cho production: không breaking change, không thao tác trực tiếp lên dữ liệu thật mà không backup, luôn cân nhắc edge case.

Chi tiết theo từng mảng được tách trong `docs/agents/`. Dựa vào loại task đang làm, đọc đúng file tương ứng trước khi bắt đầu:

| Task liên quan tới... | Đọc file |
|---|---|
| Schema DB, migration, backup, connection pool, cache DB | `docs/agents/database.md` |
| Deploy, CI/CD, VPS, secrets, tài nguyên server | `docs/agents/deployment.md` |
| Khởi động frontend, màn hình trắng, lỗi tải trang | `docs/agents/frontend-startup.md` |
| Modal, dialog, animation, motion | `docs/agents/ui-motion.md` |
| API endpoint, cache logic, performance backend | `docs/agents/backend-api.md` |
| Thách đấu Arena, ghép trận, cược XP, phòng chơi | `docs/agents/arena.md` |
| Bôi đen dịch AI, từ điển ngữ cảnh, lemmatization | `docs/agents/highlight-to-translate/README.md` |
| Luyện theo Levels, phân loại độ khó, ngân hàng câu sai | `docs/agents/practice-by-level/README.md` |
| Dashboard tiến độ, XP/Streak, Phân tích AI & BXH | `docs/agents/progress-gamification/README.md` |
| Lưu câu hỏi, bộ lọc Đã lưu | `docs/agents/saved-questions.md` |
| Toolbar, highlight, nét vẽ và ghi chú trong bài thi | `docs/agents/exam-annotations.md` |

## Production safety (áp dụng chung, luôn đọc trước khi sửa gì)

- Không được tự động push lên production, phải có sự kiểm tra của tôi.
- Không hardcode secret/API key/password vào code hoặc commit. Nếu phát hiện secret bị lộ, báo ngay và đề xuất rotate.
- Trước khi merge, phải chạy `npm run build` (client) và kiểm tra server khởi động được không lỗi.
- Nếu task chạm vào nhiều mảng cùng lúc (ví dụ vừa sửa API vừa động tới DB), đọc tất cả file liên quan trong bảng trên trước khi code.
- Khi thêm domain rule mới không thuộc các mảng ở trên: tạo file mới trong `docs/agents/`, rồi thêm 1 dòng vào bảng routing này — không nhét thẳng vào AGENTS.md.
