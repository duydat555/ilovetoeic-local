# Khảo sát thanh chú thích TOEIC bằng REA

Ngày khảo sát: 17/10/2026. Trạng thái: đã khảo sát tiếp bằng ảnh, bundle và cửa sổ quan sát 30 giây; đã triển khai và bổ sung lưu database theo yêu cầu tiếp theo. Cờ mặc định tắt; môi trường development local đã bật trên cổng 5173, chưa push/deploy. Agent chỉ quan sát thụ động trang tham chiếu, không tự tạo/xoá chú thích hay gọi API nghiệp vụ của trang đó; người dùng tự thao tác.

## Bằng chứng

- E3 — khảo sát tiếp ngày 17/10/2026, REA `list_browser_targets` tại `http://127.0.0.1:9222`, chỉ cho phép origin `https://byetoeic.com`; Evidence `ev_a174a6f781af47ed4abfe9b013352a93a8e2c8c6707f78f3a8c6829414e18bbb`. Có đúng một page target `27EE1B6FEC539CEDB6204DDCB22FDE9B`, URL `https://byetoeic.com/`, Chrome 155.0.8059.80. Chưa thấy trang làm bài Part 6 trong lần discovery này.
- E4 — REA `capture_web_screenshot` trên target E3 thành công lúc `2026-10-17T11:54:05.092Z` (18:54:05 giờ Việt Nam); Evidence `ev_b48af7cf597893e0deddf822d7cfa7a4cf7a722bea33ef1df774b918f5332100`. Ảnh viewport 1920 × 842, PNG SHA-256 `f9ef8730584a3f9c5ceabffc2d1d84d760f3d49887d8effe8162325d01a19370`, xác nhận đang ở trang chủ có phiên đăng nhập. Không có toolbar bài thi trong viewport này. Lần chụp này không gặp lỗi; không suy diễn trạng thái câu 139–142 từ ảnh trang chủ.

- E1 — REA `list_browser_targets`, Evidence `ev_f0cf698ae83c6a575009269ed857933d8d1447ab8a94b02f3e878f11ea65564d`: tab Chrome tại `https://byetoeic.com/mock-test/9584128e-74ae-5cbd-8345-08d87211b5be/play?mode=practice&parts=6`.
- E2 — REA `inspect_web_page`, Evidence `ev_44c276e125f1f8629c001fc0bad76028be9ba2fc092a552861c17afb1d56deca`: DOM, accessibility, script sources và tên khóa storage; cửa sổ quan sát 1.500 ms. Chỉ cùng origin. Giá trị storage, credential và raw network body không được REA cung cấp.
- S1 — script trong E2: `https://byetoeic.com/assets/useAnnotationStore-BdjFdGi5.js`, SHA-256 `9ada329bdd6c96e7e697220e370287612c0868cb1f1173f278d79e7305d5245d`.
- S2 — script trong E2: `https://byetoeic.com/assets/MockTestPlayPage-Bw6hNpHX.js`, SHA-256 `fc1d3df81f9aeaee85056e0a11c0143c27f55b96b598c0eb34f099b12afd9813`.
- S3 — script trong E2: `https://byetoeic.com/assets/FontSizeControl-CiN6RVvI.js`, SHA-256 `bacc866751cb6c772bfbcb5dd64c8766cd8365ada41cd51657543eba07fbcdf0`.

Các vị trí bên dưới là chỉ số ký tự gần đúng trong chuỗi source REA trả về, không phải số dòng. Phân tích bảng chuỗi được thực hiện như dữ liệu: giải mã chuỗi và tính biểu thức số bằng bộ phân tích do người khảo sát viết; không chạy bundle tham chiếu. Báo cáo không chứa bản sao mã/CSS/icon/tài sản tham chiếu.

## Kết quả và phạm vi kết luận

### Bổ sung phiên Chrome debug 9222 (18:55–18:58 giờ Việt Nam)

