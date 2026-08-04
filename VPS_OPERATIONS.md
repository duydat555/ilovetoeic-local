# Hướng dẫn vận hành TOEIC VPS

Tài liệu này dành cho VPS production:

- Domain: `https://ilovetoeic.com`
- VPS: `160.191.55.140`
- Mã nguồn: `/var/www/toeic-website`
- Backend service: `toeic-api`
- Database: MySQL `toeic_db`

Không commit hoặc gửi các file/giá trị sau: `.env`, mật khẩu, API key, OAuth client secret, private SSH key và file database dump.

## 1. Đăng nhập VPS bằng SSH

SSH root hiện chỉ cho phép đăng nhập bằng key:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519_ilovetoeic_vps" root@160.191.55.140
```

Nhập passphrase của SSH key khi được hỏi. Không dùng password root qua SSH.

Nếu cần kiểm tra phiên mới có hoạt động:

```powershell
ssh -o PasswordAuthentication=no -o PreferredAuthentications=publickey -i "$env:USERPROFILE\.ssh\id_ed25519_ilovetoeic_vps" root@160.191.55.140
```

## 2. Cập nhật code thủ công trên VPS

Deploy key read-only trên VPS cho phép `git pull` từ GitHub:

```bash
cd /var/www/toeic-website
git pull --ff-only origin main
```

Nếu backend dependency thay đổi:

```bash
cd /var/www/toeic-website/server
.venv/bin/python -m pip install -r requirements.txt
```

Build frontend và restart:

```bash
cd /var/www/toeic-website/client
npm ci
npm run build
systemctl restart toeic-api
systemctl reload nginx
```

Kiểm tra sau deploy:

```bash
systemctl is-active toeic-api
systemctl is-active nginx
curl -fsS https://ilovetoeic.com/api/v1/status
```

## 3. Deploy tự động bằng GitHub Actions

Workflow nằm ở `.github/workflows/deploy.yml` và chạy khi push vào `main` hoặc khi bấm **Run workflow**.

Repository cần 4 Actions Secrets:

- `VPS_HOST`: `160.191.55.140`
- `VPS_USER`: `root`
- `VPS_SSH_KEY`: toàn bộ private key deploy từ máy quản trị
- `VPS_KNOWN_HOSTS`: kết quả host key đã xác minh của VPS

Không ghi các giá trị này vào workflow hoặc source code. Sau khi thêm Secrets, vào tab **Actions** để chạy thử workflow.

## 4. Kiểm tra và xem log backend

```bash
systemctl status toeic-api --no-pager
journalctl -u toeic-api -n 100 --no-pager
journalctl -u toeic-api -f
```

Kiểm tra cổng nội bộ:

```bash
ss -ltnp | grep ':8000'
curl -fsS http://127.0.0.1:8000/api/v1/status
```

## 5. Kiểm tra Nginx và HTTPS

```bash
nginx -t
systemctl reload nginx
curl -I https://ilovetoeic.com
```

Kiểm tra gia hạn SSL:

```bash
certbot renew --dry-run
```

## 6. MySQL

Database production là `toeic_db`; dữ liệu hiện có 75 đề trong bảng `tests`.

Kiểm tra nhanh trên VPS:

```bash
mysql -u root -NBe "SELECT COUNT(*) FROM toeic_db.tests;"
```

Không mở port MySQL `3306` ra Internet. Để dùng Workbench/DBeaver trên laptop, mở SSH tunnel:

```powershell
ssh -N -L 3307:127.0.0.1:3306 -i "$env:USERPROFILE\.ssh\id_ed25519_ilovetoeic_vps" root@160.191.55.140
```

Giữ cửa sổ tunnel mở. Trong ứng dụng database dùng:

- Host: `127.0.0.1`
- Port: `3307`
- Database: `toeic_db`
- User: `toeic_app`
- Password: đọc trực tiếp từ `server/.env` trên VPS; không gửi password qua chat.

## 7. File cấu hình production

Backend đọc:

```text
/var/www/toeic-website/server/.env
```

Sau khi sửa `.env`:

```bash
chmod 600 /var/www/toeic-website/server/.env
systemctl restart toeic-api
```

Các secret Google OAuth, Gemini, R2 và `APP_SECRET` chỉ đặt trên VPS hoặc trong GitHub Secrets, không đưa vào Git.

Google OAuth callback production:

```text
https://ilovetoeic.com/api/v1/auth/google/callback
```

## 8. Firewall và bảo mật

UFW chỉ mở các cổng cần thiết:

```bash
ufw status verbose
```

Các cổng được phép: `22/tcp`, `80/tcp`, `443/tcp`. Không mở `3306`.

Root SSH password login đã tắt. Không xóa SSH key đang sử dụng trước khi kiểm tra một phiên key-only mới.

## 9. Quy trình cập nhật khuyến nghị

1. Push code lên branch `main`.
2. Theo dõi GitHub Actions.
3. Kiểm tra `https://ilovetoeic.com/api/v1/status`.
4. Nếu lỗi, xem `journalctl -u toeic-api` và rollback commit bằng một commit sửa mới.

Không dùng `git reset --hard` hoặc force-push trên VPS khi chưa xác định rõ dữ liệu cần giữ.
