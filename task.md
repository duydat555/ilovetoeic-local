Hãy thiết kế và lập trình giao diện website học TOEIC hiện đại bằng React, tuân thủ đầy đủ các yêu cầu sau.

## 1. Công nghệ sử dụng

* Sử dụng React với Vite.
* Sử dụng JavaScript hoặc TypeScript, ưu tiên TypeScript.
* Sử dụng Tailwind CSS để xây dựng giao diện.
* Sử dụng React Router DOM để điều hướng giữa các trang.
* Tất cả icon phải sử dụng thư viện Lucide React từ:
  https://lucide.dev/
* Có thể sử dụng Recharts để tạo biểu đồ thống kê kết quả học tập.
* Có thể sử dụng Framer Motion để tạo hiệu ứng chuyển động nhẹ.
* Có thể sử dụng Zustand hoặc React Context để quản lý trạng thái.
* Không sử dụng icon dạng ký tự bàn phím, emoji hoặc Unicode để thay thế icon.
* Không sử dụng các icon như “→”, “✓”, “★”, “☰”, “×” bằng ký tự văn bản. Hãy sử dụng icon tương ứng từ Lucide React như ArrowRight, Check, Star, Menu, X.

## 2. Mục tiêu thiết kế

Thiết kế một website học và luyện thi TOEIC có giao diện:

* Hiện đại, chuyên nghiệp và thân thiện với người học.
* Bố cục rõ ràng, dễ sử dụng.
* Tối ưu cho cả máy tính, máy tính bảng và điện thoại.
* Phong cách tương tự các nền tảng học trực tuyến hiện đại.
* Không sao chép hoàn toàn giao diện của website khác.
* Sử dụng khoảng trắng hợp lý.
* Hạn chế sử dụng quá nhiều màu sắc.
* Có hiệu ứng hover, focus và chuyển trang mượt mà.
* Đảm bảo khả năng đọc tốt và hỗ trợ accessibility.

## 3. Phong cách màu sắc

Sử dụng bảng màu chủ đạo:

* Màu xanh dương làm màu chính, thể hiện sự tin cậy và tập trung.
* Màu xanh lá dùng cho trạng thái hoàn thành và câu trả lời đúng.
* Màu đỏ dùng cho câu trả lời sai hoặc cảnh báo.
* Màu vàng/cam dùng cho chuỗi ngày học và thành tích.
* Nền sáng với các màu trắng, xám rất nhạt.
* Chữ chính màu xám đậm hoặc xanh đen.

Gợi ý:

* Primary: blue-600.
* Secondary: indigo-500.
* Success: emerald-500.
* Warning: amber-500.
* Danger: red-500.
* Background: slate-50.
* Text: slate-800.

Hỗ trợ Dark Mode nhưng không bắt buộc bật mặc định.

## 4. Font chữ

* Sử dụng font Inter, Be Vietnam Pro hoặc một font sans-serif hiện đại.
* Tiêu đề phải nổi bật nhưng không quá lớn.
* Nội dung có độ tương phản tốt.
* Các nút và nội dung quan trọng phải dễ đọc trên màn hình nhỏ.

## 5. Cấu trúc tổng thể

Website gồm:

* Sidebar hoặc thanh điều hướng bên trái trên desktop.
* Header trên cùng.
* Nội dung chính ở giữa.
* Sidebar tự thu gọn trên tablet.
* Trên điện thoại, sidebar chuyển thành menu dạng drawer.
* Thanh điều hướng dưới màn hình trên mobile có thể được sử dụng cho các chức năng chính.

Menu chính gồm:

1. Tổng quan.
2. Lộ trình học.
3. Luyện tập.
4. Thi thử.
5. Từ vựng.
6. Ngữ pháp.
7. Listening.
8. Reading.
9. Kết quả.
10. Bảng xếp hạng.
11. Hồ sơ cá nhân.
12. Cài đặt.

Mỗi menu phải có icon phù hợp từ Lucide React, ví dụ:

* Tổng quan: LayoutDashboard.
* Lộ trình học: Map.
* Luyện tập: BookOpenCheck.
* Thi thử: ClipboardCheck.
* Từ vựng: Languages.
* Ngữ pháp: LibraryBig.
* Listening: Headphones.
* Reading: BookOpen.
* Kết quả: BarChart3.
* Bảng xếp hạng: Trophy.
* Hồ sơ: UserRound.
* Cài đặt: Settings.

