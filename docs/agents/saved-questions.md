# Lưu câu hỏi

- Nút lưu/bỏ lưu dùng chung `QuestionSaveButton`, trạng thái qua `useSavedQuestions`.
- Lưu trên trình duyệt theo tài khoản (`toeic_saved_questions:v1:<userId>:<source>`); chưa đồng bộ máy chủ hoặc giữa thiết bị. Không dùng chung dữ liệu giữa tài khoản và khách.
- Câu TOEIC dùng `question.id` chung giữa Luyện theo Level và Đề thi. Ngữ pháp dùng `question_id` ổn định giữa các chuyên đề, kho đề và độ khó; không dùng `membership_id` làm danh tính câu đã lưu.
- Bộ lọc Đã lưu và số lượng chỉ tính câu thuộc danh sách hiện tại. Ngữ pháp tải đầy đủ danh sách của mục đang chọn khi mở drawer theo luồng phân trang hiện có.
- Lưu độc lập với trả lời, kiểm tra đáp án, nộp bài và xoá lịch sử. Không reset câu đã lưu khi bắt đầu lượt mới.
- Đồng bộ thay đổi giữa các component cùng tab và các tab cùng trình duyệt. Khi bộ nhớ trình duyệt không ghi được, giữ nguyên trạng thái và hiện lỗi.
- Parser/toggle ở `client/src/utils/savedQuestions.ts` phải từ chối ghi đè JSON không đọc được/sai kiểu; không coi bản lỗi là danh sách rỗng để ghi tiếp. Map câu không dùng prototype. Regression: `client/tests/saved-questions.test.mjs`.
- Kết quả audit chức năng/giao diện: `docs/investigations/exam-tools-audit-2026-10-18.md`.
- Giữ skeleton Boneyard và motion contract hiện có của các trang/drawer.
