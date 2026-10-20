# Phát hành các thay đổi còn lại — 21/10/2026

Người dùng xác nhận deploy toàn bộ thay đổi mã nguồn trong workspace, bổ sung cho đợt công cụ bài thi đã phát hành ở `035132a`. Bao gồm chọn/xoá nhiều từ vựng, API batch-delete theo tài khoản, hiển thị transcript/bài đọc trong kết quả, nạp câu từ review và hiệu ứng đóng hộp xác nhận ở trang kết quả/lịch sử. Không đưa `.env`, ảnh QA `.playwright-mcp`, dependency hoặc dữ liệu local vào git. Không có migration DB mới; hai migration chú thích/ghi chú đã được CI/CD áp dụng ở đợt trước.

## Sửa lỗi phát hiện trước phát hành

- Không xoá cache/local state trước khi API xác nhận thành công; truyền lỗi tới hộp xác nhận thay vì đóng hộp và báo thành công giả.
- Chia danh sách thành các batch tuần tự tối đa 500 ID, loại trùng; bỏ fallback gửi đồng loạt DELETE từng từ khi API lỗi để tránh tăng tải connection pool.
- Giữ hộp xác nhận và danh sách khi lỗi, cho phép thử lại. Cảnh báo có thể đã xoá một phần nếu batch sau lỗi; retry an toàn vì DELETE idempotent và luôn giới hạn theo tài khoản đăng nhập.
- Phím Enter trong hộp xác nhận không bị hotkey phát âm toàn trang chặn; focus ban đầu về Huỷ. Response không báo số xoá sai bằng số ID yêu cầu.

## Kiểm tra

- Hai regression test FastAPI + SQLite in-memory: auth, tài khoản, loại trùng/retry, batch rỗng/vượt 500. Không dùng database ứng dụng; không chạy test lịch sử cũ vì test đó chọn user thật và xoá dữ liệu lịch sử.
- Browser với transport giả: 1.001 ID chia 500/500/1; API 503 ném lỗi và giữ bản local; UI lỗi giữ dialog + hiện cảnh báo, lần thử thành công đóng dialog và cập nhật danh sách.
- Máy Windows local gặp lỗi cấp phát bộ nhớ cả PowerShell/Node. Bản phát hành được build/typecheck trong thư mục tạm riêng trên VPS trước khi push main; không phục vụ thư mục kiểm thử, không thay code đang chạy ở bước này.
- CI/CD chuẩn sẽ backup và xác minh MySQL, bỏ qua migration đã chạy, build lại, restart và kiểm tra API. Các thay đổi đợt công cụ bài thi và feature flags được giữ nguyên.