| Mã | Evidence ID | Phạm vi |
|---|---|---|
| E5 | `ev_78d21980ac3cd735717f1ab266373f6e4b0ad7129824d5c71eafa2321f6e77f5` | `list_browser_targets`: target E3 đã chuyển sang đúng URL Part 6 của E1. |
| E6 | `ev_27325c41fafa5461e07c1b3208fe687d9088687da6bb10cc24c3e64ac95980fe` | `capture_web_screenshot` thành công: câu 139–142, highlight ở “Medical”, mũi tên, toolbar “3/5”, sổ ghi chú badge 2, checkbox Mark for review; PNG SHA-256 `0538c1f75c67726fc4b2c84cd9794e155c2452cd402d45983ce7a8b6a1fdf389`. |
| E7 | `ev_45ebe925ffd6d6b2ea55bbab70916b64b4b2692b63ac7d1b76cd573a1c58d1ae` | `inspect_web_page`, 1.500 ms, bật script sources, JSON body shapes, storage keys và accessibility text. S1/S2/S3 có cùng digest với E2. |
| E8 | `ev_f33f9c375a6ccc1ace1f2b5467d7aad5d4b7ac6b80625a84fa03e60031107d5f` | `analyze_web_bundle`: 54/54 script được parse, không có parse failure. Bộ dò endpoint tự động không trả endpoint quan sát; các suy luận tự động không thay thế truy vết adapter thủ công. |
| E9 | `ev_1bd07a68e23af964a05fe737394b19f197e25161f1fbaafede1ebe31dc29f326` | `observe_web_session` 30.000 ms, 18:55:26–18:55:56; URL đầu/cuối giống nhau, có 5 lifecycle event. Tool chỉ giữ timeline điều hướng, không giữ request/body. Không chứng minh có/không đổi nhóm nội bộ React. |
| E10 | `ev_6856ad8259a219b04f21cdf751fca004609d6271a29247693f1d7a59e1d62d8f` | `inspect_web_page` 30.000 ms thu mạng và JSON shapes, không có request. Dù được gửi cùng E9, provider xử lý nối tiếp: network coverage chỉ bắt đầu 18:55:56.366, sau E9; không coi đây là cùng cửa sổ thao tác. |
| E11 | `ev_1934d12632dae7b310864c620e54176e5c955c43d31c0c22eaa0f5543983acc1` | Cửa sổ thu mạng riêng 30.000 ms từ 18:56:34.549. Có một GET `/rest/v1/mock_test_attempts`, HTTP 200; lọc theo test/user/status/mode, response shape `{data: string, encrypted: boolean}`. Không phải endpoint chú thích. Không lưu giá trị user ID vào báo cáo. |
| E12 | `ev_a17cf13e44df83c5287c0aee6126f7606e3068c0c07e30930f30630f1ccce19d` | Ảnh sau: cùng nhóm 139–142, cột câu hỏi đã cuộn; viewport/cột đọc rộng hơn E6, highlight vẫn ở “Medical”, mũi tên vẫn gần đoạn employee parking. PNG SHA-256 `557ac61a96d6450d881e1485d33e48a589fabba3a444163a6801808aad675324`. |

Người dùng xác nhận trong chat đã thao tác và lưu được, gồm câu hỏi về đổi nhóm/quay lại. Đây là xác nhận của người dùng, **không phải Evidence request mạng**. Không gán E9/E11 thành bằng chứng lưu server hoặc request không được capture.

#### Các mục trước đây chưa xác nhận

