# UI motion consistency

- Mọi modal dialog dạng centered phải dùng chung motion contract trong `client/src/components/common/modalMotion.ts`.
- Không tạo animation duration/easing/offset/scale riêng cho từng modal.
- Modal dismissal (nút close, Cancel, Escape, click backdrop) phải chạy cùng animation exit trước khi unmount.
- Motion phải tôn trọng `prefers-reduced-motion`.
- Drawer và anchored popover được phép có motion riêng phù hợp với kiểu tương tác, nhưng mở/đóng phải đối xứng.
- Khi sửa motion của 1 modal, phải audit các modal khác dùng cùng pattern để đồng bộ.
- Mọi chỉnh sửa liên quan đến giao diện phải dùng taste skills để chỉnh sửa.
- Phải sử dụng và áp dụng lại boneyard skeleton mỗi khi chỉnh sửa giao diện
- Giao diện phải được thiết kế hiện đại, đẹo và trông có gu và phải nhất quán.
- Không được sử dụng các từ chỉ thuật ngữ IT trên giao diện.
- Không được dùng biểu tượng ngôi sao lấp lánh (sparkle icon) – hình ngôi sao 4 cánh nhọn kèm 2 dấu "+" nhỏ, viền màu cam trên nền vàng nhạt trong giao diện.
- Hạn chế không sử dụng highlight tiêu đề nếu không cần thiết, ưu tiên sự tối giản sử dụng định dạng chữ thay vì lạm dụng màu sắc gây rối mắt.
- Kết hợp sử dụng các svg có trên mạng hoặc thư viện svgs hoặc iconify, iconify-react để tạo ra các icon đẹp, độc lạ và hiện đại.
- Tối ưu cho các thiết bị di động (ios, android) và cả máy tính.