## 6. Trang Landing Page

Tạo trang giới thiệu dành cho người chưa đăng nhập.

### Header

Bao gồm:

* Logo website.
* Menu: Trang chủ, Lộ trình, Luyện thi, Tính năng, Bảng giá.
* Nút Đăng nhập.
* Nút Học miễn phí.
* Menu mobile sử dụng icon Menu và X từ Lucide.

### Hero Section

Bao gồm:

* Tiêu đề lớn, ví dụ: “Chinh phục TOEIC theo lộ trình dành riêng cho bạn”.
* Mô tả ngắn về nền tảng.
* Nút “Bắt đầu học miễn phí”.
* Nút “Làm bài kiểm tra đầu vào”.
* Hình minh họa hoặc mockup dashboard học tập.
* Hiển thị một số thống kê như số người học, số đề thi, số câu hỏi.

### Phần tính năng

Hiển thị các card:

* Lộ trình học cá nhân hóa.
* Luyện Listening và Reading.
* Kho đề thi TOEIC.
* Học từ vựng bằng flashcard.
* Phân tích điểm mạnh và điểm yếu.
* Theo dõi tiến độ học tập.

Mỗi card phải có icon Lucide, tiêu đề và mô tả.

### Phần lộ trình học

Trình bày các bước:

1. Kiểm tra trình độ đầu vào.
2. Chọn mục tiêu TOEIC.
3. Nhận lộ trình cá nhân hóa.
4. Học và luyện tập mỗi ngày.
5. Thi thử và cải thiện điểm số.

### Phần đánh giá

Hiển thị nhận xét của học viên bằng card có avatar, tên, điểm TOEIC đạt được và nội dung đánh giá.

### Footer

Bao gồm:

* Logo và giới thiệu ngắn.
* Liên kết sản phẩm.
* Liên kết hỗ trợ.
* Chính sách bảo mật.
* Điều khoản sử dụng.
* Mạng xã hội sử dụng icon Lucide phù hợp hoặc icon từ thư viện chuyên dụng nếu Lucide không hỗ trợ.

## 7. Trang đăng nhập và đăng ký

Thiết kế giao diện dạng hai cột trên desktop:

* Một bên là hình ảnh hoặc nội dung giới thiệu.
* Một bên là form.

Form đăng nhập gồm:

* Email.
* Mật khẩu.
* Ghi nhớ đăng nhập.
* Quên mật khẩu.
* Nút đăng nhập.
* Đăng nhập bằng Google.
* Liên kết chuyển sang đăng ký.

Form đăng ký gồm:

* Họ tên.
* Email.
* Mật khẩu.
* Xác nhận mật khẩu.
* Mục tiêu TOEIC.
* Đồng ý điều khoản.
* Nút tạo tài khoản.

Sử dụng icon Mail, LockKeyhole, Eye, EyeOff và UserRound từ Lucide React.

Có validate form và hiển thị lỗi rõ ràng.

## 8. Dashboard học viên

Trang dashboard sau khi đăng nhập phải bao gồm:

### Header

* Lời chào người học.
* Thanh tìm kiếm.
* Nút thông báo.
* Chuỗi ngày học liên tục.
* Avatar và menu tài khoản.

### Thẻ mục tiêu TOEIC

Hiển thị:

* Điểm hiện tại.
* Điểm mục tiêu.
* Ngày thi dự kiến.
* Thanh tiến độ.
* Số điểm cần cải thiện.
* Nút cập nhật mục tiêu.

### Hoạt động hôm nay

Hiển thị danh sách bài học cần hoàn thành:

* Học từ vựng.
* Luyện Part 2.
* Làm bài Reading Part 5.
* Ôn tập lỗi sai.
* Bài thi nhanh.

Mỗi hoạt động có:

* Icon.
* Tên hoạt động.
* Mô tả.
* Thời gian dự kiến.
* Số câu hỏi.
* Trạng thái.
* Nút bắt đầu hoặc tiếp tục.

### Thống kê học tập

Hiển thị:

* Tổng thời gian học.
* Số câu đã làm.
* Độ chính xác.
* Chuỗi ngày học.
* Biểu đồ điểm Listening và Reading theo thời gian.
* Biểu đồ hoạt động trong tuần.

### Điểm yếu cần cải thiện

Hiển thị các kỹ năng như:

* Từ vựng kinh doanh.
* Part 3 hội thoại.
* Part 5 ngữ pháp.
* Part 7 đọc hiểu.

Mỗi kỹ năng có phần trăm chính xác và nút luyện tập.

### Thành tích

Hiển thị badge thành tích như:

* Hoàn thành bài đầu tiên.
* Học liên tục 7 ngày.
* Trả lời đúng 100 câu.
* Đạt độ chính xác trên 90%.

Icon thành tích sử dụng Award, Medal, Trophy, Flame hoặc BadgeCheck.

## 9. Trang lộ trình học

Trang này hiển thị lộ trình theo từng giai đoạn:

* Giai đoạn 1: Xây dựng nền tảng.
* Giai đoạn 2: Làm quen từng Part.
* Giai đoạn 3: Luyện tập chuyên sâu.
* Giai đoạn 4: Thi thử.
* Giai đoạn 5: Ôn tập trước kỳ thi.

Mỗi giai đoạn gồm nhiều bài học.

Mỗi bài học có:

* Tên bài học.
* Kỹ năng.
* Thời lượng.
* Số bài tập.
* Trạng thái chưa học, đang học hoặc đã hoàn thành.
* Điểm đạt được.
* Nút học ngay hoặc học tiếp.

Hiển thị đường nối hoặc timeline giữa các bài học.

Bài học bị khóa phải sử dụng icon LockKeyhole.

Bài học hoàn thành sử dụng CircleCheck.

Bài học hiện tại phải được làm nổi bật.

## 10. Trang luyện tập TOEIC

Cho phép người dùng lựa chọn:

* Listening.
* Reading.
* Theo từng Part.
* Theo chủ đề.
* Theo độ khó.
* Theo số lượng câu hỏi.
* Theo thời gian làm bài.

Các Part gồm:

### Listening

* Part 1: Photographs.
* Part 2: Question–Response.
* Part 3: Conversations.
* Part 4: Talks.

### Reading

* Part 5: Incomplete Sentences.
* Part 6: Text Completion.
* Part 7: Reading Comprehension.

Mỗi Part được hiển thị dưới dạng card có:

* Tên Part.
* Mô tả.
* Số câu đã luyện.
* Độ chính xác.
* Mức độ thành thạo.
* Nút luyện tập.

Có bộ lọc và thanh tìm kiếm bài luyện tập.

## 11. Giao diện làm bài Listening

Trang làm bài Listening phải bao gồm:

* Thanh tiến độ.
* Số câu hiện tại.
* Tổng số câu.
* Đồng hồ đếm thời gian.
* Nút nộp bài.
* Trình phát audio.
* Nút phát, tạm dừng, tua lại và điều chỉnh âm lượng.
* Không sử dụng ký tự Unicode làm nút điều khiển audio.
* Sử dụng Play, Pause, RotateCcw, Volume2 và VolumeX từ Lucide React.

Phần câu hỏi gồm:

* Hình ảnh nếu là Part 1.
* Nội dung câu hỏi nếu được phép hiển thị.
* Các đáp án A, B, C hoặc D.
* Cho phép chọn một đáp án.
* Làm nổi bật đáp án đã chọn.
* Có danh sách số câu để chuyển nhanh giữa các câu.

Sau khi nộp bài:

* Hiển thị đáp án đúng.
* Hiển thị đáp án người dùng chọn.
* Giải thích chi tiết.
* Transcript.
* Từ vựng quan trọng.
* Nút thêm câu hỏi vào danh sách cần ôn tập.

## 12. Giao diện làm bài Reading

Trang Reading có bố cục phù hợp với từng Part.

### Part 5

* Một câu có chỗ trống.
* Bốn đáp án.
* Hiển thị giải thích sau khi hoàn thành.

### Part 6

* Đoạn văn bên trái.
* Danh sách câu hỏi bên phải.
* Cho phép cuộn độc lập nếu cần.

### Part 7