| Mục | Cập nhật có căn cứ | Giới hạn còn lại |
|---|---|---|
| Endpoint/method | Truy vết tĩnh E7/S1 `Ot` → import `D` = export `c3` của `index-CBBSill5.js` → instance `Tr` của class `Nr`. Script index SHA-256 `150b7e1664f6e338b0272875754b8dda294c89bd4665520a7689ea8a98078dcc`; class khoảng 70.900–75.000, adapter S1 khoảng 37.629–39.700. `queryAll` dùng GET `/rest/v1/{table}`, `insert` dùng POST, `upsert` dùng POST với `?on_conflict=...`, `delete` dùng DELETE. Các table: `mock_test_highlights`, `user_annotations`, `mock_test_notes`. | Đã xác nhận hợp đồng trong mã tải xuống E7; chưa quan sát request chú thích thực tế trong E10/E11. Không gọi thử các URL này. |
| Payload | Overlay POST `/rest/v1/user_annotations?on_conflict=user_id,mock_test_id`: `user_id`, `mock_test_id`, `data`, `context: {route, mock_test_id}`, `base_ids`, `changed_ids`; route literal `mock-test`. Note POST `/rest/v1/mock_test_notes?on_conflict=user_id,question_id`: `user_id`, `question_id`, `mock_test_id`, `question_number`, `content`. Highlight POST `/rest/v1/mock_test_highlights`: record highlight cộng `mock_test_id`. Đọc theo user/test, DELETE highlight/overlay theo user và tập id; note theo user/question. E7/S1 + class `Nr`. | Đây là payload tĩnh, không phải raw body runtime. E11 chỉ quan sát response envelope mã hoá của endpoint tiến độ. Không suy ra response chú thích có cùng shape. |
| “3/5” | E7 accessibility node 940 mô tả đã dùng 2/5 hôm nay, còn 3 lượt; mỗi lần bấm dùng tính một lượt, Pro không giới hạn. Node 941 hiển thị 3/5. E6 xác nhận bằng ảnh. Đây là quota còn lại, không phải tiến độ câu hay số chú thích. | Chưa kiểm tra reset ngày/múi giờ và thời điểm debit/refund server. Không đưa giới hạn này vào sản phẩm của mình nếu không có yêu cầu riêng. |
| Tick | E7 node 1019 là checkbox “Đánh dấu để xem lại”, trạng thái false; E6 cho thấy Mark for review. Biểu tượng checklist trên nút xanh ở chân trang đi cùng “9/16”; E7 node 1025 gọi là “Mở danh sách câu hỏi, câu 9 trên 16”. | Không gọi checkbox là “đã xem”, không coi dấu tick trong icon là đáp án đúng hoặc đã hoàn thành. Việc persist checkbox sau reload chưa được capture. |
| Cuộn/reflow/đổi nhóm | E6/E12 cho thấy cột câu hỏi cuộn độc lập và highlight còn bám “Medical” qua thay đổi chiều rộng. E7/S2 hàm `mr`/`yr`/`Dr` (~107.200–110.000) lưu neo sheet/block/screen_key + kích thước theo font. Người dùng xác nhận đã thao tác/lưu. | Không có chuỗi ảnh trước/sau đổi nhóm hoặc scroll của chính cột đoạn văn. Chưa chứng minh mọi nét không lệch sau mọi reflow hay reload. Giữ đây là giới hạn kiểm chứng, không quảng cáo tính chính xác tuyệt đối. |

#### Lưu trữ và mô hình (xác nhận lại E7/E8)

- Highlight/underline neo theo `anchor_id`, quote, offset, prefix/suffix; không dùng vị trí viewport làm nguồn dữ liệu. Overlay v2 có `sheet`, `block`, `screen_key`, `bw`, `bh`, `bfs`; kiểu pen/rect/arrow/text/sticky như bảng bên dưới.
- Adapter đọc/ghi ba tập server nêu trên. Hook `Et` cấp khóa localStorage `annot.pending.v1.{userId hoặc guest}.{mockTestId}` cho store; là dữ liệu chờ đồng bộ, không đồng nhất với khóa sở thích toolbar `annot.toolbar`. Inventory E7 chỉ thấy tên khóa, không đọc giá trị storage.
- Hook đăng ký online/offline và phân loại lỗi quota/auth/retry/fatal. Không suy ra đã đồng bộ thành công chỉ vì localStorage tồn tại. E10/E11 có giới hạn attach và origin; raw headers/body/storage values bị loại bỏ theo thiết kế REA.
- Việc triển khai của ilovetoeic sẽ tự viết theo kế hoạch lưu cục bộ, có phiên bản, mặc định tắt; không sao chép bundle, quota hoặc endpoint của trang tham chiếu.

