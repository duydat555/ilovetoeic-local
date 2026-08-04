# TOEIC Master

Ứng dụng học TOEIC gồm React + Tailwind ở `client` và FastAPI + MySQL ở
`server`. Dữ liệu nghiệp vụ chỉ được truy cập qua REST API; trình duyệt không
kết nối trực tiếp tới database.

## Chạy local

```powershell
cd server
python -m pip install -r requirements.txt
python migrate_to_mysql.py
python main.py
```

Ở terminal khác:

```powershell
cd client
npm install
npm run dev
```

Xem hướng dẫn cấu hình và chuyển dữ liệu tại
[MYSQL_MIGRATION.md](./MYSQL_MIGRATION.md).
