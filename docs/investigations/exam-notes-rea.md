# Khảo sát panel Ghi chú bằng REA

Ngày 17/10/2026. Trạng thái: **đã được người dùng duyệt triển khai và thêm TipTap; đã triển khai local trên nhánh `feat/exam-notes`, chưa merge/push/deploy**. Không áp dụng quota ghi chú theo yêu cầu cập nhật. Tài liệu này bổ sung [khảo sát toolbar chú thích](exam-annotation-rea.md), không thay thế kết quả neo highlight/overlay trong tài liệu đó.

## Phạm vi và phương pháp

Chrome debug `http://127.0.0.1:9222`, target `27EE1B6FEC539CEDB6204DDCB22FDE9B`, chỉ origin `https://byetoeic.com`. Trang `/mock-test/9584128e-74ae-5cbd-8345-08d87211b5be/play?mode=practice&parts=6`, Test 1, Part 6, câu 139–142. Agent không nhập, sửa hoặc xoá dữ liệu tham chiếu, không gọi thử API nghiệp vụ. Người dùng tự thao tác.

REA inspect bật script sources, JSON body shapes, storage keys và accessibility. Storage chỉ có tên khóa; không đọc giá trị/token. Bundle được phân tích như dữ liệu, không thực thi. Chỉ số source bên dưới là ký tự gần đúng, không phải dòng. Không sao chép mã, CSS, icon hoặc nội dung bài thi vào triển khai.

## Evidence

| Mã | Evidence ID | Phạm vi |
|---|---|---|
| N1 | `ev_38d4a740747a1ec87740e61d461840ada4718dc804a82a3448de75847b805911` | `list_browser_targets`: đúng target và URL Part 6. |
| N2 | `ev_997d1a44d43930fed18a49b49e8b84c882d07676144bcd456c86366998b51c0d` | `inspect_web_page` 1.500 ms, đủ script sources/JSON shapes/storage keys/accessibility; panel ban đầu đóng. |
| N3 | `ev_f33f9c375a6ccc1ace1f2b5467d7aad5d4b7ac6b80625a84fa03e60031107d5f` | `analyze_web_bundle`: 54/54 script parse thành công. Trùng ID E8 của báo cáo toolbar; bộ dò tự động không xác nhận endpoint runtime. |
| N4 | `ev_48d4f6c8f9dd411b416006019285de35c928ba1f8af1bb372bf87aaffaaac186` | Sau khi người dùng báo mở panel: quota, chip, tab, toolbar, trạng thái ghim. Bắt đầu 19:58:27 giờ Việt Nam. |
| N5 | `ev_c940cfe1e8b70c872b3444584f5ba00c81d7921f82ccd74d2fbfea1ab9d160d8` | `inspect_web_page` thu mạng 30 giây, 19:58:38–19:59:08: request rỗng, không WebSocket. |
| N6 | `ev_d29180293eb3efd9da6128d715d2cec459d3703e4c3481eb22c0e686f2b76047` | `observe_web_session` 30 giây, 19:59:16–19:59:46: URL đầu/cuối giống nhau, 5 lifecycle event. Tool chỉ giữ timeline, không giữ network body. Lifecycle có thể được replay lúc attach, không coi là đã reload trong cửa sổ. |
| N7 | `ev_72fcec14efe22e9e34e0503c120862256a1bb54634a8716b0b7f5d118f8ee062` | Sau quan sát: tab Sổ 2 được chọn; Tất cả 2, Ghi chú 0, Tô sáng 1, Nét vẽ 1. |
| N8 | `ev_5b71d19120a344bf71324ab0c9eba28647993b0169013d7f4da8eeff49f58d0e` | Cửa sổ thu mạng riêng 30 giây, 20:01:04–20:01:34: request rỗng, không WebSocket. |
| N9 | `ev_18e07bc38500cf6d013c31690bd2a6984454681fe5a0b57e6a3c029b1a2b0931` | 20:01:54: badge/Sổ tăng lên 3; tab Ghi chú mở; quota vẫn đã dùng 0/50; cả bốn chip chưa có ghi chú. Có thông báo Đã lưu nhưng không đủ căn cứ gán cho ghi chú văn bản. |

N5/N8 có giới hạn attach và lọc theo policy/origin, không báo dropped event. Không có request được giữ lại **không chứng minh không có API**. N5 và N6 là hai cửa sổ nối tiếp, không cùng coverage. Người dùng xác nhận thao tác là **“Bôi đen chữ”**; không coi là xác nhận đã nhập/lưu ghi chú rich text.

### Script trong N2

| Mã | Asset | SHA-256 |
|---|---|---|
| P | `NotesPanel-ELHJGofo.js` | `aa1f1c874b4482f385b3e39ecc6344cbf6f316c3114d722b08ab723d90e272b8` |
| R | `index-Cozy15uP.js` | `5ad0b6ffbf418929b4b10e14de1c4a2c7ca20af7c54fe3ded4e2931e477f5e4e` |
| S | `useAnnotationStore-BdjFdGi5.js` | `9ada329bdd6c96e7e697220e370287612c0868cb1f1173f278d79e7305d5245d` |
| M | `MockTestPlayPage-Bw6hNpHX.js` | `fc1d3df81f9aeaee85056e0a11c0143c27f55b96b598c0eb34f099b12afd9813` |
| I | `index-CBBSill5.js` | `150b7e1664f6e338b0272875754b8dda294c89bd4665520a7689ea8a98078dcc` |

Các asset cùng đường dẫn `/assets/` trên origin được phép. S/M/I cùng digest với khảo sát toolbar; tái sử dụng truy vết adapter/class thay vì điều tra lại toàn bộ.

## Kết quả