| Câu hỏi | Quan sát hoặc kết luận từ mã | Bằng chứng / giới hạn |
|---|---|---|
| Thanh công cụ và lớp vẽ | Thanh công cụ là DOM button. Có lớp DOM `data-annot-overlay`, bên trong có SVG. Trong bản chụp DOM không có canvas. Không có bằng chứng đủ để gán chức năng này cho một thư viện vẽ cụ thể. | E2: overlay node 316 → SVG 317; overlay 414 → SVG 415. Accessibility có Chuột, Tô sáng, Gạch chân, Bút vẽ, Tẩy, Hộp chữ, Giấy nhớ, Khoanh vùng, Mũi tên, Hoàn tác, Làm lại, Ẩn ghi chú, Xoá ghi chú, Màu & độ dày. |
| Neo highlight/underline | Lưu `anchor_id`, `selected_text`, `start_offset`, `end_offset`, `prefix`, `suffix`; dựng lại Range từ text node và offset. Mã có nhánh tìm lại bằng văn bản/ngữ cảnh khi offset không khớp. Lớp hiển thị highlight/underline là các hình chữ nhật DOM tuyệt đối, không có bằng chứng về việc bọc span trực tiếp vào văn bản ở tính năng này. | S1 khoảng 2.400–5.000; S2 khoảng 157.900–159.700 và 127.700–128.400. Underline được phân biệt bằng tiền tố trong trường màu. E2 có `data-annot-anchor`. |
| Pen/rectangle/arrow và toạ độ | SVG nhận pointer events. Dữ liệu phiên bản 2 gắn `sheet`, `block`, `screen_key`, `bw`, `bh`, `bfs`. Điểm được quy về gốc block và chia theo cỡ chữ; khi phục hồi có điều chỉnh theo kích thước block. Vì vậy không thể mô tả đơn giản là pixel tuyệt đối hay phần trăm toàn container. | S2 khoảng 107.200–110.000: các hàm biến đổi `vr`, `mr`, `yr`, `Dr`; khoảng 127.700–130.000: viewBox và pointer handlers. Đây là kết luận từ mã, chưa thử vẽ/zoom thực tế. |
| Mô hình chú thích | Highlight có id, neo chữ, thông tin câu/Part, màu và ngữ cảnh chữ. Overlay có tool, màu, các trường neo ở trên; pen có danh sách điểm, rectangle có x/y/w/h, arrow có hai đầu, text/sticky có vị trí và nội dung. Note riêng có question_id, question_number, content. | S1 hàm adapter `Ot` khoảng 37.700–40.500; S2 khoảng 107.200–110.000 và 158.300–159.300. Chưa xác minh toàn bộ trường tùy chọn/giới hạn độ dài. |
| Undo/redo | Hai stack trong React refs; trạng thái giao diện đếm số phần tử. Thêm lệnh vào undo làm rỗng redo. Có lệnh loại thêm highlight và thay đổi overlay; reset store làm rỗng cả hai stack. | S2 khoảng 149.700–151.000. Chưa xác minh tất cả loại lệnh, giới hạn stack hoặc độ gộp từng nét bằng thao tác thực tế. |
| Phạm vi và lưu trữ | Mã có user_id + mock_test_id, thông tin question/anchor, screen_key; không chỉ lưu theo số thứ tự hiển thị. Adapter đọc/ghi các tập `mock_test_highlights`, `user_annotations`, `mock_test_notes`. Có localStorage làm phần lưu cục bộ của store và xử lý online/offline. Tên khóa `annot.toolbar` xuất hiện trong inventory. | S1 adapter `Ot`, hook `Et`, class `Ht`; E2 storage inventory. Không đọc giá trị storage. Chưa chứng minh thời điểm từng thao tác thực sự lưu thành công trên server. |
| Payload | Hợp đồng tĩnh của lưu overlay có user_id, mock_test_id, data, context với route/mock_test_id, base_ids, changed_ids; lưu note có user_id/question_id/mock_test_id/question_number/content. Highlight được gửi cùng mock_test_id. | E7/S1 `Ot` → class `Nr` xác định được method/URL tĩnh như bảng bổ sung phía trên. Chưa capture raw request/response chú thích thực tế. |
| 100%, cuộn, đổi nhóm | Accessibility gọi các nút là Giảm cỡ chữ / Đặt lại cỡ chữ / Tăng cỡ chữ; S3 dùng font scale/percent. Chưa đủ căn cứ gọi đây là zoom toàn bộ trang. Mã gắn lớp vẽ vào sheet/block và lọc theo screen_key; có khả năng phục hồi theo nhóm. | E2 + S2 + S3. Chưa thử cuộn, đổi nhóm hoặc đổi cỡ chữ thực tế; chưa kết luận không lệch nét sau reflow. |
| Bộ đếm / tick | Đã làm rõ bằng E6/E7: 3/5 là quota chú thích còn lại; checkbox là đánh dấu xem lại; 9/16 là vị trí câu và nút mở danh sách. | Chi tiết và giới hạn ở bảng bổ sung phía trên. |

