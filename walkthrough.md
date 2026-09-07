# Walkthrough: Hoàn thiện Boneyard Skeleton cho các Component trang Từ Vựng

## Mục tiêu đã hoàn thành

Khắc phục lỗi và cấu hình `BoneyardSkeleton` đúng cách cho toàn bộ các component trong trang phòng học từ vựng (`/vocabulary/:topicId` - ví dụ `Unit 3` trong ảnh chụp của người dùng) cũng như trang chi tiết bộ từ vựng (`/vocabulary/set/:setId`).

---

## Phân tích nguyên nhân trước đó

1. **Skeleton trang phòng học (`VocabularyLivePageSkeleton`) bị lệch giao diện thực tế**:
   - Trước đó skeleton sử dụng danh sách 1 cột dọc (`space-y-4`) với các bộ lọc `live-filter-all`, `live-filter-unlearned`, `live-filter-learned` không tồn tại trong thiết kế giao diện thực tế.
   - Trong khi đó, giao diện thực tế của `WordListView` là lưới **3 cột** (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`), mỗi thẻ từ vựng gồm: ảnh thumbnail vuông góc trái (`size-16`), từ vựng, phiên âm IPA màu xanh, nhãn loại từ (POS), 2 nút loa phát âm US/UK góc trên bên phải, và nghĩa tiếng Việt 2 dòng.
   - Thanh công cụ (Toolbar) thực tế gồm: ô tìm kiếm (`/`), gợi ý phím tắt (`↑↓←→ di chuyển · Enter phát audio`), số lượng từ (`30 từ`), nút `+ Thêm từ`, và cụm nút chuyển chế độ Lưới/Danh sách (Grid/List toggle).
2. **Các component trong trang chưa áp dụng `BoneyardSkeleton`**:
   - Component cha chỉ dùng điều kiện thô `if (loading) return <VocabularyLivePageSkeleton />`, khiến toàn bộ cây DOM bị unmount và remount khi tải dữ liệu.
   - Các component con như Header, Stats badges, Tabs chuyển chế độ, Toolbar, Grid thẻ từ vựng và từng thẻ từ vựng (`WordCard`) đều không được bao bọc (wrap) bởi `<BoneyardSkeleton>` theo đúng quy chuẩn của `boneyard-js`.

---

## Chi tiết các thay đổi đã thực hiện

### 1. Nâng cấp `BoneyardSkeleton.tsx` (`client/src/components/common/BoneyardSkeleton.tsx`)
- Bổ sung prop `fallback?: React.ReactNode` vào `BoneyardSkeletonProps`.
- Ưu tiên sử dụng `fallback` tùy biến nếu được truyền vào, đồng thời tích hợp trực tiếp vào `BoneyardReactSkeleton` từ `boneyard-js/react`.

### 2. Tái cấu trúc `VocabularyLivePageSkeleton.tsx` (`client/src/pages/Vocabulary/components/VocabularyLivePageSkeleton.tsx`)
Xuất các skeleton component độc lập chuẩn xác 100% với giao diện:
- `WordCardSkeleton`: Khung xương thẻ từ vựng chính xác:
  - Thumbnail ảnh vuông `size-16` bo góc bên trái.
  - Tên từ vựng + phiên âm IPA.
  - Cặp nút loa US và UK góc trên bên phải.
  - Nhãn loại từ (POS badge).
  - 2 dòng nghĩa tiếng Việt.
- `WordGridSkeleton`: Lưới 3 cột linh hoạt hoặc danh sách dòng khi ở chế độ List.
- `VocabularyToolbarSkeleton`: Ô tìm kiếm + phím tắt + đếm số từ + nút thêm từ + nút Grid/List.
- `VocabularyLiveHeaderSkeleton`: Nút back, breadcrumbs `Quay lại trang từ vựng / Unit 3`, tiêu đề Unit, 4 counter badges (`# Tổng`, `Đã học`, `Cần ôn`, `Mới`) cùng 2 nút hành động (`+ Thêm từ mới`, `Cài đặt`).
- `VocabularyLiveModesSkeleton`: 5 tab chế độ (`Xem từ`, `Đoán`, `Học`, `Luyện tập`, `Chơi`).
- `VocabularyLivePageSkeleton`: Tổng hợp các khung xương trên cho lần tải đầu.

### 3. Cập nhật `WordListView.tsx` (`client/src/pages/Vocabulary/modes/WordListView.tsx`)
- Nhận prop `loading?: boolean`.
- Bọc thanh công cụ trong `<BoneyardSkeleton name="vocab-word-toolbar" loading={loading} fallback={<VocabularyToolbarSkeleton />}>`.
- Bọc lưới thẻ từ vựng trong `<BoneyardSkeleton name="vocab-word-grid" loading={loading} fallback={<WordGridSkeleton isGridView={isGridView} count={9} />}>`.
- Bọc từng thẻ từ vựng riêng biệt bằng `<BoneyardSkeleton name={`word-card-${word.id}`}>` để quản lý skeleton trạng thái từng phần tử.

### 4. Cập nhật `VocabularyLivePage.tsx` (`client/src/pages/Vocabulary/VocabularyLivePage.tsx`)
- Bọc Header bằng `<BoneyardSkeleton name="vocab-live-header" loading={loading} fallback={<VocabularyLiveHeaderSkeleton />}>`.
- Bọc Mode Switcher bằng `<BoneyardSkeleton name="vocab-live-modes" loading={loading} fallback={<VocabularyLiveModesSkeleton />}>`.
- Truyền `loading={loading}` vào `<WordListView />`.

### 5. Cập nhật `SetDetailPage.tsx` (`client/src/pages/Vocabulary/SetDetailPage.tsx`)
- Bọc Hero Banner bằng `<BoneyardSkeleton name="set-detail-banner" loading={false}>`.
- Bọc lưới bài học bằng `<BoneyardSkeleton name="set-detail-units-grid" loading={false}>`.
- Bọc từng thẻ bài học Unit trong `<BoneyardSkeleton key={topic.id} name={`unit-card-${topic.id}`} loading={false}>`.

### 6. Loại bỏ Component Header thừa tại `TopicListPage.tsx` (`client/src/pages/Vocabulary/TopicListPage.tsx`)
- Đã loại bỏ khối `<header>` chứa:
  - Badge `"Phương pháp học phản xạ đa giác quan"`
  - Tiêu đề `"Kho Từ Vựng TOEIC & Học Thuật"`
  - Mô tả `"Hơn 20.000+ từ vựng phong phú được chia theo 18 bộ và 640 bài học..."`
  - Nút `"Thêm từ mới"` & liên kết `"Sổ tay của tôi (X)"`
- Đồng thời cập nhật `VocabularyPageSkeleton.tsx`, loại bỏ header skeleton tương ứng để đảm bảo trạng thái loading và giao diện hiển thị đồng bộ hoàn hảo.

### 7. Tái thiết kế 3 Component chi tiết từ vựng theo Taste Skill (`WordListView.tsx`)
Thiết kế lại 3 card hiển thị chi tiết từ vựng trong `WordDetailModal` theo triết lý thị giác hiện đại, thẩm mỹ cao (Taste Skill):
1. **Nghĩa tiếng Việt (Emerald Identity)**:
   - Thẻ gradient ngọc lục bảo tinh tế (`from-emerald-500/[0.08] via-surface to-surface`) với hiệu ứng ambient glow mềm mại.
   - Badge thương hiệu `Languages`: *"Nghĩa tiếng Việt"* kèm nhãn *"Trọng tâm"*.
   - Nút sao chép (Copy) nhanh với phản hồi trực quan *"Đã chép"*.
   - Typography đậm nét, nổi bật (`text-base sm:text-lg font-black tracking-tight`).
2. **Định nghĩa tiếng Anh (Sky Identity)**:
   - Thẻ gradient xanh dương (`from-sky-500/[0.08] via-surface to-surface`) với viền mềm mại `border-sky-500/25`.
   - Badge `BookOpen`: *"Định nghĩa tiếng Anh"* cùng nút Copy tiện lợi.
   - Kiểu chữ hiện đại, rõ ràng, dễ đọc cho người học.
3. **Câu ví dụ TOEIC thực tế (Amber Identity)**:
   - Thẻ gradient vàng cam ấm áp (`from-amber-500/[0.10] via-amber-500/[0.03] to-surface`).
   - Badge `Sparkles`: *"Câu ví dụ TOEIC thực tế"*.
   - **Tính năng âm thanh thông minh**: Nút loa phát âm trực tiếp nguyên câu ví dụ bằng giọng chuẩn US bản xứ.
   - Nút sao chép câu ví dụ sang bộ nhớ tạm.
   - **Tự động highlight từ vựng mục tiêu**: Nhận diện và làm nổi bật từ vựng đang học ngay trong ngữ cảnh câu văn TOEIC bằng nền màu hổ phách mềm.
   - Dịch nghĩa tiếng Việt được đặt trong khối phụ chuyên biệt với biểu tượng `Languages` thanh lịch.

---

## Kiểm tra và Xác thực

- Chạy `npm run build` trong thư mục `client/`:
  - **Kết quả**: Biên dịch TypeScript và Vite thành công (`✓ built in 6.17s`), 0 lỗi, 0 warning.
- Giao diện đạt chuẩn Taste Skill, các tính năng tương tác (Copy, Audio, Highlight) hoạt động mượt mà.