| Câu hỏi | Kết luận và bằng chứng | Giới hạn |
|---|---|---|
| Trình soạn thảo và định dạng | **TipTap/ProseMirror**, lưu **HTML**. N2/P khoảng 13.929–17.000 khởi tạo editor/StarterKit, extension underline/highlight; `onUpdate` lấy `getHTML()`. R chứa TipTap warning (~204.611), ProseMirror (~106.821), React editor hook (~271.199). N4 DOM có contenteditable và style `data-tiptap-style`. | DOM riêng chỉ chứng minh contenteditable; kết luận thư viện dựa thêm imports và implementation trong bundle. Chưa quan sát body ghi thực tế. |
| Công cụ | N4 xác nhận đậm/nghiêng/gạch chân, hai danh sách, Tô màu chữ, Khối lưu ý, Thêm; footer Ctrl+B/I/U. N2/P dùng highlight mark và blockquote. Icon được mô tả ban đầu là thông tin thực tế là **Khối lưu ý**, không chỉ nút trợ giúp. | Chưa thao tác đủ menu Thêm và mọi tổ hợp định dạng. |
| 50/50 | N4 node 1241 mô tả: “Ghi chú — đã dùng 0/50, còn 50 suất. Pro không giới hạn.” Đây là **số suất còn lại/tổng hạn mức**, không phải ký tự hay tiến độ. N2/I hook quota `yE` (~1.163.872), `pE` (~1.169.601) truy vấn feature notes theo tài khoản, không truyền test ID; nhánh total khớp mô tả hiện tại. | 50 là cấu hình tài khoản quan sát, không kết luận mọi tài khoản đều 50. Không thử chạm hạn mức, không xác minh backend hoàn suất khi xoá. |
| Khi đầy | N2/P (~15.900–17.000) chặn soạn ghi chú mới nếu atCap và nội dung ban đầu rỗng; ghi chú có sẵn vẫn cho sửa, có thông báo hạn mức/nâng cấp. | Kết luận tĩnh, chưa thử tài khoản đầy hoặc lỗi đồng thời từ server. |
| Giới hạn nội dung | N2/S (~13.958–17.500): giới hạn 8.000, cảnh báo 7.200 theo độ dài chuỗi HTML; editor kiểm tra cả input/paste. Có sanitize với allowlist p/br/strong/b/em/i/u/s/ul/ol/li/blockquote/mark, thuộc tính màu `data-hl`. | Khác quota 50 suất. Chưa thử sát giới hạn hoặc Unicode/selection replacement; không sao chép thuật toán cắt chuỗi của trang tham chiếu. |
| Tab thứ hai | Là **Sổ 2**, không phải Số 2. N7 xác nhận Sổ là danh mục gồm ghi chú, tô sáng và nét vẽ, nhóm theo câu, có liên kết sổ toàn đề. N2/P (~34.500–36.500) tách tab note/book, dùng tổng số mục. | Chưa thử điều hướng tới sổ toàn đề. |
| Ghim | N4 node 1242 pressed=true, mô tả “Bỏ ghim (tự đóng khi sang câu khác)”. N2/M (~160.100) đóng panel khi screen/group đổi và không ghim; ghim giữ panel mở. Đổi chip trong cùng group không đổi screen key. | Chưa có chuỗi runtime trước/sau đổi nhóm để kiểm chứng. Không có căn cứ nói pin đổi layout. |
| Badge toolbar | N7: 2 = 0 ghi chú + 1 tô sáng + 1 nét vẽ. N2/M (~159.500) truyền tổng notebook cho toolbar/panel. S hàm tổng (~12.769) cộng note + drawing text + highlight + nét vẽ; dữ liệu là notebook của test, không chỉ ghi chú văn bản nhóm hiện tại. N9 tăng lên 3 trong khi các chip vẫn chưa có note. | **Khác yêu cầu triển khai của người dùng:** badge ilovetoeic phải đếm ghi chú của nhóm hiện tại. Không sao chép ngữ nghĩa tổng của trang tham chiếu. |
| Autosave | N2/P (~15.978): debounce **800 ms**, flush khi blur/unmount, nối chuỗi Promise để ghi tuần tự; chỉ ghi khi nội dung thay đổi và đã sẵn sàng. Rỗng thì gọi xoá. S `saveNote` (~35.210–35.750) gọi adapter trực tiếp, cập nhật lạc quan và rollback khi lỗi. | Không cộng thêm debounce 400 ms của highlight/overlay. Chưa đo request runtime; unmount flush không chứng minh trình duyệt chờ hoàn thành. |
| Reload/đổi nhóm | N2/S load (~25.700–27.200) đọc notes cùng highlights/overlay rồi ghép theo question ID; P flush editor khi tháo; M đổi chip/context theo group. | Chưa kiểm chứng reload và chuyển nhóm sau khi nhập note thật. |
| Local hay server | N2/S adapter `Ot` (~37.629–39.700) đọc/ghi tập server `mock_test_notes`. Backup pending (~25.000; hook cuối file) chỉ chứa hlAdd/hlDel/ovAdd/ovDel, không có note; không đủ căn cứ nói ghi chú có outbox local bền vững. | Tên khóa storage không chứng minh nội dung đã được lưu. Không đọc giá trị storage. |
| Hết giờ/nộp bài | Có flush khi editor unmount trong P. | **Chưa xác định** có chờ autosave trước submit/timeout hay không; không tự nộp bài hoặc làm hết giờ trên tài khoản tham chiếu. |

### Hợp đồng API tĩnh, chưa phải request runtime

Nguồn N2/S adapter `Ot` → import/export đã truy vết trong báo cáo toolbar → class `Nr` ở I (~70.900–75.000). Không gọi các URL dưới đây.