## Điểm bị giới hạn và cách tiếp tục

- Lần chụp trước E3 không trả kết quả trong thời gian chờ; không có Evidence ảnh cho lần đó. Các lần E4/E6/E12 đã thành công; E5/E6 xác nhận đúng trang Part 6. Không kết luận nguyên nhân lần chờ trước là quyền truy cập.
- Đã chạy observe 30 giây E9 và thu mạng E10/E11; endpoint/payload tĩnh, quota/tick đã có căn cứ E7. Request lưu/khôi phục thực tế và hành vi đổi nhóm vẫn có giới hạn nêu rõ phía trên; không đổi nhãn thành “runtime đã xác nhận”.
- E2 không có request trong cửa sổ đính kèm; lưu lượng trước khi REA đính kèm không có. Không suy ra rằng trang không dùng API.
- Không tự tạo chú thích trên tài khoản tham chiếu. Muốn kiểm tra hành vi thực tế, cần người dùng tự thao tác tạo một highlight, một nét, đổi cỡ chữ, cuộn và chuyển nhóm trong cửa sổ quan sát REA. Raw body vốn bị REA loại bỏ; có thể chỉ xác nhận endpoint và cấu trúc body, không hứa khôi phục raw payload bằng công cụ này.
- Sau khi cập nhật báo cáo bằng E5–E12, bắt đầu triển khai theo phạm vi cục bộ đã xác nhận; không cần phụ thuộc endpoint của trang tham chiếu, không tạo migration.

## Hiện trạng ilovetoeic trước triển khai

- Client: React 18, TypeScript, Vite 5; Tailwind 3, Framer Motion 11, Lucide, DOMPurify và Boneyard. State chủ yếu là React hooks/context, không có store chú thích đầy đủ.
- `AnnotatablePassage.tsx` đã có highlight/underline với offset và bọc span trên bản HTML được xử lý. Kiểu `PracticeAnnotation` hiện chỉ có highlight/underline, chưa có màu/nét/hình/undo.
- `PracticeRunnerPage.tsx` có notes theo question ID và annotations theo danh sách question ID trong nhóm, dùng `ResizableSplitPane`.
- `PracticeToolsPanel.tsx` đang dùng drawer ghi chú/chú thích. `TestExamPage.tsx` hiện dùng `PassageContent`, chưa gắn lớp công cụ này.
- Practice session hiện có các trường JSON notes/annotations qua API đã tồn tại. Không thay schema/API để thêm tính năng. Không dùng ngay định dạng mới để ghi đè dữ liệu session cũ.
- Nhánh hiện tại là main và workspace có nhiều thay đổi chưa commit của các công việc khác. Phải giữ nguyên chúng khi triển khai trên nhánh riêng.

## Kế hoạch triển khai đã xác nhận

