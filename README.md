# Local development repository

This repository is duydat555/ilovetoeic-local, for development on a local machine only.
Do not deploy to VPS, configure production services, or connect to production databases.
The inherited production documentation below is reference material for the source project.
The deployment workflow is disabled (deploy.yml.disabled). Push changes only to ilovetoeic-local.

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

## Nhập dữ liệu ngữ pháp

Sau khi MySQL đã chạy và biến môi trường trong `server/.env` đã đúng, nhập file
CSV phẳng bằng lệnh sau. Trình nhập dùng upsert nên có thể chạy lại khi dữ liệu
nguồn được cập nhật.

```powershell
cd server
python import_grammar_csv.py data/grammar_questions_flat.csv
```

Schema MySQL tương ứng nằm trong `server/mysql_schema.sql` và được backend tự
khởi tạo khi khởi động. Trên production, GitHub Actions áp dụng migration tạo
bảng rồi nhập file CSV một lần, có ghi nhận trong `schema_migrations`.