| Thao tác | Hợp đồng từ bundle | Runtime N5/N8 |
|---|---|---|
| Đọc | GET `/rest/v1/mock_test_notes`, lọc user_id và mock_test_id, sắp created_at tăng dần; queryAll có phân trang. | Chưa capture request/response shape. |
| Lưu | POST `/rest/v1/mock_test_notes?on_conflict=user_id,question_id`, merge/upsert. Trường tĩnh: user_id:string, question_id:string, mock_test_id:string, question_number:number hoặc null, content:string HTML. | Chưa capture JSON body shape thực tế. Đây là suy ra kiểu từ adapter, không gán thành output JSON-shape của REA. |
| Xoá | DELETE `/rest/v1/mock_test_notes`, lọc user_id và question_id. | Chưa capture. |

Khoá conflict là **tài khoản + question ID**. Test ID nằm trong payload và bộ lọc đọc; part/group là ngữ cảnh UI, không có trường group/part trong payload note nêu trên. Chưa có căn cứ suy ra schema DB/constraint khác ngoài hợp đồng adapter.

## Hiện trạng ilovetoeic

Đã đọc `docs/agents/database.md`, `backend-api.md`, `ui-motion.md`, `exam-annotations.md` và báo cáo toolbar. Không sửa sản phẩm trong vòng khảo sát này.

- React 18/TypeScript/Vite; đã có DOMPurify, Lucide, Framer Motion, Boneyard. Chưa có TipTap/Lexical/Quill/Slate. Có contenteditable không đồng nghĩa đã có editor hỗ trợ selection/history/list/IME đáng tin cậy.
- `client/src/components/exam-annotations/AnnotationSurface.tsx` đang có ghi chú văn bản thuần theo nhóm, mở inline trong passage. `model.ts` document v1 có `note:string`; không được đổi ý nghĩa thành HTML âm thầm. `useAnnotationDocument.ts`, `sync.ts`, `syncRegistry.ts` đã có DB sync/revision/outbox.
- `/api/v1/exam-annotations`, `server/app/routers/exam_annotations.py`, bảng `user_exam_annotations` đã lưu document chú thích, gồm note thuần của nhóm. **Đã có lưu DB cho phần này**, nhưng chưa phải rich note riêng từng câu theo yêu cầu mới.
- `PracticeToolsPanel.tsx` là panel phải với textarea theo câu. Notes của practice session có vòng đời khác và có thể bị xoá khi nộp bài; không dùng làm kho bền vững cho tính năng mới.
- `PracticeRunnerPage.tsx` và `TestExamPage.tsx` render passage ở nhiều nhánh. Panel/provider cần đặt ở cấp màn hình để tránh hai editor hoặc bị tháo khi đổi nhánh hiển thị; cả nút ghi chú phía trên và nút toolbar mở cùng panel.
- Server có BeautifulSoup, chưa thấy dependency sanitizer chuyên dụng trong requirements. DOMPurify hiện có là phía client; không thay cho kiểm tra ở server.
- Nhánh hiện tại `feat/exam-annotations` có nhiều thay đổi chưa commit của các task khác; phải giữ nguyên. Development hiện có dùng **5173**; không tạo cổng 5178. Lint script có nhưng dependency ESLint chưa có trong package.json; cần xử lý rõ trước khi tuyên bố lint đạt.

## Kế hoạch đã được xác nhận

Người dùng xác nhận “Tiến hành code và thêm TipTap”. Các bước dưới đây giữ lại nội dung kế hoạch; kết quả triển khai thực tế ở cuối tài liệu.