1. Tạo nhánh `feat/exam-annotations`; giữ nguyên thay đổi đang có. Thêm cờ client `VITE_EXAM_ANNOTATIONS_V2`, mặc định tắt. Khi tắt, luồng ghi chú hiện tại hoạt động như trước. Đọc và áp dụng taste skill khi triển khai giao diện.
2. Tự viết `AnnotationToolbar`, `AnnotationSurface` và reducer/history có kiểu rõ ràng. Đặt toolbar trong cột đoạn văn, giữ cấu trúc split pane. Highlight/underline neo bằng offset + quote/ngữ cảnh; hình/nét neo theo block với hệ toạ độ độc lập viewport, có chuyển đổi khi resize/cỡ chữ thay đổi. Dùng SVG và lớp HTML cho hộp chữ/sticky; không đưa thư viện vẽ nặng nếu chưa cần.
3. Đủ 14 nhóm chức năng được yêu cầu: vị trí nhóm/đánh dấu xem lại/sổ ghi chú có badge; select; highlight; underline; pen; eraser; text; sticky; rectangle; arrow; màu; undo/redo; ẩn/hiện; xoá hết có xác nhận. Sửa cách gọi “đã xem” của đề nghị cũ theo E7: đánh dấu xem lại độc lập với đáp án/chấm điểm và việc lưu câu hỏi. Phím tắt chỉ hoạt động khi không nhập chữ; hỗ trợ Pointer Events, pointer capture, bút/cảm ứng. Trên mobile dùng thanh thu gọn, không chiếm cố định phần đọc.
4. Lưu cục bộ có phiên bản theo user + bài thi + nhóm/câu, phục hồi qua reload; lưu độc lập việc nộp bài/xoá lịch sử và báo lỗi khi hết dung lượng. Đọc được highlight/underline cũ qua adapter không phá dữ liệu. Chưa thêm đồng bộ máy chủ hoặc thay schema/API; nếu cần đồng bộ nhiều thiết bị sẽ trình kế hoạch riêng.
5. Tích hợp vào PracticeRunnerPage (chế độ luyện đề, Part 6 trước; kiến trúc dùng được cho Part 7/Level) và TestExamPage. Viết unit test logic thêm/xoá/undo/redo/serialize/deserialize, kiểm tra dữ liệu lỗi và đổi nhóm. Kiểm tra thao tác trên desktop/mobile, zoom/cỡ chữ/cuộn, pointercancel, xung đột dịch bôi đen. Chạy lint, typecheck, build và kiểm tra server khởi động trong môi trường cô lập DB/Redis; báo riêng lỗi có sẵn. Không push/deploy.

## Triển khai ban đầu và kiểm chứng (trước yêu cầu lưu database)

- Nhánh `feat/exam-annotations`, giữ nguyên các thay đổi chưa commit có sẵn. Không commit/push/deploy. Mã mới nằm trong `client/src/components/exam-annotations/`; tích hợp hai vị trí render passage của mỗi trang PracticeRunnerPage/TestExamPage.
- Cờ build `VITE_EXAM_ANNOTATIONS_V2=true` mới bật toolbar; `.env.example` đặt false. Khi thiếu user ID hoặc cờ tắt, render component cũ; không ghi khóa chú thích mới. Tải component mới qua lazy/Suspense với Boneyard skeleton, có error boundary để tiếp tục làm bài nếu công cụ lỗi.
- Đủ công cụ select/highlight/underline/pen/eraser/text/sticky/rectangle/arrow, màu/độ dày, undo/redo, ẩn/hiện, xoá có xác nhận và hoàn tác, vị trí nhóm, checkbox xem lại độc lập với lưu câu hỏi và điểm, sổ ghi chú có badge.
- Highlight dựng DOM Range từ offset + quote/ngữ cảnh, không bọc lại HTML. Hình/nét lưu block index + fingerprint và toạ độ tương đối; khi browser hỗ trợ caret hit-test thì thêm offset/delta theo cỡ chữ. Block thay nội dung mà không khớp sẽ không hiển thị mark lên văn bản sai. Không sao chép mã/tài sản tham chiếu.
- Lưu phiên bản 1 theo user/scope/group; không sửa API, DB hoặc dữ liệu session cũ. Adapter chỉ đọc highlight/underline cũ. Note cũ hiển thị riêng; thay đổi mới không ghi đè note cũ. Có giới hạn kích thước, số mark/điểm và lịch sử; dữ liệu hỏng/phiên bản lạ không bị ghi đè, xung đột thẻ được chặn, lỗi quota có thử lại/tải bản sao. Bản chưa lưu giữ trong bộ nhớ khi đổi nhóm và cảnh báo rời trang.
- Pointer capture, pointercancel, tắt tra từ khi đang chú thích; select vẫn cho tra từ. Phím tắt chỉ nhận khi focus ở vùng công cụ, không nhận trong input/textarea/select/editor. Cảm ứng dùng thanh cuộn ngang, kích thước bấm 44px; chọn Chuột để cuộn vùng bài đọc.

