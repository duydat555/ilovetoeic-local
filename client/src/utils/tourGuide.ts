import { driver, Driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_STORAGE_KEY = 'toeic_tour_completed';

export type TourType =
  | 'general'
  | 'dashboard'
  | 'mock-test'
  | 'listening'
  | 'listening-practice'
  | 'vocabulary'
  | 'grammar'
  | 'practice-by-level'
  | 'ranking'
  | 'profile';

export interface TourOption {
  type: TourType;
  title: string;
  description: string;
}

export const AVAILABLE_TOURS: TourOption[] = [
  {
    type: 'general',
    title: 'Hướng dẫn tổng quan hệ thống',
    description: 'Tìm hiểu thanh điều hướng, theo dõi thời gian học, chuỗi ngày và các tiện ích.',
  },
  {
    type: 'dashboard',
    title: 'Trang Tổng quan (Dashboard)',
    description: 'Theo dõi mục tiêu điểm số, chỉ số tiến độ, lịch học và trò chuyện cùng bạn học.',
  },
  {
    type: 'mock-test',
    title: 'Kho Đề thi thử (Mock Test)',
    description: 'Cách chọn đề ETS theo năm, làm bài thi thử tính giờ hoặc luyện tập từng Part.',
  },
  {
    type: 'listening',
    title: 'Luyện nghe TOEIC (Danh sách bài)',
    description: 'Khám phá các bộ bài nghe theo Part, theo dõi độ khó và trộn đề ngẫu nhiên.',
  },
  {
    type: 'listening-practice',
    title: 'Màn hình Luyện nghe chi tiết',
    description: '6 chế độ luyện nghe chuyên sâu, điều khiển âm thanh và tra cứu từ vựng.',
  },
  {
    type: 'vocabulary',
    title: 'Từ vựng Flashcard',
    description: 'Học từ vựng theo chủ đề, sổ tay từ đã lưu và 5 chế độ tương tác thông minh.',
  },
  {
    type: 'grammar',
    title: 'Ngữ pháp TOEIC',
    description: 'Học theo chuyên đề, luyện đề Part 5 thật và tra cứu ngữ pháp chi tiết.',
  },
  {
    type: 'practice-by-level',
    title: 'Luyện tập theo Level',
    description: 'Tùy chỉnh cấp độ từ Level 1 đến 5 cho từng Part phù hợp với trình độ.',
  },
  {
    type: 'ranking',
    title: 'Bảng xếp hạng thi đua',
    description: 'Theo dõi thứ hạng của bạn, bảng vàng vinh danh Top 3 và thành tích lớp học.',
  },
  {
    type: 'profile',
    title: 'Hồ sơ cá nhân & Mục tiêu',
    description: 'Đổi ảnh đại diện, thiết lập mục tiêu điểm số TOEIC và ngày thi dự kiến.',
  },
];

export const AVAILABLE_TOURS_EN: TourOption[] = [
  {
    type: 'general',
    title: 'System Tour & Navigation',
    description: 'Explore the sidebar, active session timer, streak counter, and utilities.',
  },
  {
    type: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Track target scores, progress metrics, study schedule, and community chats.',
  },
  {
    type: 'mock-test',
    title: 'TOEIC Mock Test Library',
    description: 'Choose ETS tests by year, take full timed mock exams or practice individual parts.',
  },
  {
    type: 'listening',
    title: 'TOEIC Listening Topics',
    description: 'Browse listening practice by Part, filter by difficulty, and try randomized sets.',
  },
  {
    type: 'listening-practice',
    title: 'Intensive Listening Studio',
    description: '6 intensive listening modes, audio player controls, and instant vocabulary saving.',
  },
  {
    type: 'vocabulary',
    title: 'Flashcard Vocabulary',
    description: 'Study vocabulary by theme, personal word notebook, and 5 interactive learning modes.',
  },
  {
    type: 'grammar',
    title: 'TOEIC Grammar Master',
    description: 'Learn by grammar topics, real Part 5 ETS exam bank, and comprehensive answer keys.',
  },
  {
    type: 'practice-by-level',
    title: 'Practice by Level',
    description: 'Tailor question difficulty from Level 1 to 5 to match your current skill level.',
  },
  {
    type: 'ranking',
    title: 'Leaderboard & Competition',
    description: 'Track your ranking, Top 3 podium honors, and cohort class achievements.',
  },
  {
    type: 'profile',
    title: 'Profile & Learning Goals',
    description: 'Update your avatar, set target TOEIC scores, and record target exam dates.',
  },
];

let activeDriverInstance: Driver | null = null;

// 1. General Layout Tour
const GENERAL_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-brand',
    popover: {
      title: 'Học tập cùng TOEICMaster',
      description: 'Nền tảng đồng hành giúp bạn bứt phá điểm số TOEIC với kho đề thi chuẩn cấu trúc và lộ trình rèn luyện bài bản.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-sidebar',
    popover: {
      title: 'Danh mục khu vực học tập',
      description: 'Tiếp cận nhanh các phần luyện thi: Đề thi thử, Luyện nghe từng phần, Luyện đọc, Từ vựng, Ngữ pháp và Lớp học.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-goal-card',
    popover: {
      title: 'Mục tiêu điểm số của bạn',
      description: 'Theo dõi điểm hiện tại so với mục tiêu TOEIC bạn muốn đạt được. Vòng tròn tiến độ sẽ tự động cập nhật khi bạn hoàn thành bài tập.',
      side: 'right',
      align: 'end',
    },
  },
  {
    element: '#tour-search',
    popover: {
      title: 'Tìm kiếm nhanh',
      description: 'Tra cứu nhanh bài thi thử, bộ từ vựng hoặc chủ điểm ngữ pháp bạn muốn ôn tập chỉ trong tích tắc.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-streak',
    popover: {
      title: 'Chuỗi ngày rèn luyện',
      description: 'Ghi nhận số ngày bạn kiên trì học tập liên tục. Hãy hoàn thành ít nhất một bài tập mỗi ngày để thắp sáng chuỗi học tập!',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-active-time',
    popover: {
      title: 'Thời gian học hôm nay',
      description: 'Đồng hồ theo dõi tổng thời gian bạn thực sự học tập trên hệ thống trong ngày, giúp bạn duy trì kỷ luật và hiệu suất.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-help-button',
    popover: {
      title: 'Xem lại hướng dẫn',
      description: 'Bấm nút trợ giúp này bất kỳ lúc nào để xem hướng dẫn chi tiết cho trang bạn đang mở.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-theme-toggle',
    popover: {
      title: 'Giao diện Sáng / Tối',
      description: 'Chuyển đổi linh hoạt giữa nền sáng và nền tối để bảo vệ mắt tốt nhất khi bạn học vào ban đêm.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-notifications',
    popover: {
      title: 'Thông báo & Nhắc nhở',
      description: 'Nhận lời nhắc ôn bài, thông báo kết quả bài thi thử và các cập nhật học tập mới từ hệ thống.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#tour-user-menu',
    popover: {
      title: 'Tài khoản & Cá nhân hóa',
      description: 'Quản lý thông tin cá nhân, xem hồ sơ học tập và điều chỉnh cài đặt theo nhu cầu của riêng bạn.',
      side: 'bottom',
      align: 'end',
    },
  },
];

// 2. Dashboard Tour
const DASHBOARD_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-db-welcome',
    popover: {
      title: 'Chào mừng & Linh vật đồng hành',
      description: 'Theo dõi điểm kinh nghiệm tích lũy, chuỗi ngày học liên tục và nhận lời động viên hàng ngày từ linh vật TOEICMaster.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-db-metrics',
    popover: {
      title: 'Chỉ số năng lực học tập',
      description: 'Nắm bắt Điểm thi TOEIC cao nhất, Mục tiêu điểm cần đạt và Độ chính xác làm bài trung bình qua các đề thi.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-db-activity',
    popover: {
      title: 'Phân tích hoạt động ôn luyện',
      description: 'Biểu đồ chi tiết số lượng câu hỏi bạn đã rèn luyện theo từng Part từ 1 đến 7 và lịch chuyên cần học tập trong tháng.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-db-active-students',
    popover: {
      title: 'Cộng đồng học tập cùng bạn',
      description: 'Xem danh sách các học viên đang online và tích cực rèn luyện trên hệ thống theo thời gian thực.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '#tour-db-chat',
    popover: {
      title: 'Kênh trò chuyện cộng đồng',
      description: 'Giao lưu, thảo luận kinh nghiệm ôn thi, hỏi bài tập và tạo động lực học tập cùng các thành viên khác.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-db-chart',
    popover: {
      title: 'Tiến trình điểm số TOEIC',
      description: 'Biểu đồ đường trực quan ghi nhận sự tiến bộ điểm số qua 8 đề thi chuẩn 200 câu gần nhất mà bạn đã hoàn thành.',
      side: 'top',
      align: 'center',
    },
  },
];

// 3. Mock Test Tour
const MOCK_TEST_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-mt-tabs',
    popover: {
      title: 'Kho đề thi & Lịch sử làm bài',
      description: 'Dễ dàng chuyển đổi giữa Thư viện đề thi chuẩn format và Lịch sử các bài thi bạn đã từng làm.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-mt-years',
    popover: {
      title: 'Lọc đề thi theo năm phát hành',
      description: 'Lựa chọn các bộ đề ETS cập nhật theo từng năm để luyện tập bám sát xu hướng đề thi mới nhất.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-mt-grid',
    popover: {
      title: 'Danh sách đề thi chuẩn cấu trúc',
      description: 'Mỗi đề gồm đủ 200 câu hỏi và 120 phút thời gian làm bài, đi kèm phân tích độ khó và số lượt đã làm.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-mt-card-modes',
    popover: {
      title: 'Hai chế độ làm bài linh hoạt',
      description: 'Bấm "Thi thử" để làm bài tính giờ nghiêm túc như thi thật, hoặc "Luyện tập" để chọn từng Part và xem đáp án & giải thích ngay tức thì.',
      side: 'top',
      align: 'center',
    },
  },
];

// 4. Listening List Tour
const LISTENING_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-ls-tabs',
    popover: {
      title: 'Chế độ xem & Thống kê nghe',
      description: 'Chuyển đổi giữa chế độ Học tập thông thường, Thống kê theo độ khó, Danh sách cần ôn tập và Tiến độ hoàn thành.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-ls-categories',
    popover: {
      title: 'Phân loại các bộ bài nghe',
      description: 'Chọn bộ đề nghe theo từng năm phát hành ETS 2026 hoặc các chủ đề giao tiếp thực tế.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-ls-tests',
    popover: {
      title: 'Trọn bộ 10 đề thi ETS Listening',
      description: 'Mỗi đề được tách thành 4 bài luyện tập toàn diện tương ứng với Part 1, Part 2, Part 3 và Part 4.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-ls-parts',
    popover: {
      title: 'Lọc nhanh theo từng Part',
      description: 'Tập trung ôn luyện Part bạn muốn: Part 1 Mô tả tranh, Part 2 Hỏi & Đáp, Part 3 Hội thoại hay Part 4 Bài nói ngắn.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-ls-grid',
    popover: {
      title: 'Thẻ bài luyện nghe',
      description: 'Mỗi bài luyện tập có gắn nhãn độ khó dạng vạch sóng, số câu hỏi và trạng thái đã hoàn thành giúp bạn quản lý tiến trình dễ dàng.',
      side: 'top',
      align: 'center',
    },
  },
];

// 5. Listening Practice Tour
const LISTENING_PRACTICE_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-lp-modes',
    popover: {
      title: '6 Phương pháp luyện nghe chuyên sâu',
      description: 'Chuyển đổi linh hoạt giữa: Chọn nghĩa, Chọn từ, Điền từ vào chỗ trống, Nghe check, Nghe chép chính tả và Nghe full có hiệu ứng Karaoke.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-lp-player',
    popover: {
      title: 'Trình phát âm thanh & Video chuẩn bản xứ',
      description: 'Hỗ trợ phát âm thanh/video chất lượng cao, tùy chỉnh tốc độ nói (0.75x - 1.25x), tua 5s và tự động phát lại câu ngắn.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-lp-interaction',
    popover: {
      title: 'Khu vực làm bài & Tương tác thông minh',
      description: 'Gõ từ hoặc chọn đáp án trực tiếp, nghe lại từng từ riêng lẻ và bấm vào từ vựng để tra cứu nghĩa tiếng Việt tức thì.',
      side: 'top',
      align: 'center',
    },
  },
];

// 6. Vocabulary Tour
const VOCABULARY_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-vocab-hero',
    popover: {
      title: 'Sổ tay từ vựng của bạn',
      description: 'Quản lý toàn bộ từ vựng bạn đã bôi đen tra cứu khi làm bài hoặc tự bổ sung. Có thể bấm "Học sổ tay của tôi" để ôn lại bất kỳ lúc nào.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-vocab-categories',
    popover: {
      title: 'Phân loại chủ đề từ vựng',
      description: 'Lọc theo các chủ điểm xuất hiện nhiều nhất trong bài thi TOEIC như Hợp đồng, Tài chính, Bán hàng, Nhân sự, Du lịch...',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-vocab-search',
    popover: {
      title: 'Tra cứu từ vựng nhanh chóng',
      description: 'Tìm kiếm nhanh bộ từ hoặc từ vựng theo tên tiếng Anh hoặc nghĩa tiếng Việt.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '#tour-vocab-grid',
    popover: {
      title: 'Các bộ từ vựng hệ thống',
      description: 'Bấm vào bất kỳ bộ từ nào để chọn bài học và trải nghiệm 5 chế độ: Flashcard lật thẻ, Đoán từ, Luyện gõ, Minigame và Danh sách từ.',
      side: 'top',
      align: 'center',
    },
  },
];

// 7. Grammar Tour
const GRAMMAR_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-gm-modes',
    popover: {
      title: '3 Phương thức rèn luyện ngữ pháp',
      description: 'Lựa chọn ôn luyện: Theo chuyên đề trọng tâm, Theo kho đề ETS thật, hoặc Luyện theo độ khó tăng dần từ cơ bản đến nâng cao.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-gm-catalog',
    popover: {
      title: 'Danh mục chủ điểm ngữ pháp',
      description: 'Bao quát toàn bộ các chuyên đề thường gặp trong TOEIC Part 5: Các thì tiếng Anh, Mệnh đề quan hệ, Câu điều kiện, Từ loại...',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '#tour-gm-practice',
    popover: {
      title: 'Khu vực làm câu hỏi trắc nghiệm',
      description: 'Mỗi câu hỏi đều có đáp án giải thích chi tiết, dịch nghĩa toàn bộ câu và trích xuất danh sách từ vựng quan trọng kèm phát âm.',
      side: 'left',
      align: 'start',
    },
  },
];

// 8. Practice by Level Tour
const PRACTICE_BY_LEVEL_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-pbl-summary',
    popover: {
      title: 'Level trung bình hiện tại của bạn',
      description: 'Hệ thống tự động tính toán trình độ tổng thể dựa trên kết quả bạn hoàn thành đạt ngưỡng 70% ở từng Part.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-pbl-skill',
    popover: {
      title: 'Lựa chọn kỹ năng',
      description: 'Chuyển đổi linh hoạt giữa Luyện kỹ năng Nghe (Listening: Part 1-4) và Luyện kỹ năng Đọc (Reading: Part 5-7).',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-pbl-grid',
    popover: {
      title: 'Tùy chỉnh Level cho từng Part',
      description: 'Kéo thanh trượt độ khó từ Level 1 (nền tảng) đến Level 5 (nâng cao) cho từng Part phù hợp với mục tiêu điểm số của bạn.',
      side: 'top',
      align: 'center',
    },
  },
];

// 9. Ranking Tour
const RANKING_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-rank-scope',
    popover: {
      title: 'Phạm vi bảng xếp hạng',
      description: 'Xem bảng xếp hạng thành tích trên Toàn khóa học hoặc giới hạn trong phạm vi Lớp học của bạn.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-rank-podium',
    popover: {
      title: 'Bục vinh quang Top 3',
      description: 'Vinh danh 3 học viên có thành tích xuất sắc nhất với huy hiệu đặc biệt và điểm số dẫn đầu.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-rank-list',
    popover: {
      title: 'Danh sách thứ hạng chi tiết',
      description: 'Xem thứ hạng Top 10 học viên và theo dõi vị trí hiện tại của chính bạn trên bảng thi đua.',
      side: 'top',
      align: 'center',
    },
  },
];

// 10. Profile Tour
const PROFILE_TOUR_STEPS: DriveStep[] = [
  {
    element: '#tour-profile-avatar',
    popover: {
      title: 'Ảnh đại diện cá nhân',
      description: 'Tải ảnh đại diện từ máy tính hoặc lựa chọn tạo avatar hoạt hình ngẫu nhiên độc đáo.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '#tour-profile-info',
    popover: {
      title: 'Thông tin cá nhân & Tên hiển thị',
      description: 'Cập nhật họ tên, địa chỉ email và tên bạn muốn xuất hiện trên Bảng xếp hạng thi đua.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '#tour-profile-target',
    popover: {
      title: 'Mục tiêu điểm số & Ngày thi dự kiến',
      description: 'Thiết lập mức điểm TOEIC bạn muốn đạt được (450+ đến 900+) và ngày thi để hệ thống nhắc nhở ôn luyện đều đặn.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-profile-password',
    popover: {
      title: 'Bảo mật & Đổi mật khẩu',
      description: 'Cập nhật mật khẩu tài khoản bất cứ lúc nào để đảm bảo an toàn.',
      side: 'top',
      align: 'center',
    },
  },
];

const TOUR_MAP: Record<TourType, DriveStep[]> = {
  general: GENERAL_TOUR_STEPS,
  dashboard: DASHBOARD_TOUR_STEPS,
  'mock-test': MOCK_TEST_TOUR_STEPS,
  listening: LISTENING_TOUR_STEPS,
  'listening-practice': LISTENING_PRACTICE_TOUR_STEPS,
  vocabulary: VOCABULARY_TOUR_STEPS,
  grammar: GRAMMAR_TOUR_STEPS,
  'practice-by-level': PRACTICE_BY_LEVEL_TOUR_STEPS,
  ranking: RANKING_TOUR_STEPS,
  profile: PROFILE_TOUR_STEPS,
};

const EN_TOUR_MAP: Record<TourType, DriveStep[]> = {
  general: [
    {
      element: '#tour-brand',
      popover: {
        title: 'Learn with TOEICMaster',
        description: 'Your companion platform to boost your TOEIC score with standard structured tests and systematic practice.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-sidebar',
      popover: {
        title: 'Study Area Navigation',
        description: 'Quickly access mock tests, listening parts, reading exercises, vocabulary flashcards, grammar, and classes.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-goal-card',
      popover: {
        title: 'Your Target Score',
        description: 'Track your current progress towards your TOEIC goal. The progress ring updates automatically as you complete exercises.',
        side: 'right',
        align: 'end',
      },
    },
    {
      element: '#tour-search',
      popover: {
        title: 'Quick Search',
        description: 'Instantly look up practice tests, vocabulary decks, or grammar topics in seconds.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-streak',
      popover: {
        title: 'Daily Study Streak',
        description: 'Counts your consecutive days of practice. Complete at least one exercise every day to keep your streak burning!',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-active-time',
      popover: {
        title: 'Study Time Today',
        description: 'Real-time timer tracking your active learning time today to keep you focused and disciplined.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-help-button',
      popover: {
        title: 'Replay Guide',
        description: 'Click this help button anytime to replay the interactive guide for the current page.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-theme-toggle',
      popover: {
        title: 'Light / Dark Theme',
        description: 'Seamlessly switch between light and dark mode to protect your eyes when studying at night.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-notifications',
      popover: {
        title: 'Notifications & Reminders',
        description: 'Receive study nudges, mock test results, and important platform updates.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#tour-user-menu',
      popover: {
        title: 'Account & Preferences',
        description: 'Manage profile info, check your study records, and configure settings to your liking.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],
  dashboard: [
    {
      element: '#tour-db-welcome',
      popover: {
        title: 'Welcome & Mascot',
        description: 'Track accumulated XP, learning streak, and get daily motivational nudges from our mascot.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-db-metrics',
      popover: {
        title: 'Learning Competence Metrics',
        description: 'See your highest mock test score, target goal, and average answer accuracy across tests.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-db-activity',
      popover: {
        title: 'Practice Activity Breakdown',
        description: 'Detailed chart of solved questions across Parts 1-7 and your monthly study attendance calendar.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-db-active-students',
      popover: {
        title: 'Learning Community',
        description: 'See learners currently online and actively practicing in real time.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#tour-db-chat',
      popover: {
        title: 'Community Discussion',
        description: 'Chat, exchange test tips, ask questions, and motivate each other.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-db-chart',
      popover: {
        title: 'Score Progress Timeline',
        description: 'Visual trendline tracking your score progress across your last 8 full 200-question mock tests.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  'mock-test': [
    {
      element: '#tour-mt-tabs',
      popover: {
        title: 'Test Library & History',
        description: 'Effortlessly switch between the standard format test library and your past test attempt history.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-mt-years',
      popover: {
        title: 'Filter Tests by Year',
        description: 'Select ETS test sets updated by publication year to stay on top of the newest exam trends.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-mt-grid',
      popover: {
        title: 'Standard Mock Tests',
        description: 'Each full test includes 200 questions and 120 minutes with difficulty indicators and attempt counts.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-mt-card-modes',
      popover: {
        title: 'Flexible Exam Modes',
        description: 'Click "Take Exam" for strict timed testing or "Practice" to solve individual parts with instant explanations.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  listening: [
    {
      element: '#tour-ls-tabs',
      popover: {
        title: 'Study Views & Stats',
        description: 'Switch between Study mode, Difficulty breakdown, Needs Review list, and Overall progress.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-ls-categories',
      popover: {
        title: 'Listening Categories',
        description: 'Choose sets by ETS year or by real-life workplace communications.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-ls-tests',
      popover: {
        title: '10 Full ETS Listening Tests',
        description: 'Each test is split into comprehensive practice sets for Part 1, Part 2, Part 3, and Part 4.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-ls-parts',
      popover: {
        title: 'Filter by Part',
        description: 'Focus on what you need: Part 1 Photographs, Part 2 Question-Response, Part 3 Conversations, or Part 4 Short Talks.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-ls-grid',
      popover: {
        title: 'Practice Audio Cards',
        description: 'Each set features difficulty wave bars, question counts, and completion status to track your progress.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  'listening-practice': [
    {
      element: '#tour-lp-modes',
      popover: {
        title: '6 Intensive Practice Modes',
        description: 'Switch between Meaning Selection, Word Selection, Fill-in-the-Blank, Listen & Check, Transcription, and Full Audio with karaoke text.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-lp-player',
      popover: {
        title: 'Native Audio Player',
        description: 'High quality audio playback, adjustable speed (0.75x - 1.25x), 5s skip, and loop replay for short phrases.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-lp-interaction',
      popover: {
        title: 'Interactive Practice Area',
        description: 'Type words or select choices directly, replay individual words, and click any word to look up its definition.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  vocabulary: [
    {
      element: '#tour-vocab-hero',
      popover: {
        title: 'My Word Notebook',
        description: 'Manage words looked up during practice or saved manually. Click "Practice My Words" to review anytime.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-vocab-categories',
      popover: {
        title: 'Vocabulary Themes',
        description: 'Filter by top TOEIC topics like Contracts, Finance, Sales, Personnel, Travel, and more.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-vocab-search',
      popover: {
        title: 'Quick Vocabulary Search',
        description: 'Quickly search word sets or individual terms by English or Vietnamese.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#tour-vocab-grid',
      popover: {
        title: 'System Vocabulary Sets',
        description: 'Click any set to begin with 5 interactive modes: Flashcards, Word Guess, Type Practice, Minigame, and Word List.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  grammar: [
    {
      element: '#tour-gm-modes',
      popover: {
        title: '3 Grammar Study Methods',
        description: 'Choose between Key Topics, Real ETS Exam Bank, or Progressive Difficulty from beginner to advanced.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-gm-catalog',
      popover: {
        title: 'Grammar Topics Catalog',
        description: 'Covers all common TOEIC Part 5 topics: Tenses, Relative Clauses, Conditionals, Parts of Speech...',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-gm-practice',
      popover: {
        title: 'Practice & Explanations',
        description: 'Every question includes detailed answer keys, full sentence translation, and essential vocabulary highlights.',
        side: 'left',
        align: 'start',
      },
    },
  ],
  'practice-by-level': [
    {
      element: '#tour-pbl-summary',
      popover: {
        title: 'Current Average Competence',
        description: 'The system calculates your overall competence level based on reaching the 70% threshold in each Part.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-pbl-skill',
      popover: {
        title: 'Skill Selector',
        description: 'Easily switch between Listening Practice (Part 1-4) and Reading Practice (Part 5-7).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-pbl-grid',
      popover: {
        title: 'Adjust Level per Part',
        description: 'Slide the difficulty from Level 1 (foundation) to Level 5 (advanced) to match your score goal.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  ranking: [
    {
      element: '#tour-rank-scope',
      popover: {
        title: 'Leaderboard Scope',
        description: 'View rankings across the entire platform or narrow down to your specific cohort class.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-rank-podium',
      popover: {
        title: 'Top 3 Podium',
        description: 'Honoring the top 3 learners with special badges and highest accumulated scores.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-rank-list',
      popover: {
        title: 'Detailed Leaderboard',
        description: 'Check top 10 rankings and easily see your own position on the board.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  profile: [
    {
      element: '#tour-profile-avatar',
      popover: {
        title: 'Profile Avatar',
        description: 'Upload a custom photo or generate a unique random avatar.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-profile-info',
      popover: {
        title: 'Personal Info & Display Name',
        description: 'Update your name, email, and the display name shown on leaderboards.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#tour-profile-target',
      popover: {
        title: 'Target Score & Exam Date',
        description: 'Set your desired TOEIC score (450+ to 900+) and target test date for personalized reminders.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-profile-password',
      popover: {
        title: 'Security & Password',
        description: 'Update your account password anytime to keep your profile secure.',
        side: 'top',
        align: 'center',
      },
    },
  ],
};

const getCurrentTourLanguage = (): 'vi' | 'en' => {
  if (typeof window === 'undefined') return 'vi';
  try {
    const saved = localStorage.getItem('toeic_master_language');
    if (saved === 'en') return 'en';
  } catch {
    // Storage restricted
  }
  return 'vi';
};

export const detectCurrentTourType = (): TourType => {
  if (typeof window === 'undefined') return 'general';
  const pathname = window.location.pathname;

  if (pathname.includes('/mock-test')) return 'mock-test';
  if (pathname.startsWith('/listening/') && pathname !== '/listening') return 'listening-practice';
  if (pathname.startsWith('/listening')) return 'listening';
  if (pathname.startsWith('/vocabulary')) return 'vocabulary';
  if (pathname.startsWith('/grammar')) return 'grammar';
  if (pathname.startsWith('/practice-by-level')) return 'practice-by-level';
  if (pathname.startsWith('/ranking')) return 'ranking';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/dashboard')) return 'dashboard';

  return 'general';
};

export const hasCompletedTour = (type: TourType = 'general'): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${TOUR_STORAGE_KEY}_${type}`) === 'true';
};

export const markTourCompleted = (type: TourType = 'general'): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${TOUR_STORAGE_KEY}_${type}`, 'true');
  localStorage.setItem(TOUR_STORAGE_KEY, 'true');
};

export const resetTourStatus = (type?: TourType): void => {
  if (typeof window === 'undefined') return;
  if (type) {
    localStorage.removeItem(`${TOUR_STORAGE_KEY}_${type}`);
  } else {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    Object.keys(TOUR_MAP).forEach((k) => {
      localStorage.removeItem(`${TOUR_STORAGE_KEY}_${k}`);
    });
  }
};

export const startWebsiteTour = (
  options: { type?: TourType | 'auto'; force?: boolean } | boolean = false,
): void => {
  if (typeof window === 'undefined') return;

  const force = typeof options === 'boolean' ? options : Boolean(options?.force);
  const rawType = typeof options === 'boolean' ? 'auto' : (options?.type || 'auto');

  const tourType: TourType = rawType === 'auto' ? detectCurrentTourType() : rawType;

  if (!force && hasCompletedTour(tourType)) {
    return;
  }

  // If a tour instance is already active, destroy it first
  if (activeDriverInstance && activeDriverInstance.isActive()) {
    activeDriverInstance.destroy();
  }

  const lang = getCurrentTourLanguage();
  const isEn = lang === 'en';
  const steps = isEn ? (EN_TOUR_MAP[tourType] || GENERAL_TOUR_STEPS) : (TOUR_MAP[tourType] || GENERAL_TOUR_STEPS);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  activeDriverInstance = driver({
    steps,
    animate: !prefersReducedMotion,
    smoothScroll: !prefersReducedMotion,
    allowClose: true,
    overlayColor: 'rgba(15, 23, 42, 0.72)',
    stagePadding: 6,
    stageRadius: 14,
    showProgress: true,
    progressText: isEn ? 'Step {{current}} of {{total}}' : 'Bước {{current}} / {{total}}',
    nextBtnText: isEn ? 'Next' : 'Tiếp theo',
    prevBtnText: isEn ? 'Back' : 'Quay lại',
    doneBtnText: isEn ? 'Done' : 'Hoàn tất',
    skipMissingElement: true,
    popoverClass: 'toeic-tour-popover',
    onDestroyStarted: () => {
      markTourCompleted(tourType);
      activeDriverInstance?.destroy();
      activeDriverInstance = null;
    },
  });

  activeDriverInstance.drive();
};
