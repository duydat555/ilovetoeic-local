import type { VoiceMode, VoicePersona } from '../../services/ai';

export const MODE_OPTIONS: Array<{ value: VoiceMode; label: string; hint: string }> = [
  { value: 'assistant', label: 'Trợ lý TOEIC', hint: 'Hỏi đáp tự do, trả lời bằng tiếng Việt hoặc tiếng Anh theo cách bạn nói.' },
  { value: 'speaking', label: 'Luyện nói tiếng Anh', hint: 'Trò chuyện hoàn toàn bằng tiếng Anh, có gợi ý khi bạn bí từ.' },
  { value: 'roleplay', label: 'Nhập vai tình huống', hint: 'Đóng vai trong một tình huống công sở quen thuộc của TOEIC.' },
  { value: 'examiner', label: 'Phỏng vấn thử', hint: 'Giám khảo hỏi từng câu như bài thi nói, nhận xét ở cuối.' },
];

export const PERSONA_OPTIONS: Array<{ value: VoicePersona; label: string }> = [
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'strict', label: 'Nghiêm khắc' },
  { value: 'humorous', label: 'Hài hước' },
  { value: 'colleague', label: 'Đồng nghiệp' },
];

export const SCENARIOS: Array<{ label: string; prompt: string }> = [
  { label: 'Phỏng vấn xin việc', prompt: 'A job interview for an office position at an international company. You are the hiring manager.' },
  { label: 'Đặt phòng khách sạn', prompt: 'A phone call to book a hotel room for a business trip. You are the receptionist.' },
  { label: 'Họp nhóm', prompt: 'A weekly team meeting where you are the team leader asking for project updates.' },
  { label: 'Khiếu nại dịch vụ', prompt: 'A customer calls to complain about a delayed delivery. You are the customer service agent.' },
  { label: 'Gọi cho khách hàng', prompt: 'You call a client to confirm the details of an upcoming meeting. You are the client.' },
];

export const EN_VOICES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Mặc định' },
  { value: 'af_heart', label: 'Nữ, giọng Mỹ' },
  { value: 'am_adam', label: 'Nam, giọng Mỹ' },
  { value: 'bf_emma', label: 'Nữ, giọng Anh' },
  { value: 'bm_george', label: 'Nam, giọng Anh' },
];

export const STATE_LABEL: Record<string, string> = {
  connecting: 'Đang kết nối…',
  listening: 'Mình đang nghe bạn',
  'user-speaking': 'Bạn cứ nói nhé',
  thinking: 'Đang suy nghĩ…',
  'ai-speaking': 'Đang trả lời',
  muted: 'Micro đang tắt',
  idle: '',
};