* Đoạn văn, email, quảng cáo, thông báo hoặc bảng biểu.
* Có thể có một hoặc nhiều đoạn văn.
* Câu hỏi hiển thị bên cạnh hoặc phía dưới.
* Trên mobile, chuyển thành bố cục một cột.

Các từ quan trọng có thể được đánh dấu và lưu vào sổ từ vựng.

## 13. Trang thi thử TOEIC

Hiển thị danh sách đề thi:

* Đề thi đầy đủ 200 câu.
* Mini Test.
* Listening Test.
* Reading Test.
* Đề thi theo mức điểm.
* Đề thi đã làm.
* Đề thi chưa làm.

Mỗi đề thi có:

* Tên đề.
* Số câu hỏi.
* Thời gian.
* Mức độ.
* Số lượt làm.
* Điểm cao nhất.
* Trạng thái.
* Nút bắt đầu.

Trước khi thi hiển thị modal:

* Thời lượng.
* Số câu.
* Hướng dẫn.
* Quy định.
* Nút xác nhận bắt đầu.

Khi đang thi:

* Hiển thị đồng hồ.
* Cho phép đánh dấu câu hỏi.
* Có danh sách số câu.
* Phân biệt câu đã làm, chưa làm và đã đánh dấu.
* Có cảnh báo trước khi nộp bài.
* Tự động lưu đáp án vào localStorage để tránh mất dữ liệu khi tải lại trang.

## 14. Trang kết quả bài thi

Hiển thị:

* Tổng điểm TOEIC dự đoán.
* Điểm Listening.
* Điểm Reading.
* Số câu đúng.
* Số câu sai.
* Số câu bỏ qua.
* Thời gian hoàn thành.
* Phần trăm chính xác.
* Biểu đồ điểm theo từng Part.
* So sánh với lần thi trước.
* Đánh giá trình độ.
* Đề xuất bài học tiếp theo.

Có danh sách chi tiết từng câu:

* Số câu.
* Đáp án đúng.
* Đáp án người dùng.
* Trạng thái đúng hoặc sai.
* Giải thích.
* Transcript nếu là Listening.

Cho phép lọc:

* Tất cả.
* Câu sai.
* Câu đúng.
* Câu bỏ qua.
* Câu đã đánh dấu.

## 15. Trang học từ vựng

Bao gồm:

* Danh sách chủ đề từ vựng.
* Flashcard.
* Danh sách từ đã lưu.
* Từ cần ôn tập.
* Thống kê số từ đã học.
* Chế độ luyện tập.
* Tìm kiếm và lọc.

Các chủ đề ví dụ:

* Office.
* Travel.
* Business.
* Marketing.
* Finance.
* Human Resources.
* Meetings.
* Shopping.
* Transportation.
* Restaurants.

Flashcard gồm:

* Từ tiếng Anh.
* Phiên âm.
* Loại từ.
* Nghĩa tiếng Việt.
* Ví dụ.
* Audio phát âm.
* Nút đã nhớ.
* Nút cần ôn lại.
* Nút thêm vào danh sách yêu thích.

Sử dụng icon Volume2, Bookmark, RotateCcw, Check và Brain.

Tạo hiệu ứng lật flashcard nhẹ nhàng.

## 16. Trang ngữ pháp

Hiển thị các chủ đề:

* Các thì trong tiếng Anh.
* Loại từ.
* Mệnh đề quan hệ.
* Câu bị động.
* Câu điều kiện.
* Giới từ.
* Liên từ.
* So sánh.
* Danh động từ và động từ nguyên mẫu.
* Sự hòa hợp chủ ngữ và động từ.

Mỗi bài gồm:

* Tiêu đề.
* Lý thuyết.
* Công thức.
* Ví dụ.
* Lưu ý.
* Bài tập thực hành.
* Tiến độ hoàn thành.

## 17. Trang sổ lỗi sai

Tạo một trang để người dùng xem lại các câu đã làm sai.

Mỗi câu hiển thị:

* Nội dung câu hỏi.
* Đáp án đã chọn.
* Đáp án đúng.
* Giải thích.
* Nguyên nhân sai.
* Chủ đề liên quan.
* Ngày làm bài.
* Số lần ôn tập.
* Trạng thái đã hiểu hoặc cần ôn thêm.

