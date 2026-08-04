# Định dạng HTML cho bản dịch passage (cục bộ, không AI API)

Pipeline đang dùng là `format_passage_translations_local.py`. Script đưa nguyên
văn bản dịch tiếng Việt đã duyệt vào cấu trúc HTML của bài đọc gốc mà không gọi
Gemini hay bất kỳ dịch vụ AI/API bên ngoài nào. Các cột bản dịch plain-text
không bị cập nhật.

## 1. Schema

Chạy migration idempotent từ thư mục `server`:

```powershell
mysql.exe -u toeic_app -p toeic_db --execute="source migrations/20260803_add_passage_vi_html.sql"
```

Migration thêm:

- `passage_text_vi_html`
- `passage_text_2_vi_html`
- `passage_text_3_vi_html`
- `format_status`: `pending`, `done`, `error`

## 2. Lớp bảo vệ dữ liệu

Một passage chỉ được lưu khi đồng thời đạt cả ba điều kiện:

1. topology thẻ HTML và toàn bộ thuộc tính/class/style giống source;
2. mọi text node tiếng Việt trong output là substring trực tiếp của bản dịch đã
   duyệt trong DB;
3. word multiset giữa output và bản dịch gốc khớp chính xác `1.0` (100%).

Không dùng ngưỡng xấp xỉ. Nếu bất kỳ điều kiện nào thất bại, HTML không được lưu
và passage được đánh dấu `error`.

## 3. Dry-run

Kiểm tra một passage:

```powershell
py -3.11 format_passage_translations_local.py `
  --passage-id <passage-id> `
  --dry-run
```

Kiểm tra toàn bộ mà không ghi DB:

```powershell
py -3.11 format_passage_translations_local.py --dry-run --batch-size 250
```

## 4. Chạy toàn bộ và resume

```powershell
py -3.11 format_passage_translations_local.py --batch-size 100
```

Mỗi batch được commit độc lập. Có thể resume theo trạng thái:

```powershell
py -3.11 format_passage_translations_local.py --statuses pending,error
```

Chạy lại riêng một đề hoặc passage bằng `--test-id` / `--passage-id`. Mặc định
script đọc bản dịch đã duyệt từ cột passage nếu có, sau đó fallback sang
`questions.dich_nghia` theo `passage_id`.

## 5. Các trường hợp không thể format

- Passage không có `passage_text`, `passage_text_2` hoặc `passage_text_3` sẽ ở
  trạng thái `error` vì không có khung HTML.
- Passage không có bản dịch đã duyệt sẽ ở trạng thái `error` vì script không tự
  dịch hoặc tự tạo nội dung.
- Frontend luôn fallback về bản dịch plain-text cũ khi status khác `done` hoặc
  HTML bị thiếu, nên trải nghiệm học sinh không bị để trống.

## 6. Báo cáo

Mỗi lần chạy tạo file `.log` và `.json` trong `server/logs`. Báo cáo JSON chứa
tổng `done/error`, nhóm nguyên nhân lỗi và đầy đủ `test_id`/`passage_id` cần rà
soát. Trường `mode` phải là `local_no_ai_no_external_api`.