1. Tạo nhánh riêng cho notes sau khi được xác nhận, giữ nguyên mọi thay đổi chưa commit; commit chỉ phần của task này. Thêm `VITE_EXAM_NOTES_V2=false` mặc định và cờ server để chặn ghi khi tính năng chưa bật. Không push/deploy, không chạy migration production. Khi duyệt local, dùng server **5173** hiện có.
2. **Đề xuất bổ sung TipTap** cho rich text, history, list, selection và IME: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, các extension underline/highlight phù hợp cùng phiên bản. Xác minh tài liệu chính thức/khả năng tương thích và pin phiên bản trước cài. Đây là dependency mới, **chưa cài, cần người dùng đồng ý**. Tận dụng DOMPurify/UI dependencies sẵn có; không tự xây editor phức tạp bằng contenteditable thuần.
3. Provider ở cấp trang làm bài; panel tiếng Việt có header, pin/đóng, tab Ghi chú/Sổ, ngữ cảnh và chip câu, toolbar, editor, phím tắt. **Không có quota, bộ đếm 50/50 hay nút nâng cấp** theo yêu cầu cập nhật của người dùng. Desktop dùng panel phải; mobile drawer toàn màn hình có focus trap/Escape/trả focus, tab/chip dùng bàn phím, toolbar có tên trợ năng. Pin giữ panel khi đổi nhóm; bỏ pin tự đóng. Dùng taste skill, Boneyard, font/motion/reduced-motion theo hướng dẫn dự án khi bắt đầu UI.
4. Mô hình riêng có kiểu/version/format HTML, danh tính tài khoản + bài thi + nhóm ID ổn định + question ID (không dùng số câu hiển thị làm khoá). Cùng bài nên dùng khoá bài thống nhất giữa luyện và thi. Giữ note nhóm v1 như dữ liệu cũ trong Sổ; không tự gán cho câu đầu hoặc biến thành HTML. Import note thuần theo câu chỉ qua chuyển đổi escape/sanitize có dấu phiên bản, không ghi đè bản mới.
5. Kho DB bền vững riêng, ví dụ `user_exam_notes` và API nội bộ `/api/v1/exam-notes`, migration additive, indexes theo user/test/group, không xoá cùng practice session/history. Server lấy user từ auth, kiểm tra quyền/phạm vi, revision compare-and-swap + mutationId, lỗi conflict giữ recovery. Backup mới trước áp dụng migration, thử local trước. Tái sử dụng nguyên tắc đồng bộ hiện có; không ép rich notes vào schema annotation v1.
6. Autosave dự kiến 800 ms, queue tuần tự tồn tại qua unmount, cache/outbox tách tài khoản và scope, retry khi online; không đè remote khi chưa đọc revision. Blur/đổi chip/đóng/chuyển nhóm flush. Submit/hết giờ chờ đồng bộ có giới hạn thời gian; nếu mạng lỗi vẫn giữ bản chờ và báo rõ, không khoá luồng nộp bài vô thời hạn. Tải lại khôi phục DB và outbox có xử lý conflict.
7. Sanitize HTML theo allowlist riêng cho note tại client **và server**; bỏ script/event handler/style/URL nguy hiểm, ảnh/iframe và nội dung không được hỗ trợ. Không dùng sanitizer passage làm chính sách note. Server dùng parser/serializer allowlist trên dependency hiện có; nếu cần thư viện mới sẽ xin duyệt trước. Kiểm tra cấu trúc HTML và giới hạn sau normalize; không cắt chuỗi làm hỏng markup.
8. **Bỏ hạn mức số lượng ghi chú** theo yêu cầu ngày 17/10/2026: không giới hạn 50/tài khoản, không cơ chế suất/hoàn suất, không chặn tạo mới theo quota. Không sao chép cảnh báo độ dài 7.200/8.000 của ByeToeic thành tính năng sản phẩm; kiểm tra kích thước request phục vụ an toàn API sẽ được xác định riêng trong triển khai. **Badge toolbar vẫn đếm số ghi chú văn bản không rỗng của nhóm hiện tại**, đây là số lượng thực tế, không phải hạn mức. Sổ liệt kê ghi chú và chú thích hiện có với bộ lọc và số lượng riêng.
9. Unit test reducer/serialize/deserialize, HTML rỗng, sanitizer/XSS, legacy; API test quyền truy cập, CAS/idempotency và kiểm tra không còn chặn theo quota số ghi chú. Kiểm tra offline/retry, đổi user/chip/group khi đang ghi, reload, submit/timeout, IME/undo/phím tắt, desktop/mobile. Chạy typecheck/build, lint sau khi có công cụ hợp lệ; kiểm tra server khởi động. Commit nhỏ, chưa merge.

## Chưa xác nhận, cần kiểm chứng khi có điều kiện

- Request/response lưu/đọc/xoá note thực tế, JSON body shape runtime, và độ trễ autosave đo bằng mạng (N5/N8 rỗng).
- Reload/đổi nhóm sau khi nhập rich note: N7/N9 trước đây chưa có text note; N11 dưới đây đã xác nhận UI có ghi chú từng câu, nhưng chưa chứng minh khôi phục sau reload.
- Quota server khi chạm 50, hoàn suất khi xoá, nhiều tab/thiết bị cùng tạo, khác biệt gói tài khoản.
- Pin khi chuyển nhóm thực tế; menu Thêm đầy đủ; trạng thái trước/sau hết giờ và nộp bài.

Các mục chưa xác nhận không được đổi nhãn thành kết luận runtime. Không cần gọi thử API tham chiếu để triển khai API riêng; mọi khác biệt/giả định sản phẩm phải được giữ rõ như kế hoạch trên.

## Kiểm tra lại sau khi người dùng thêm ghi chú (20:07 giờ Việt Nam)

- N10 — `list_browser_targets`, Evidence `ev_78d21980ac3cd735717f1ab266373f6e4b0ad7129824d5c71eafa2321f6e77f5`: cùng target, đúng Part 6 câu 139–142. ID discovery trùng khảo sát trước vì cùng dữ liệu; không coi là phiên thao tác mới đã được replay.
- N11 — `inspect_web_page` 1.500 ms, Evidence `ev_2c85e0db5cd732be017dd13e74d1fb569ea0e2095d0288ee8381dec2a92da13a`, cửa sổ `2026-10-17T13:07:49.923Z`–`13:07:51.485Z`. Bật accessibility, JSON body shapes và storage keys, không tải lại sources vì đã có N2.
- Tab **Ghi chú** được chọn (node 1245); **Sổ 6** chưa được chọn (1246). Chip câu **139, 140, 141 — đã có ghi chú** (1812/1815/1818), **142 — chưa có ghi chú** (1821). Câu 139 đang chọn; editor “Ô soạn ghi chú” (1873) có đoạn văn bản không rỗng (1875). Không sao chép nội dung ghi chú cá nhân vào báo cáo.
- Header tham chiếu hiện **47/50**, mô tả đã dùng **3/50**, còn 47 (1241/1315). Toolbar **Sổ ghi chú (6)** (1054). Kết quả này cập nhật nhận định N9: hiện đã có ghi chú văn bản trên UI, không còn chỉ có thao tác bôi đen. Chưa suy ra thành phần ba mục chú thích còn lại chỉ từ tổng 6.
- Có một GET `/rest/v1/mock_test_attempts` trong cửa sổ attach, status/body shape chưa có tại lúc kết thúc. Đây là đọc tiến độ bài thi, **không phải request ghi chú**. Hoạt động lưu trước attach không có trong capture; vẫn chưa xác nhận request/response lưu hoặc khôi phục note.
- Inventory có thêm tên khóa `mt-notes-open`, `mt-notes-pin`. Không đọc giá trị; không khẳng định giá trị hoặc độ bền của pin chỉ từ tên khóa.
- Yêu cầu mới của người dùng: bỏ tính năng giới hạn ghi chú trong ilovetoeic. Đã sửa kế hoạch bước 3/8/9; các mô tả quota của ByeToeic ở phần bằng chứng được giữ lại như kết quả khảo sát, không phải yêu cầu triển khai.