Cho phép lọc theo:

* Listening hoặc Reading.
* Part.
* Chủ đề.
* Ngày.
* Mức độ khó.
* Trạng thái ôn tập.

## 18. Trang thống kê kết quả

Bao gồm:

* Biểu đồ điểm TOEIC theo thời gian.
* Biểu đồ Listening và Reading.
* Độ chính xác theo từng Part.
* Tổng thời gian học.
* Số ngày học.
* Chuỗi ngày học dài nhất.
* Số câu đã hoàn thành.
* Tỷ lệ hoàn thành lộ trình.
* Danh sách kỹ năng mạnh và yếu.

Sử dụng Recharts để tạo biểu đồ.

Biểu đồ phải responsive và có tooltip.

## 19. Bảng xếp hạng

Hiển thị:

* Top học viên theo điểm TOEIC.
* Top học viên theo thời gian học.
* Top học viên theo chuỗi ngày học.
* Xếp hạng của người dùng hiện tại.

Mỗi người dùng gồm:

* Thứ hạng.
* Avatar.
* Tên.
* Điểm.
* Chuỗi ngày học.
* Số bài đã hoàn thành.

Ba vị trí đầu có thiết kế nổi bật nhưng không sử dụng emoji huy chương.

Sử dụng icon Trophy, Medal, Award và Crown từ Lucide React.

## 20. Hồ sơ cá nhân

Bao gồm:

* Avatar.
* Họ tên.
* Email.
* Mục tiêu TOEIC.
* Điểm hiện tại.
* Ngày thi dự kiến.
* Trình độ.
* Thành tích.
* Lịch sử học tập.
* Chỉnh sửa thông tin cá nhân.
* Thay đổi mật khẩu.

## 21. Trang cài đặt

Các mục gồm:

* Thông tin tài khoản.
* Thông báo.
* Nhắc nhở học tập.
* Âm thanh.
* Ngôn ngữ.
* Giao diện sáng hoặc tối.
* Quyền riêng tư.
* Đổi mật khẩu.
* Đăng xuất.

Sử dụng switch, checkbox, select và modal phù hợp.

## 22. Component dùng chung

Tạo các component tái sử dụng:

* AppLayout.
* Header.
* Sidebar.
* MobileNavigation.
* PageHeader.
* SearchBar.
* UserMenu.
* NotificationMenu.
* StatCard.
* ProgressCard.
* CourseCard.
* PracticeCard.
* TestCard.
* VocabularyCard.
* QuestionNavigator.
* AudioPlayer.
* Timer.
* ProgressBar.
* AchievementBadge.
* EmptyState.
* LoadingSkeleton.
* ConfirmModal.
* Toast.
* Pagination.
* Tabs.
* Dropdown.
* FilterPanel.

Không viết toàn bộ giao diện trong một file App.tsx.

## 23. Cấu trúc thư mục

Tổ chức dự án rõ ràng theo cấu trúc gợi ý:

