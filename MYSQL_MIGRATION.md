# Chuyển hệ thống sang MySQL

Ứng dụng hiện chỉ dùng MySQL cho dữ liệu nội dung, tài khoản, phiên đăng nhập,
lịch sử làm bài, kho từ vựng, nhóm từ và cache Gemini. Frontend không kết nối
trực tiếp tới database; mọi thao tác đi qua FastAPI và Bearer token.

## 1. Tạo database và tài khoản

Chạy bằng tài khoản quản trị MySQL:

```sql
CREATE DATABASE toeic_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER 'toeic_app'@'%' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON toeic_db.* TO 'toeic_app'@'%';
FLUSH PRIVILEGES;
```

Sao chép `server/.env.example` thành `server/.env`, sau đó điền `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` và một `APP_SECRET` ngẫu nhiên
tối thiểu 32 ký tự.

## 2. Chuyển dữ liệu

Từ thư mục `server`:

```powershell
python -m pip install -r requirements.txt
python migrate_to_mysql.py
```

Lệnh trên tự tạo schema từ `mysql_schema.sql` và chuyển dữ liệu nội dung trong
`toeic.db`. Script là idempotent: chạy lại sẽ cập nhật các dòng có cùng khóa.

Nếu MySQL chạy trong Docker và máy chỉ có Node.js 22+, có thể dùng helper không
cần cài package:

```powershell
node migrate_to_mysql_docker.mjs --container mysql-db
```

Nếu có dữ liệu người dùng đã export thành JSON, đặt mỗi bảng trong một file
`<table>.json`, rồi chạy:

```powershell
python migrate_to_mysql.py --json-dir .\mysql-import
```

Các file thường dùng là `users.json`, `test_attempts.json`,
`user_vocabulary.json` và `user_vocabulary_topic_overrides.json`. Mỗi file là
một mảng JSON hoặc `{ "data": [...] }`. Bản export người dùng phải được nhập
trước các bảng con và giữ nguyên UUID.

Mật khẩu từ hệ thống xác thực bên ngoài không thể giải mã để chuyển sang định
dạng PBKDF2 của ứng dụng. Tài khoản Google sẽ được liên kết lại theo email ở lần
đăng nhập đầu; tài khoản email cần đặt mật khẩu mới hoặc đăng ký lại. Dữ liệu
người dùng vẫn liên kết được nếu giữ nguyên UUID trong file export.

## 3. Google OAuth

Điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và đăng ký redirect URI:

```text
http://127.0.0.1:8000/api/v1/auth/google/callback
```

Ở production, đổi đồng thời `PUBLIC_API_URL`, `CLIENT_URL`,
`GOOGLE_REDIRECT_URI` và `VITE_API_BASE_URL` sang HTTPS URL thực tế.

## 4. Kiểm tra cutover

```powershell
python migrate_to_mysql.py
python main.py
```

Mở `http://127.0.0.1:8000/api/v1/status`, sau đó kiểm tra đăng ký/đăng nhập,
làm bài và thêm một từ qua AI Dictionary. Cả lịch sử và từ vựng phải xuất hiện
trong MySQL.
