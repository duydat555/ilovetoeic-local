# Database & migration rules

## Backup & safety
- Backup dựa vào `mysqldump` trong `/var/backups/toeic` — trước khi thao tác rủi ro, xác nhận backup gần nhất còn tồn tại.
- Không chạy migration, seed script, hoặc thao tác ghi trực tiếp lên `toeic.db` / MySQL production mà không có backup trước.
- Đổi schema/migrate dữ liệu lớn nên test trên bản backup/local trước khi chạy trên production.
- Mọi thay đổi schema DB phải đi kèm migration script, không sửa schema "chui" qua code.

## Binary logging
- Binary logging (binlog) đã bị tắt trên VPS (single instance, không replication) — không tự ý bật lại.

## Connection & query performance
- MySQLConnectionPool có `max_size=25` — khi thêm feature có thể tăng tải kết nối đồng thời (polling, batch job...), phải tính đến giới hạn này.
- Tránh thêm query full table scan mới trên các bảng lớn (leaderboard, recent-active-students đã có vấn đề này do `COALESCE` chặn index).
- `get_current_user` đang chạy query DB không cache trên mỗi request — nếu thêm middleware/endpoint mới dùng auth, lưu ý điểm này để tránh làm nặng thêm.

## Caching
- Cẩn thận với cache: `query_ram_cache.clear()` hiện xóa toàn bộ cache khi có bất kỳ write nào (cache invalidation storm) — khi sửa logic liên quan, ưu tiên invalidate theo key/scope cụ thể thay vì clear toàn bộ, trừ khi task yêu cầu khác.
- Endpoint polling (ví dụ notification mỗi 60s) không nên ghi DB mỗi lần gọi nếu không có thay đổi thực sự.

## State/log files liên quan migration
- Không được xóa hoặc ghi đè các file log/state đang được dùng để theo dõi migration (`r2_migration_state.json`, `supabase_media_sync_state.json`, v.v.) trừ khi được yêu cầu rõ ràng.