### Kết quả kiểm tra ngày 17/10/2026

- `node --test tests/exam-annotations.test.mjs`: 6/6 qua, kiểm tra history/undo/redo, serialize, dữ liệu hỏng/phiên bản lạ/giới hạn, quote bị dịch vị trí/ambiguous, adapter không sửa dữ liệu cũ, khóa không va chạm giữa user/scope/group.
- TypeScript `npx tsc --noEmit`: qua. `npm run build`: qua; có cảnh báo chunk >500kB của toàn ứng dụng. Công cụ mới tách thành chunk tải riêng.
- `npm run lint`: không chạy được do executable `eslint` chưa có trong dependencies/node_modules của dự án. Không tự cài thêm hoặc đổi lockfile để che lỗi này.
- Playwright trên trang thử cục bộ 127.0.0.1, không dùng tài khoản/data production: highlight/underline, vẽ ba loại, text/sticky/note, xem lại, undo/redo, tẩy, ẩn/hiện, huỷ/xác nhận xoá và hoàn tác, đổi nhóm/tài khoản và reload đều qua. Kiểm tra viewport 390px không tràn ngang; highlight Range khớp chữ sau đổi chiều rộng. Kiểm tra font 22px và cuộn container vẫn khớp Range. Pointercancel không lưu nét dở.
- Tiêm lỗi storage trên origin thử: giữ nguyên JSON hỏng, chặn ghi đè bản sửa ở thẻ khác, báo lỗi hết dung lượng, giữ bản chưa lưu qua đổi nhóm, thử lưu lại thành công, beforeunload vẫn cảnh báo khi nhóm đang mở không có bản pending. Ghi chú tự lưu khi blur và Escape huỷ xác nhận xoá đã kiểm tra.
- Kiểm tra cờ mặc định tắt trên Vite riêng: hiện fallback cũ, không có toolbar hoặc khóa storage mới.
- Server: import app thật và chạy FastAPI TestClient/lifespan startup/shutdown, GET `/api/v1/status` HTTP 200. Tắt dotenv trước import, thay kết nối MySQL bằng hàm từ chối, Redis false, chặn mạng ngoài và dùng thư mục media tạm. DB disconnected là chủ ý; không chạy migration/query trên DB thật. Có cảnh báo deprecation httpx/TestClient của môi trường. Không tuyên bố đã kiểm thử tích hợp DB production.

### Giới hạn trước khi bật cho user thật

- Chưa có request lưu/khôi phục chú thích của trang tham chiếu trong cửa sổ REA; endpoint/payload vẫn mang nhãn bằng chứng tĩnh. Không ảnh hưởng luồng lưu cục bộ đã chọn.
- Chưa thử cảm ứng/bút trên thiết bị iOS/Android thật hoặc mọi dạng passage phức tạp; kiểm tra viewport nhỏ không thay thế kiểm thử thiết bị. Neo nét trên vùng trống dùng fallback tương đối theo block nên cần kiểm tra trực quan khi reflow mạnh.
- Browser QA dùng passage mẫu cục bộ, chưa chạy bài thi đầy đủ với backend thật. Cờ tiếp tục mặc định tắt để người dùng kiểm tra trước khi bật/merge.

## Bổ sung đồng bộ database theo yêu cầu người dùng — 17/10/2026

Phần này thay thế quyết định chỉ lưu cục bộ ở kế hoạch ban đầu. Không dùng endpoint của trang tham chiếu.