### Tab Sổ sau khi người dùng chuyển tab (20:08)

- N12 — `inspect_web_page` 1.500 ms, Evidence `ev_c5ce2c7c6316f7d783ec8faba216cf3056dee8718de8a9b5a72020452346ade4`, cửa sổ `2026-10-17T13:08:38.419Z`–`13:08:39.986Z`. Người dùng xác nhận “đã mở sổ”; tab Sổ 6 selected=true (2278), tab Ghi chú selected=false (2276).
- Bộ lọc xác nhận **Tất cả 6 = Ghi chú 4 + Tô sáng 1 + Nét vẽ 1** (2468/2472/2476/2480). Khối “Câu 139–142 · Part 6”, “Đang xem” có bốn mục ghi chú riêng câu **139, 140, 141, 142**, mỗi mục có nút xoá theo câu. Vậy note câu 142 cũng đã xuất hiện ở thời điểm N12; không giữ nhận định N11 “chưa có” như trạng thái mới nhất.
- Mục câu 141 có cấu trúc danh sách và list marker gạch đầu dòng (2535–2545), xác nhận Sổ dựng lại định dạng danh sách trên UI, không chỉ hiển thị HTML như chữ thuần. Không chép nội dung ghi chú cá nhân vào báo cáo. Chưa đủ bằng chứng để xác nhận mọi định dạng đậm/nghiêng/gạch chân được giữ qua reload.
- Có mục tô sáng và một nét bút, mỗi loại có nút xoá riêng; cuối panel có “Xem toàn bộ sổ ghi chú của đề”. Không bấm xoá hoặc điều hướng bằng agent.
- Header tham chiếu hiện 46/50, mô tả đã dùng 4/50. Số 6 của Sổ là tổng các loại mục ở thời điểm này, không phải hạn mức hoặc số ghi chú thuần. Các thay đổi giữa N11 và N12 không được dùng để suy ra thao tác xoá/thêm highlight cụ thể khi không có capture thao tác đó.
- Không có request trong cửa sổ N12. **Đã xác nhận liên hệ UI giữa ghi chú từng câu và danh mục Sổ; chưa xác nhận lưu/đọc DB runtime sau reload.** Đây là phần bổ sung cho các dòng còn chưa xác nhận phía trên, không phải bằng chứng mạng mới.

## Kết quả triển khai ilovetoeic

Phần này là kiểm chứng **ứng dụng của mình**, không phải Evidence runtime của ByeToeic.

