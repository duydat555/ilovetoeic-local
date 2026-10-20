# Audit công cụ bài thi — 18/10/2026

## Phạm vi và an toàn

Rà chức năng và giao diện Thanh công cụ, Đánh dấu xem lại, Lưu câu hỏi, Ghi chú trên nhánh hiện tại. Đọc `AGENTS.md`, hướng dẫn exam-annotations, saved-questions, UI motion, backend/API và DB; áp dụng skill giao diện đã cài để giữ phong cách hiện có. Tham chiếu [điều tra chú thích](exam-annotation-rea.md) và [ghi chú](exam-notes-rea.md); đây là audit triển khai ilovetoeic, không phải bằng chứng REA mới từ ByeToeic.

Giữ các thay đổi chưa commit có sẵn; không push, merge, deploy, migration hoặc ghi dữ liệu production. Browser QA dùng fixture localhost:5173 với API giả và tài khoản `notes-fixture`; test API chỉ tạo DB MySQL local tạm theo quy tắc của test rồi dọn DB. Không thêm dependency.

## Lỗi tìm được và đã sửa

| ID | Chức năng | Trước khi sửa | Cách sửa và bằng chứng kiểm tra lại |
| --- | --- | --- | --- |
| F01 | Bảng màu/độ dày | Mỗi lần đổi độ dày làm effect chạy lại và chuyển focus từ slider sang nút màu đỏ; khó chỉnh liên tiếp bằng bàn phím. | Effect focus chỉ chạy khi mở palette, callback dùng ref mới nhất. Hai lần ArrowRight đưa độ dày lên 4 và focus vẫn ở slider; Escape trả focus về nút palette. |
| F02 | Xoá chú thích | Đóng xác nhận tìm nút trả focus trong nhầm nhánh DOM, không tìm được toolbar đã portal. Mô tả xoá chưa rõ phạm vi của ghi chú từng câu. | Tìm nút qua dock/section; sau xoá hết chuyển focus về bài đọc nếu nút bị disabled. Giữ lại trả focus về nút xoá; xoá 9 mark về 0, Ctrl+Z phục hồi đủ 9. Làm rõ ghi chú riêng từng câu được giữ. |
| F03 | Danh sách câu hỏi | Chưa có dialog semantics/focus trap/trả focus. Unmount khi đang mở có thể giữ body overflow hidden; đóng một drawer có thể mở khoá cuộn của panel Ghi chú còn mở. Reduced-motion vẫn dịch panel. | Thêm role/aria, focus khi mở, Tab/Shift+Tab, trả focus khi đóng; hook khoá cuộn dùng chung theo từng chủ sở hữu và giữ tới hết exit, dọn khi unmount. Tắt dịch chuyển và cuộn mượt khi reduced-motion. QA đóng/unmount trả cuộn bình thường; khi hai panel cùng mở, đóng danh sách vẫn giữ notes modal, inert và overflow hidden, focus về notes. Đóng notes cuối cùng mới trả cuộn. |
| F04 | Bộ đếm danh sách | Đếm toàn bộ key của userAnswers, kể cả câu ngoài danh sách hiện tại; có thể sai tiến độ hoặc vượt 100%. | Chỉ đếm đáp án thuộc questions. Fixture có đáp án ngoài phạm vi vẫn hiển thị đúng 0/8, 0%. |
| F05 | Ô câu đã lưu | Ô vàng dùng số và biểu tượng trắng, tương phản kém. | Dùng nền amber nhạt và chữ/biểu tượng tối; có biến thể dark và nhãn trợ năng riêng. |
| F06 | Lưu câu hỏi | JSON hỏng bị coi là danh sách rỗng; lần lưu tiếp theo có thể ghi đè bản cũ còn có thể cứu. Object thường cũng nhầm các ID trùng tên prototype thành trạng thái đã lưu. | Tách parser/toggle có kiểm tra; từ chối ghi khi không đọc được bản cũ; map không prototype. Test JSON lỗi/null/array/sai kiểu không có write; lỗi quota được ném để nút hiện lỗi. Browser xác nhận bản `{bad` không bị đổi sau bấm lưu và có thông báo lỗi. Đồng bộ hai tab và tách tài khoản vẫn hoạt động. |
| F07 | Đánh dấu xem lại | Sau reload, bộ lọc chỉ lấy pending mark từ queue đã được mount. Dấu chưa đồng bộ của nhóm chưa truy cập lại không hiện dù có trong cache. | Đọc cache đúng các khoá nhóm được yêu cầu, giữ dirty/revision để ưu tiên pending và không che bản server mới hơn bằng cache sạch cũ. Memo theo nhóm/sự kiện, không quét toàn localStorage hoặc thêm API. Offline QA vẫn thấy cả 8 câu thuộc hai nhóm, gồm nhóm 143–146 chưa mount; đồng thời giữ cảnh báo tải lỗi. Có unit test pending đánh dấu/bỏ dấu và bản cache sạch. |
| F08 | Trạng thái Ghi chú | Không có dirty entry thì footer nói đã lưu, kể cả khi GET ghi chú thất bại. | Trạng thái xét loaded/error/blocked/conflict/localError trước pending. Fixture GET 503 hiện “Ghi chú chưa đồng bộ…” cùng cảnh báo, không báo đã lưu. |
| F09 | Bộ lọc Sổ | Tổng có nội dung nhưng loại đang chọn rỗng thì chỉ hiện khoảng trắng. | Đếm theo loại đang lọc và hiện lời nhắc đúng phạm vi. QA lọc Tô sáng có 0 article và thông báo rỗng. |
| F10 | Escape trong Ghi chú | Escape lúc đang composition có thể đóng panel; Escape tại nút “Thêm công cụ” đóng cả panel thay vì đóng cụm bổ sung. | Bỏ qua Escape đang IME, xử lý Escape ở composer khi cụm mở. QA event isComposing giữ panel; Escape tại nút thêm chỉ đóng cụm, trả focus về nút đó. |