```text
src/
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   ├── dashboard/
│   ├── practice/
│   ├── test/
│   ├── vocabulary/
│   └── charts/
├── pages/
│   ├── Home/
│   ├── Auth/
│   ├── Dashboard/
│   ├── LearningPath/
│   ├── Practice/
│   ├── MockTest/
│   ├── Vocabulary/
│   ├── Grammar/
│   ├── Results/
│   ├── Ranking/
│   ├── Profile/
│   └── Settings/
├── routes/
├── data/
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

## 24. Dữ liệu mẫu

Tạo mock data đầy đủ để giao diện có thể chạy ngay mà không cần backend.

Mock data bao gồm:

* Người dùng.
* Bài học.
* Lộ trình.
* Từ vựng.
* Câu hỏi TOEIC.
* Đề thi.
* Kết quả.
* Thành tích.
* Thông báo.
* Dữ liệu biểu đồ.
* Bảng xếp hạng.

Dữ liệu mẫu phải thực tế, không chỉ sử dụng “Lorem ipsum”.

## 25. Yêu cầu responsive

### Desktop

* Sidebar cố định.
* Nội dung hiển thị nhiều cột.
* Dashboard có bố cục card rõ ràng.

### Tablet

* Sidebar có thể thu gọn.
* Các card chuyển từ ba hoặc bốn cột thành hai cột.

### Mobile

* Giao diện một cột.
* Menu chuyển thành drawer hoặc bottom navigation.
* Các bảng chuyển thành card hoặc hỗ trợ cuộn ngang.
* Nút bấm có kích thước đủ lớn.
* Không để nội dung bị tràn màn hình.
* Trình làm bài phải dễ thao tác bằng một tay.

## 26. Trạng thái giao diện

Mỗi trang cần có đầy đủ các trạng thái:

* Loading.
* Empty.
* Error.
* Success.
* Disabled.
* Locked.
* Completed.
* In progress.

Sử dụng skeleton loading thay vì chỉ hiển thị chữ “Loading”.

## 27. Accessibility

* Mỗi nút icon phải có aria-label.
* Form phải có label rõ ràng.
* Có trạng thái focus-visible.
* Đảm bảo độ tương phản màu sắc.
* Có thể thao tác bằng bàn phím.
* Không truyền tải trạng thái chỉ bằng màu sắc.
* Các modal phải hỗ trợ đóng bằng phím Escape.

## 28. Quy tắc icon

Bắt buộc tuân thủ:

* Chỉ sử dụng icon từ lucide-react cho các chức năng giao diện.
* Import icon theo nhu cầu, không import toàn bộ thư viện.
* Kích thước icon phải đồng nhất.
* Icon trong nút phải căn giữa với nội dung.
* Không sử dụng emoji.
* Không dùng ký tự bàn phím làm icon.
* Không dùng hình vuông hoặc ký tự lạ để thay cho icon khi icon chưa tải.
* Các nút chỉ có icon phải có tooltip và aria-label.

Ví dụ:

```tsx
import {
  BookOpen,
  Headphones,
  ChartNoAxesCombined,
  CircleCheck,
  Clock3,
  Play,
  Pause,
  Search,
  Bell,
  Settings,
} from "lucide-react";
```

## 29. Yêu cầu về mã nguồn

* Viết code sạch, dễ đọc và dễ mở rộng.
* Chia component hợp lý.
* Sử dụng TypeScript interface cho dữ liệu.
* Hạn chế lặp code.
* Không để lỗi TypeScript.
* Không để lỗi import.
* Không sử dụng component giả không tồn tại.
* Không tạo các liên kết hoặc nút không hoạt động.
* Các menu phải điều hướng được.
* Các tab, dropdown, modal và bộ lọc phải tương tác được.
* Các biểu đồ phải hiển thị dữ liệu mẫu.
* Form phải có validate cơ bản.
* Lưu một số trạng thái như theme, câu trả lời và tiến độ vào localStorage.
* Không cần xây dựng backend.
* Tách mock API hoặc mock service khỏi component giao diện.

## 30. Kết quả cần trả về

Hãy tạo đầy đủ mã nguồn dự án có thể chạy bằng các lệnh:

```bash
npm install
npm run dev
```

Trước tiên, hãy kiểm tra cấu trúc thư mục hiện có của dự án và tích hợp giao diện vào đúng cấu trúc đó. Không tự ý xóa những file quan trọng đang có.

Sau khi hoàn thành:

1. Liệt kê các thư viện đã sử dụng.
2. Trình bày cấu trúc thư mục.
3. Cho biết các trang đã hoàn thành.
4. Đảm bảo dự án chạy được mà không có lỗi.
5. Không chỉ viết mô tả hoặc mã giả.
6. Phải tạo mã nguồn giao diện thực tế.
7. Ưu tiên hoàn thiện Dashboard, Lộ trình học, Luyện tập, Thi thử, Từ vựng và Trang kết quả trước.
8. Sử dụng dữ liệu giả để minh họa toàn bộ chức năng.
9. Đảm bảo giao diện thống nhất về màu sắc, khoảng cách, border radius, typography và icon.
10. Không dừng lại sau khi chỉ tạo trang chủ. Hãy xây dựng đầy đủ các trang chính của website.

Tên website gợi ý: TOEIC Master, TOEIC Journey hoặc TOEIC Learning Hub.

Hãy bắt đầu bằng việc phân tích cấu trúc dự án hiện tại, sau đó tạo design system, layout chung, router, mock data và lần lượt hoàn thiện từng trang.
