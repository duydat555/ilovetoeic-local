# Deployment workflow

## Infra
- VPS: Ubuntu 24.04, đứng sau Nginx, SSL qua Certbot.
- Backend chạy qua systemd (FastAPI).
- CI/CD qua GitHub Actions (`appleboy/ssh-action`) với secrets cấu hình cho VPS.
- DNS quản lý qua Vietnix.
- Monitoring: Beszel.

## Quy trình deploy
- Flow chuẩn: `git pull → rebuild → restart`.
- Không skip bước `npm run build` (client) khi deploy frontend — lỗi build phải được xử lý trước khi push/deploy.
- Trước khi merge, phải chạy `npm run build` (client) và kiểm tra server khởi động được không lỗi.

## Tài nguyên VPS
- Dung lượng đĩa hạn chế — theo dõi các thư mục log/backup dễ phình to (đã từng đầy đĩa do binlog tích tụ).
- Swapfile 2GB, `vm.swappiness=10` đã cấu hình — tránh thêm process/service tốn RAM không cần thiết mà không kiểm tra tài nguyên trước.

## Secrets
- Không hardcode secret/API key/password vào code hoặc commit. Nếu phát hiện secret bị lộ, báo ngay và đề xuất rotate.