- Backend mới: `server/app/routers/exam_annotations.py`, GET/PUT `/api/v1/exam-annotations`, xác thực bằng `get_current_user`. UserId kỳ vọng chỉ dùng để chặn request bị gửi nhầm sau khi đổi tài khoản; không cho client chọn chủ sở hữu dữ liệu.
- Bảng riêng `user_exam_annotations`, khóa chính `(user_id, document_key)`; document_key là SHA-256 của cặp scope/group được encode JSON. Document JSON có phiên bản, revision, mutation_id và thời điểm tạo/cập nhật. Không phụ thuộc vòng đời practice session hoặc test history; không xoá khi nộp bài/xoá lịch sử.
- Migration additive `server/migrations/20261017_01_add_exam_annotations.sql`, đồng bộ khai báo trong `server/mysql_schema.sql`. Không đổi hoặc ghi đè bảng/column session cũ.
- PUT dùng insert lần đầu hoặc UPDATE có điều kiện revision, trả 409 nếu thiết bị khác đã sửa. MutationId + so sánh document giúp retry sau mất phản hồi không tạo bản ghi trùng/ghi đè. Không clear cache DB toàn cục; GET dùng khóa chính, bypass cache và `Cache-Control: no-store`.
- Validate chặt version, loại chú thích, quote/offset UTF-16, màu, toạ độ hữu hạn, giới hạn số mark/điểm/nội dung, ID trùng. Không lưu HTML thực thi từ nội dung giấy nhớ/hộp chữ.
- Client thêm `sync.ts` và `syncRegistry.ts`: queue riêng theo tài khoản/phạm vi/nhóm, gộp thay đổi 600ms, ghi tuần tự, tiếp tục xử lý khi component unmount. LocalStorage là cache/outbox và giữ metadata revision/mutation; chỉ báo “Đã lưu theo tài khoản” sau phản hồi thành công. Retry khi online hoặc bấm thử lại; không polling.
- Lần mở nhóm: đọc server trước. Local cũ có nội dung mà server chưa có thì tự upload; thiết bị mới đọc bản server. Nếu cả hai khác nhau và không có revision chứng minh an toàn, giữ local và báo xung đột. “Đọc bản máy chủ” giữ bản recovery trước khi thay; không tự chọn last-write-wins. Thứ tự key JSON không tạo xung đột giả.
- Vẫn giữ lịch sử undo/redo sau phản hồi lưu; cập nhật trạng thái lên giao diện trong bố cục cũ. Các note/highlight cũ của practice session giữ nguyên; annotation document mới đồng bộ toàn bộ mark/note/xem lại.

### Backup và áp dụng local

- Chỉ kết nối MySQL local `127.0.0.1:3306`, database `toeic_db` trong container `mysql-toeic`; không thao tác VPS/production.
- Đã tạo backup đầy đủ bằng mysqldump single-transaction, xác minh file trước khi áp dụng migration:
  - `C:/Users/GAMING F15/AppData/Local/CodexBackups/toeic-website/before-exam-annotations-20261017-193232.sql`
  - 119.932.736 bytes; SHA-256 `11a33d10ee06781aaf7e4d7b763f14c214b612ba1d5667f1aea4c66e304c19ba`.
- Đã áp dụng CREATE TABLE IF NOT EXISTS local; API local cổng 8000 đã load endpoint qua OpenAPI. Giữ frontend cổng 5173. Không push/deploy hoặc áp dụng migration lên production.

### Kiểm chứng đồng bộ

- Client: 15/15 test qua, gồm 6 test model ban đầu + 9 test queue/sync (upload local cũ, đọc thiết bị mới, lưu tuần tự khi sửa trong lúc request chạy, retry cùng mutationId, recovery pending qua reload, xung đột giữ local, thứ tự JSON, cache local rỗng, sửa khi GET đang chạy).
- Backend: 5/5 test qua; 4 nhóm kiểm thử API trên database MySQL tạm riêng cùng engine MySQL 8, dùng migration thật, xoá database tạm sau kiểm thử. Có test hai UPDATE đồng thời chỉ một bên thắng, auth/tách tài khoản, retry idempotent, stale revision 409, clear note, validation và UTF-16. Không dùng user hoặc ghi dữ liệu thử vào database ứng dụng.
- Playwright trên 5173 với API giả lập và hai browser context riêng: lưu/khôi phục theo tài khoản, conflict không ghi đè, tạo recovery trước khi đọc server, retry lỗi mạng, undo history còn sau ACK. Không gửi dữ liệu QA vào API/DB của tài khoản thật.
- Kiểm tra build/typecheck và server local; lint vẫn thiếu executable eslint như ghi nhận trước. Cần backup và áp dụng migration riêng trong quy trình deploy trước khi bật trên production.
