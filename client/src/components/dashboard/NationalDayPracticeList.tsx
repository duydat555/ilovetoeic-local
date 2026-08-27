import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Headphones, 
  Languages, 
  LibraryBig, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Award 
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface FestivePracticeItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  questionsCount?: string;
  icon: React.ReactNode;
  path: string;
  actionLabel: string;
  badgeText?: string;
  gradient: string;
}

const FESTIVE_PRACTICE_ITEMS: FestivePracticeItem[] = [
  {
    id: 'mock-history-vn',
    title: 'Đề thi thử chủ đề Lịch sử & Văn hoá Việt Nam',
    category: 'Đề thi thử TOEIC',
    duration: '120 phút',
    questionsCount: '200 câu',
    icon: <ClipboardCheck className="size-5 text-white" />,
    path: '/mock-test',
    actionLabel: 'Làm ngay',
    badgeText: 'ĐỀ ĐẶC BIỆT',
    gradient: 'from-red-600 to-amber-500',
  },
  {
    id: 'listening-part34-event',
    title: 'Luyện Part 3 - 4 Listening: Chủ đề Ngày lễ & Sự kiện',
    category: 'Nghe hiểu Listening',
    duration: '15 phút',
    questionsCount: '30 câu',
    icon: <Headphones className="size-5 text-white" />,
    path: '/practice-by-level',
    actionLabel: 'Luyện ngay',
    badgeText: 'HOT',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'flashcard-country-words',
    title: 'Flashcard 100 Từ vựng TOEIC Chủ đề Đất nước & Văn hoá',
    category: 'Từ vựng Flashcard',
    duration: '10 phút',
    questionsCount: '100 từ',
    icon: <Languages className="size-5 text-white" />,
    path: '/vocabulary',
    actionLabel: 'Học ngay',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'grammar-speed-challenge',
    title: 'Grammar Part 5: Chuyên đề Luyện đề Thần tốc 2/9',
    category: 'Ngữ pháp TOEIC',
    duration: '20 phút',
    questionsCount: '40 câu',
    icon: <LibraryBig className="size-5 text-white" />,
    path: '/grammar',
    actionLabel: 'Luyện ngay',
    gradient: 'from-blue-600 to-indigo-600',
  },
];

export const NationalDayPracticeList: React.FC = () => {
  return (
    <div className="w-full space-y-3 mt-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[#DA251D] animate-pulse" />
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Nội dung luyện tập nổi bật dịp Quốc khánh 2/9
          </h2>
        </div>
        <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
          <span>🇻🇳</span> 4 Chủ đề độc quyền
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {FESTIVE_PRACTICE_ITEMS.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <Link
              to={item.path}
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 gap-3 overflow-hidden"
            >
              {/* Left Highlight Accent Bar on Hover */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${item.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

              {/* Left Section: Icon Thumbnail + Info */}
              <div className="flex items-center gap-3.5 min-w-0 pl-1.5">
                {/* Icon Badge */}
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                  {item.icon}
                </div>

                {/* Text Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-amber-900/80 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.badgeText && (
                      <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded-md">
                        {item.badgeText}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-red-700 transition-colors truncate">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-slate-400" />
                      {item.duration}
                    </span>
                    {item.questionsCount && (
                      <span className="flex items-center gap-1">
                        <Award className="size-3 text-slate-400" />
                        {item.questionsCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section: Outlined CTA Button */}
              <div className="flex items-center justify-end sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 bg-red-50/50 text-red-700 font-extrabold text-xs group-hover:bg-[#DA251D] group-hover:text-white group-hover:border-[#DA251D] transition-all duration-200 shadow-sm">
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
