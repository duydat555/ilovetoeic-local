# Backend/API conventions

- MySQLConnectionPool có `max_size=25` — khi thêm feature có thể tăng tải kết nối đồng thời (polling, batch job...), phải tính đến giới hạn này. Chi tiết connection pool xem thêm `database.md`.
- Cẩn thận với cache: `query_ram_cache.clear()` hiện xóa toàn bộ cache khi có bất kỳ write nào (cache invalidation storm) — ưu tiên invalidate theo key/scope cụ thể thay vì clear toàn bộ, trừ khi task yêu cầu khác.
- `get_current_user` đang chạy query DB không cache trên mỗi request — nếu thêm middleware/endpoint mới dùng auth, lưu ý điểm này để tránh làm nặng thêm.
- Tránh thêm query full table scan mới trên các bảng lớn (leaderboard, recent-active-students đã có vấn đề này do `COALESCE` chặn index).
- Endpoint polling (ví dụ notification mỗi 60s) không nên ghi DB mỗi lần gọi nếu không có thay đổi thực sự.

## Known issues / performance notes

- Highlight-to-translate có latency 5-7s khi cache miss do dictionary lookup chỉ exact-match, thiếu inflected forms — đang xử lý bằng lemmatization + progressive loading, không cần fix lại từ đầu nếu không phải nhiệm vụ hiện tại.
- Font tiếng Việt: dùng "Be Vietnam Pro" cho các thành phần hiển thị dấu tiếng Việt.
- Các bug UI thường lặp lại: duplicate toggle thumb, tràn text tiếng Việt, card quá khổ, nhầm màu hover/selected, modal không che hết viewport — kiểm tra các điểm này khi làm UI mới.
