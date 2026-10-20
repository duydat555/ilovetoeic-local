# Deployment workflow

## Infra
- VPS: Ubuntu 24.04, đứng sau Nginx, SSL qua Certbot.
- Backend chạy qua systemd (FastAPI).
- CI/CD qua GitHub Actions (`.github/workflows/deploy.yml`, OpenSSH CLI) với secrets cấu hình cho VPS; push main hoặc workflow_dispatch.
- DNS quản lý qua Vietnix.
- Monitoring: Beszel.

## Quy trình deploy
- Flow chuẩn: `git pull → rebuild → restart`.
- Không skip bước `npm run build` (client) khi deploy frontend — lỗi build phải được xử lý trước khi push/deploy.
- Trước khi merge, phải chạy `npm run build` (client) và kiểm tra server khởi động được không lỗi.
- Từ đợt phát hành công cụ bài thi 20/10/2026: CI/CD xác minh backup `.sql.gz` còn dữ liệu và `gzip -t` trước migration. Migration tạo `user_exam_annotations`, `user_exam_notes` là additive và được ghi vào schema_migrations.
- Workflow production build với `VITE_EXAM_ANNOTATIONS_V2=true`, `VITE_EXAM_NOTES_V2=true`; sau build thành công, sao lưu server/.env vào `/var/backups/toeic/server_env_*.bak` (0600) rồi đặt riêng `EXAM_NOTES_ENABLED=true`, restart và kiểm tra `/api/v1/status`. Không đưa secret/.env thật vào git. Các `.env.example` vẫn mặc định tắt.

## Tài nguyên VPS
- Dung lượng đĩa hạn chế — theo dõi các thư mục log/backup dễ phình to (đã từng đầy đĩa do binlog tích tụ).
- Swapfile 2GB, `vm.swappiness=10` đã cấu hình — tránh thêm process/service tốn RAM không cần thiết mà không kiểm tra tài nguyên trước.

## Secrets
- Không hardcode secret/API key/password vào code hoặc commit. Nếu phát hiện secret bị lộ, báo ngay và đề xuất rotate.

## Cấu hình Nginx Proxy Cache (Luyện theo Levels)
- File cấu hình mẫu: `server/nginx/practice_by_level_cache.conf`
- **Bước 1 (Một lần duy nhất)**: Khai báo cache zone trong `/etc/nginx/nginx.conf` bên trong block `http`:
  ```nginx
  proxy_cache_path /var/cache/nginx/practice_levels
      levels=1:2
      keys_zone=PRACTICE_LEVEL_CACHE:50m
      max_size=500m
      inactive=60m
      use_temp_path=off;
  ```
  Tạo thư mục cache và phân quyền cho Nginx:
  ```bash
  sudo mkdir -p /var/cache/nginx/practice_levels
  sudo chown -R www-data:www-data /var/cache/nginx/practice_levels
  ```
- **Bước 2**: Include nội dung `server/nginx/practice_by_level_cache.conf` vào server block của `ilovetoeic.com`.
- **Bước 3**: Kiểm tra cú pháp và reload:
  ```bash
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- **Xóa / Bypass Cache thủ công**:
  - Gửi header `X-Purge-Cache: 1` hoặc tham số URL `?nocache=1` để bỏ qua hoặc nạp mới cache:
  ```bash
  curl -I -H "X-Purge-Cache: 1" https://ilovetoeic.com/api/v1/practice-by-level/summary
  ```