- Nhánh `feat/exam-notes`. TipTap/PM/StarterKit/highlight pin **3.32.0**, StarterKit v3 đã có underline; không cài thêm underline trùng lặp. DOMPurify nâng bản vá **3.4.17** vì bản đang dùng có advisory trong audit. UI tự viết bằng Lucide/font/màu hiện có, không dùng tài sản tham chiếu. Tài liệu chính thức đã đối chiếu: [React](https://tiptap.dev/docs/editor/getting-started/install/react), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit).
- `client/src/components/exam-notes/`: model/reducer, queue/registry, workspace/provider cấp trang, panel lazy, TipTap editor, CSS. Hai trang PracticeRunner/TestExam đã tích hợp; nút trên trang và toolbar passage dùng chung panel. Giữ hành vi cũ khi cờ tắt.
- API GET/PUT `/api/v1/exam-notes`, bảng `user_exam_notes`; mỗi câu có revision và mutationId riêng. Khoá gồm user + scope + group + question ID; group là JSON danh sách ID sắp xếp, scope test dùng chung giữa luyện và thi. Xoá lưu tombstone rỗng có revision, ngăn import lại note cũ hoặc ghi đè từ thiết bị cũ. Không có quota số ghi chú; đã thử hơn 50 note.
- HTML v1 có allowlist riêng ở client và serializer attribute-free ở server; loại URL/ảnh/foreign markup/script, cân bằng HTML lỗi, nhận diện HTML rỗng. Mốc 200.000 ký tự chỉ là kiểm tra kích thước vận chuyển API; không có quota tài khoản hay hiển thị hạn mức 50/50/8.000 của trang tham chiếu.
- Gộp lưu 800ms; flush khi blur/đổi chip/đóng/chuyển nhóm; outbox trên thiết bị tách tài khoản và queue sống qua unmount, retry khi online. Không ghi trước khi biết remote revision. Conflict không tự đè; đọc bản server giữ recovery trước, lỗi đọc giữ nguyên bản local. Storage lỗi có thông báo, không hứa đã có bản local bền vững. Trước nộp bài chờ queue tối đa 2 giây; không bảo đảm mọi request hoàn tất khi trình duyệt bị đóng cưỡng bức.
- Sổ hiện liệt kê **nhóm đang xem**: rich notes, ghi chú nhóm cũ, highlight/underline và hình/nét/text/sticky do passage đang gắn cung cấp. Có bộ lọc/xoá; bấm tiêu đề note trở lại editor đúng câu. Chưa tạo trang sổ toàn đề riêng; khi passage không gắn (ví dụ hiển thị bản dịch thay passage), Sổ vẫn có rich notes nhưng không hứa có đủ danh mục chú thích passage. Badge toolbar chỉ đếm rich notes không rỗng của nhóm theo yêu cầu.
- Mobile là panel toàn màn hình, khóa tương tác vùng bài, focus trap/Escape/trả focus; tab và chip hỗ trợ phím mũi tên/Home/End. Desktop chừa bề rộng panel, không che cột câu hỏi. Pin giữ mở khi đổi nhóm; bỏ pin tự đóng. Tôn trọng reduced-motion và có Boneyard khi tải.

### Local và database

- `.env.example` client/server mặc định **false**; chỉ cấu hình local được bật `VITE_EXAM_NOTES_V2=true` và `EXAM_NOTES_ENABLED=true`. Frontend vẫn **5173**, API **8000**. Không ghi secret vào code/commit, không push/deploy/migrate production.
- Trước áp dụng migration local đã xác nhận DB loopback `toeic_db`, backup mới: `C:/Users/GAMING F15/AppData/Local/CodexBackups/toeic-website/before-exam-notes-20261017-202004.sql`, 119.936.074 byte, SHA-256 `66f598b709db56955218d211a766dbb98ef788098b440c41cae7acf0b69449db`. Bảng mới ban đầu 0 dòng. Migration production vẫn cần backup/review riêng.
- QA luồng thật dùng tài khoản local tạm riêng, không sửa note của người dùng hiện có. Đã thấy document HTML gạch chân và revision 1 trong MySQL, reload giữ đúng HTML, cùng note xuất hiện ở trang thi của cùng bài; mất mạng giữ bản chờ, có mạng lại tự lưu. Tài khoản/session/note QA được dọn sau kiểm tra.

### Kiểm tra

- **8 test Python đạt**: sanitizer/schema và API trên database MySQL dùng một lần; auth/flag/phạm vi, sanitize roundtrip, CAS đồng thời, retry idempotent, tombstone; tạo 55 note không bị chặn. Lệnh: `NOTES_TEST_MYSQL=1 python -m unittest discover -s server/tests -p test_exam_notes.py -v` (PowerShell dùng `$env:NOTES_TEST_MYSQL='1'` trước lệnh).
- **7 nhóm test trình duyệt đạt** tại `client/tests/exam-notes.browser.ts`: reducer, version/serialize, sanitize/XSS, legacy escape, không giới hạn 8.000, ghi nối tiếp, retry cùng mutation, conflict/unknown remote, storage/cross-tab, recovery khi tải lỗi. Trên Vite local chạy `await (await import('/tests/exam-notes.browser.ts')).runNotesTests()`.
- **15 test annotation hiện có đạt** qua `node --test client/tests/exam-annotation*.test.mjs`.
- Desktop 1440×900 và mobile 390×844: format đậm/gạch chân/list, chip/tab, Sổ, delete, reload, pin/group, nút toolbar/header chung panel, focus return, không tràn ngang; luồng thật Practice → Exam và offline → online đã thử. Fixture dev ở `/tests/exam-notes.fixture.html` dùng transport giả, không dùng dữ liệu tài khoản. Ảnh QA giữ trong `.playwright-mcp/`, không commit.
- Typecheck/build đạt. Một lần build lại gặp Node heap OOM; chạy lại thành công với `NODE_OPTIONS=--max-old-space-size=4096 --max-semi-space-size=64`. TipTap/editor ở chunk lazy riêng, không tải ngay khi làm bài. API `/api/v1/status` HTTP 200, MySQL connected; notes không có token trả 401.
- `npm run lint` toàn repo chưa chạy được vì project chưa có ESLint/config trong dependencies. Đã chạy lint riêng cho toàn bộ module/fixture/test notes bằng ESLint + TypeScript parser trong thư mục công cụ tạm ngoài repo, không lỗi/cảnh báo; không tuyên bố lint toàn bộ code cũ đạt. Không cài thêm dependency lint vào sản phẩm. Audit còn các advisory dependency có sẵn ngoài phạm vi tính năng; không tự chạy audit fix toàn repo.
- Chưa kiểm tra trên thiết bị iOS/Android thật, chưa cố tình làm hết giờ/nộp bài thật để tránh tạo lịch sử ngoài QA. Không coi test fixture là bằng chứng DB; phần DB dùng API MySQL riêng và tài khoản QA local như trên.

Các thay đổi đã có trước task được giữ nguyên. Commit chỉ chọn phần notes trong các file dùng chung; bridge mới trong `AnnotationSurface.tsx` nằm cùng thư mục annotation vốn chưa được track từ task trước, giữ lại trong working tree để không commit lẫn toàn bộ tính năng cũ. Cần review cùng phần annotation đó trước merge.

### Điều chỉnh toolbar theo yêu cầu tiếp theo

Toolbar đã chuyển thành cột dọc 54px riêng, sticky cạnh bài đọc khi cuộn. Chiều cao giới hạn theo viewport/vùng cuộn thực tế, màn hình thấp cuộn riêng các công cụ; không dùng tọa độ của toolbar để lưu neo chú thích. Boneyard tải ban đầu đổi thành hai cột tương ứng. QA fixture `/tests/exam-notes.fixture.html?scroll=1`: cuộn bài từ 220px đến 480px và cuối bài, toolbar giữ Y=24px; mobile 390×640 không tràn ngang/đè chữ, vẫn tới được lựa chọn nét; ArrowDown chuyển focus đúng công cụ, tô sáng sau thay đổi layout vẫn hoạt động. Typecheck/build đạt. Các file annotation vốn chưa track được giữ nguyên trạng thái để tránh commit lẫn công việc trước.

Yêu cầu tiếp theo thay vị trí DOM: toolbar hiện portal vào `.exam-notes-workspace > div.exam-annotation-dock` **con thứ hai**, div đầu giữ màn hình làm bài. Không còn toolbar bên trong `.exam-annotation-layout` khi có workspace; có cột riêng và không phụ thuộc cuộn passage. Khi notes flag tắt nhưng annotations bật vẫn có dock, không tạo API ghi chú ngoài cờ. Đã kiểm tra DOM thứ tự hai div, cuộn không đổi vị trí, nút Sổ vẫn mở chung panel, mobile 390×640 không tràn/đè chữ và toolbar giới hạn 592px trong fixture. Build đạt sau thay đổi.

### Bổ sung ngày 18/10/2026: tìm nhanh nhóm cần xem lại

- `QuestionDrawer` có bộ lọc **Xem lại** (Review ở giao diện tiếng Anh), số lượng tính theo câu, icon cờ riêng với bookmark Đã lưu. Đánh dấu nhóm thì mọi câu trong nhóm xuất hiện ở bộ lọc; bấm câu giữ chỉ số gốc để nhảy đúng nhóm rồi đóng drawer. Drawer nằm trên panel note để không bị che.
- Hook `useReviewMarks` dùng cùng user/scope/group với document annotation hiện có ở cả luyện/thi. Chỉ đọc khi mở navigator, cập nhật ngay theo queue local khi đánh dấu/bỏ dấu; so revision để dữ liệu server mới hơn không bị cache cũ che. Có skeleton/thông báo lỗi/nút thử lại; không thêm polling, migration hay ghi dữ liệu production.
- API đọc batch: POST `/api/v1/exam-annotations/review-status`, body `{userId, scope, groups: string[]}` (1–200 nhóm); response `{groups: [{group, review, revision}]}`. Auth lấy user từ phiên, kiểm tra userId; hash khoá nhóm như GET/PUT hiện có, truy vấn PK theo user + IN hashes, chỉ đọc review/revision, `Cache-Control: no-store`.
- Test MySQL disposable: **6 test backend đạt**, gồm đánh dấu/đọc batch/bỏ dấu, nhóm chưa tồn tại, tách user/scope, giới hạn batch; **15 test annotation client cũ đạt**. Fixture xác nhận đánh dấu 139–142 → lọc đúng bốn câu → nhảy lại đúng nhóm → reload giữ dấu → bỏ dấu thì danh sách rỗng; mobile 390×640 không tràn ngang. Typecheck/build và lint riêng các file thay đổi đạt. Chưa deploy.
- Yêu cầu gộp màu/nét cũng đã kiểm tra: một icon bảng màu có chấm màu đang chọn, popover 6 màu số 1–6 và slider 1–8, Escape đóng/trả focus; màu xanh và độ dày 8 cập nhật đúng. Không dùng gradient; popover hỗ trợ fullscreen và reduced-motion. Không đổi dữ liệu màu đã lưu trước đây.

### Sửa lỗi request xem lại vượt giới hạn batch

Sau log `POST /api/v1/exam-annotations/review-status 422`, kiểm tra thấy client gửi nguyên danh sách nhóm trong khi schema API chỉ nhận tối đa 200. Level tập hợp câu từ nhiều đề có thể vượt giới hạn này. Log access riêng không có validation detail nên chưa đủ để khẳng định đó là payload cụ thể của người dùng; đã sửa lỗi hợp đồng có thể tái hiện này tại client: tách tuần tự tối đa 200 nhóm/request, loại trùng, gộp đủ kết quả và hủy request khi đóng/đổi phạm vi. Giữ giới hạn backend để bảo vệ query. UI giữ thông báo lỗi kèm thông điệp validation từ API nếu còn lỗi khác.

Regression: 503 nhóm được chia 200/200/103, giữ đủ 503 kết quả; danh sách rỗng không gửi, khóa trùng chỉ đọc một lần, batch sau lỗi hoặc response thiếu không được coi là thành công. Ba test Node mới và sáu test API/MySQL đạt; build đạt. Không migration hoặc sửa dữ liệu người dùng.

### Giấy nhớ nhập ngay trên bài đọc

Theo ảnh người dùng cung cấp, công cụ Giấy nhớ đã đổi từ form phía trên passage sang textarea nằm trong paper tại neo vừa bấm: mặc định 204×60px, nền màu đang chọn, viền trắng/focus xanh, placeholder `...`, tự focus và tự tăng chiều cao tới 220px. Chiều rộng/vị trí kẹp trong paper trên màn hình hẹp; màu chữ chọn theo độ sáng nền để đọc được. Hộp chữ vẫn dùng form hiện có.

Bấm ngoài hoặc Ctrl+Enter lưu, Enter xuống dòng, Escape huỷ bản sửa; có chặn commit khi IME đang composition và chặn blur lưu lặp sau Escape. Giấy mới rỗng bị bỏ; giấy cũ rỗng thì xoá bằng cùng lịch sử undo. Bấm giấy đã lưu để sửa ngay tại vị trí cũ. Neo block/caret, schema document và API/queue DB giữ nguyên, không migration.

QA fixture desktop: ô nhập nằm trong paper, tự focus, nền đỏ, 204×60, không còn group form Giấy nhớ; blur lưu, Escape giữ nguyên nội dung trước sửa, Ctrl+Enter lưu nhiều dòng và reload giữ đúng ID/nội dung. Mobile 390×640 bấm sát mép phải vẫn nằm trong paper, không tràn ngang; giấy rỗng không tạo record, công cụ Hộp chữ vẫn mở form. 15 test annotation hiện có, typecheck/build và lint phần sửa đạt. Đây là QA trên fixture, không phải capture hành vi ByeToeic mới.

### Hộp chữ nhập trực tiếp và thu gọn (18/10/2026)

Theo yêu cầu tiếp theo, Hộp chữ cũng dùng textarea tại neo trên bài đọc, thay form phía trên. Kích thước khởi đầu hiện tại của cả Hộp chữ và Giấy nhớ là 168×44px, tăng chiều cao theo nội dung tới 220px, viền xanh 3px khi nhập. Hộp chữ có nền trong suốt, góc vuông và chữ theo màu chọn; khi lưu thu vừa nội dung (tối đa 204px, kẹp trong paper). Bấm bản đã lưu để sửa; blur/Ctrl+Enter lưu, Escape huỷ, nội dung rỗng bỏ mới/xoá bản cũ. Giữ schema, anchor và queue DB hiện có.

QA fixture desktop: tự focus, nền trong suốt, 168×44px; ba dòng tăng lên 73px; blur thu còn khoảng 111×26px với nội dung ngắn. Escape giữ bản cũ, Ctrl+Enter và reload giữ ID/nội dung. Mobile 390×640: bấm sát mép phải vẫn nằm trong paper, không tràn ngang; Giấy nhớ vẫn có nền màu và góc bo. 15 test annotation, lint file sửa và build (gồm typecheck) đạt. Đây là kiểm tra triển khai bằng fixture, không phải Evidence ID mới từ REA hoặc kiểm tra trực tiếp DB production.

### Chỉnh UI/UX panel Ghi chú (18/10/2026)

Áp dụng skill `/evon:ui-ux` đã cài và `redesign-existing-projects`, sau khi đọc AGENTS.md và hướng dẫn UI motion/chú thích. Phạm vi là component panel trong màn làm bài. Ảnh người dùng cung cấp là hiện trạng: giữ các chức năng, bố cục panel phải, thay phân cấp và khoảng cách. Dùng token màu/font sẵn có (màu nhấn vàng, Inter/Be Vietnam Pro), tab segmented, chip chọn câu, trạng thái ghim, toolbar gọn, vùng viết có thể bấm suốt phần trống, footer trạng thái lưu và phím tắt. Light/dark, safe area và vùng bấm mobile được kiểm tra; không thêm thư viện, không đổi API/schema/feature flag.

Motion: trượt từ mép phải bằng transform 350ms hai chiều, không scale/fade toàn panel, tắt khi reduced-motion. Giữ diện tích dành cho panel đến khi exit hoàn tất. Công cụ bổ sung có vào/ra nhẹ, Escape chỉ đóng cụm này. Dùng Boneyard với fallback khớp hình dạng chip/toolbar/dòng chữ, không gradient.

QA: probe của skill ở 375/768/1366px, đã sửa tương phản placeholder, vòng cuối không có mục xếp Hỏng. Ảnh chụp desktop/mobile/dark trong `.playwright-mcp/notes-panel-redesign-*.png`. Kiểm tra thực tế bằng fixture: định dạng đậm, mở/đóng công cụ thêm, ghim và đổi nhóm, exit trước unmount, giữ/trả diện tích bài, trả focus về nút mở, dialog/inert/focus trap mobile, reduced-motion không transform. Bảy test notes trong browser đạt; lint phần sửa và build gồm typecheck đạt. Dữ liệu fixture là giả; không thao tác dữ liệu production. Probe có cảnh báo riêng cho phần bài đọc/checkbox gốc ngoài phạm vi panel và favicon fixture 404.

### Đồng bộ kích thước panel với cài đặt hiển thị

Audit tiếp theo bao phủ toolbar, review, bookmark và notes: [Báo cáo 18/10/2026](exam-tools-audit-2026-10-18.md). Có sửa lỗi focus, khoá cuộn, trạng thái lưu, bộ lọc rỗng và Escape/IME; xem bảng F01–F10 và kết quả regression trong báo cáo.

Sửa các kích thước px cố định của chữ, icon, control, khoảng cách, chiều rộng panel và Boneyard fallback sang rem. Tiêu đề giảm từ 18px cố định xuống 1rem. Dùng đúng root size do applyDisplaySettings đặt, không thêm zoom/scale riêng. Mức hiển thị 90% của ứng dụng hiện ánh xạ thành 0.80 (root 12.8px); giữ nguyên quy ước này. Diện tích bài dành cho panel co giãn cùng panel; vùng bấm mobile vẫn cao 44px.

QA bằng chính applyDisplaySettings trên fixture: các preset 90/100/110/125 lần lượt cho root 12.8/16/18.4/20.8px và panel rộng 312/390/448.5/507px. Ở 90%, tiêu đề 12.8px, nút tab 10.4px, editor 11.2px và icon định dạng 12.8px. Mobile 375px ở mức nhỏ/lớn nhất không tràn ngang, footer vẫn hiện và còn vùng viết. Build gồm typecheck đạt; ảnh `.playwright-mcp/notes-panel-scale90-desktop.png` và `notes-panel-scale90-mobile.png`. Chỉ sửa CSS panel và tài liệu, không đổi cài đặt lưu của người dùng.

### Giữ panel ghim đứng yên khi đổi nhóm — 20/10/2026

Nguyên nhân: Panel có React key gồm cả group nên mỗi lần đổi nhóm bị unmount/mount, chạy lại hiệu ứng mở và autofocus. Bỏ group key khỏi shell (workspace vẫn tách user/scope); chỉ editor bên trong key theo nhóm và câu. Flush store cũ khi đổi store; xác nhận xoá tách theo nhóm và bị huỷ khi rời nhóm. Giữ skeleton tải nội dung và hiệu ứng mở/đóng thực sự.

QA fixture: ghim rồi chuyển 139–142 sang 143–146 và quay lại giữ đúng cùng DOM panel; 12 frame sau đổi nhóm đều có transform none. Nội dung nhóm cập nhật và draft nhóm 139 được phục hồi đúng. Bỏ ghim rồi đổi nhóm đóng panel; mở lại vẫn có hiệu ứng trượt. Bảy test notes browser, lint phần sửa và build đạt.