Fixture cũng dọn root khi HMR dispose để tránh cảnh báo createRoot trùng và nhiễu QA khi thay module.

## Kiểm tra

| Nhóm | Kết quả |
| --- | --- |
| Node — model/sync chú thích, batch/cache review, bảo toàn bookmark | **23/23 đạt**, có 5 regression test mới cho cache review và bookmark. |
| Browser — notes model/store/sanitize, restore, conflict, offline, lỗi disk | **7/7 đạt** qua `tests/exam-notes.browser.ts`. |
| API/MySQL local tạm — annotations | **6/6 đạt**: tài khoản, revision race, idempotency, review batch, validation/UTF-16. |
| API/MySQL local tạm — notes | **8/8 đạt**: flag, tài khoản, CAS, tombstone, sanitize, không quota 50. |
| Desktop QA | Palette/slider; bút, hình chữ nhật, mũi tên, tô sáng; undo/redo; giấy nhớ nhập/lưu/sửa/huỷ; ẩn/hiện; tẩy/hoàn tác; xoá/huỷ/hoàn tác; review filter/reload/offline; bookmark hai tab/tài khoản/lỗi dữ liệu; note đổi chip, định dạng, lưu, Sổ và Escape. |
| Mobile/scale | Viewport 375×740, preset 90/100/125: danh sách không tràn ngang, nút đóng vẫn thấy; notes dark 90% không tràn, footer còn trong viewport. Kiểm tra hai panel chồng nhau khi đổi breakpoint. |
| Probe UI của skill | 375/768/1366px, **0 mục xếp Hỏng**; báo cáo `.playwright-mcp/exam-tools-audit-probe/report.json`. Có các cảnh báo cho nội dung minh hoạ và checkbox gốc nằm ngoài panel. |
| Lint | Lint các file TS/TSX sửa bằng bộ ESLint tạm ngoài repo đạt. Không tuyên bố toàn repo lint sạch; dự án chưa có ESLint dependency/config hoàn chỉnh trong package. |
| Build | `npm run build` gồm typecheck và Vite đạt ở bản sửa cuối. Còn cảnh báo chunk lớn đã có từ trước. Có lần thử gặp Windows thiếu commit memory (`ENOMEM`); lần cuối đạt với Node heap 768MiB, semi-space 8MiB, UV_THREADPOOL_SIZE=1, GOGC=20, GOMEMLIMIT=160MiB, GOMAXPROCS=2. Đây là biến môi trường riêng cho tiến trình build, không đổi cấu hình ứng dụng. |
| Server smoke | Server local đang chạy trả HTTP 200 ở `http://127.0.0.1:8000/`; không sửa/restart backend trong audit này. |

Lệnh regression:

```powershell
node --test client/tests/exam-annotation*.test.mjs client/tests/exam-review*.test.mjs client/tests/saved-questions.test.mjs
$env:ANNOTATION_TEST_MYSQL='1'
python -m unittest discover -s server/tests -p test_exam_annotations.py -v
$env:NOTES_TEST_MYSQL='1'
python -m unittest discover -s server/tests -p test_exam_notes.py -v
# Trong browser ở fixture:
# await (await import('/tests/exam-notes.browser.ts')).runNotesTests()
```

Fixture thêm `?audit=1` để có bookmark, đổi tài khoản, gỡ drawer và đáp án ngoài phạm vi; `?offline-notes=1`/`?offline-annotations=1` để mô phỏng lỗi đọc/lưu. Chỉ fixture sử dụng các tuỳ chọn này.

## Giới hạn còn lại

- Lưu câu hỏi hiện vẫn **chỉ lưu trình duyệt theo tài khoản**, không đồng bộ DB/giữa thiết bị. Đây là thiết kế hiện có đã ghi trong saved-questions.md; audit không tự mở rộng schema/API. Ghi chú và chú thích vẫn đồng bộ DB theo cơ chế hiện tại.
- UI QA dùng Chrome với viewport mobile, chưa thay thế kiểm tra trên thiết bị iOS/Android thật. Chưa chạy E2E trên tài khoản production hoặc hết giờ/nộp bài thật.
- Không thể khẳng định không còn mọi bug. Các ca tái hiện trong bảng đã được sửa và kiểm tra lại; giữ các feature flag mặc định tắt như trước.

Ảnh kiểm tra: `.playwright-mcp/exam-tools-audit-notes-mobile.png`; bộ ảnh các kích thước trong thư mục probe. Đây là artifact QA local, không phải tài sản của trang tham chiếu.
