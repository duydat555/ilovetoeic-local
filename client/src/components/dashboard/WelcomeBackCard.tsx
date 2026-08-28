import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy, Award, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from './StatCard';
import { DogMascot } from '../DogMascot';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { NationalDayBanner } from './NationalDayBanner';
import './WelcomeBackCard.css';

export interface WelcomeBackCardProps {
  userName: string;
  xp: number;
  streakDays: number;
  longestStreak: number;
  ctaLink?: string;
  isLoading?: boolean;
}

const DEFAULT_MESSAGE = "Gâu gâu! Tỉnh Tú đây, hôm nay mình luyện phần nào?";
const JUMP_MESSAGES = [
  "Cậu vừa nhéo mình à? 🐾",
  "Hôm nay học chưa nè?",
  "Nhảy phát cho vui thôi!",
  "Đợi mình lấy đề cho cậu nha!",
  "Cố lên nha, mình luôn ủng hộ cậu! 🚀",
  "Nhiều XP quá ta ơi!",
];

export const WelcomeBackCard: React.FC<WelcomeBackCardProps> = (props) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const isNationalDayTheme = isFeatureEnabled('national_day_theme');

  if (isNationalDayTheme) {
    return <NationalDayBanner {...props} />;
  }

  const {
    userName,
    xp,
    streakDays,
    longestStreak,
    ctaLink = '/practice-by-level',
    isLoading = false,
  } = props;

  const [bubbleText, setBubbleText] = useState(DEFAULT_MESSAGE);

  // Auto reset bubble text after 5 seconds
  useEffect(() => {
    if (bubbleText !== DEFAULT_MESSAGE) {
      const timer = setTimeout(() => {
        setBubbleText(DEFAULT_MESSAGE);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bubbleText]);

  if (isLoading) {
    return (
      <section 
        className="welcome-dashboard-card relative flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 rounded-[24px] overflow-hidden"
        aria-label="Đang tải thẻ chào mừng"
      >
        {/* Layer 0: Solid Soft Light Yellow Background (Màu vàng nhạt tiến về trắng) */}
        <div className="absolute inset-0 pointer-events-none bg-[#FFF3C4] dark:bg-slate-900" />

        {/* Left: Content & Stats Skeleton */}
        <div className="relative z-10 flex-1 flex flex-col space-y-4 w-full md:w-auto">
          <div>
            <BoneyardSkeleton name="welcome-badge-skel" height={24} width={130} className="!rounded-full !bg-amber-300/50 mb-3" />
            <BoneyardSkeleton name="welcome-title-skel" height={36} width="60%" className="!rounded-xl !bg-amber-300/50" />
            <BoneyardSkeleton name="welcome-subtitle-skel" height={16} width="80%" className="mt-2.5 !rounded-lg !bg-amber-300/30" />
          </div>

          {/* Stats Row Skeleton */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/50 border border-white/60 min-w-[130px]">
                <BoneyardSkeleton name={`stat-icon-skel-${i}`} height={36} width={36} className="!rounded-xl !bg-amber-300/50" />
                <div className="flex flex-col gap-1">
                  <BoneyardSkeleton name={`stat-val-skel-${i}`} height={16} width={50} className="!bg-amber-300/50" />
                  <BoneyardSkeleton name={`stat-lbl-skel-${i}`} height={12} width={65} className="!bg-amber-300/30" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Mascot Skeleton */}
        <div className="relative z-10 flex justify-center w-full md:w-[220px] mt-8 md:mt-0 shrink-0">
          <BoneyardSkeleton name="welcome-mascot-skel" height={150} width={150} className="!rounded-full !bg-amber-300/40" />
        </div>

        {/* Right: Speech Bubble & CTA Skeleton */}
        <div className="relative z-10 w-full md:w-[260px] flex flex-col justify-center mt-6 md:mt-0 shrink-0">
          <div className="relative bg-white/70 backdrop-blur-lg rounded-2xl p-4 sm:p-5 border border-white/80 space-y-3">
            <BoneyardSkeleton name="bubble-text-skel-1" height={14} width="95%" className="!bg-amber-300/40" />
            <BoneyardSkeleton name="bubble-text-skel-2" height={14} width="70%" className="!bg-amber-300/40" />
            <BoneyardSkeleton name="cta-btn-skel" height={42} width="100%" className="mt-4 !rounded-xl !bg-amber-400/60" />
          </div>
        </div>
      </section>
    );
  }

  const handleMascotInteract = () => {
    let newMessage;
    do {
      newMessage = JUMP_MESSAGES[Math.floor(Math.random() * JUMP_MESSAGES.length)];
    } while (newMessage === bubbleText && JUMP_MESSAGES.length > 1);
    
    setBubbleText(newMessage);
  };

  return (
    <section 
      className="welcome-dashboard-card relative flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 rounded-[24px] overflow-hidden"
      aria-label="Chào mừng trở lại"
    >
      {/* ─── Layer 0: Solid Soft Light Yellow Background ─── */}
      <div className="absolute inset-0 pointer-events-none bg-[#FFF3C4] dark:bg-slate-900" />

      {/* ─── Left: Content & Stats ─── */}
      <div className="relative z-10 flex-1 flex flex-col space-y-4 w-full md:w-auto">
        <div>
          <motion.div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/90 backdrop-blur-md border border-amber-300/80 text-amber-950 text-xs font-black tracking-wider uppercase shadow-md shadow-amber-500/20 mb-3"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles className="size-3.5 text-amber-950 animate-spin-slow" />
            <span>Chào mừng trở lại</span>
          </motion.div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-950 tracking-tight leading-snug">
            Chào {userName} <span className="inline-block animate-[wave-hand_2s_ease-in-out_infinite] origin-bottom-right">👋</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-amber-900/80 mt-1.5 max-w-sm">
            Tiếp tục lộ trình TOEIC hôm nay để duy trì phong độ và chinh phục mục tiêu của bạn!
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 sm:flex sm:flex-wrap sm:gap-3">
          <StatCard
            id="stat-xp"
            icon={<Award className="size-4" />}
            label="Điểm XP"
            value={xp}
            badgeBg="bg-gradient-to-br from-blue-400 to-blue-600"
            iconColor="text-white"
          />
          <StatCard
            id="stat-streak"
            icon={<Flame className="size-4" />}
            label="Chuỗi ngày"
            value={streakDays}
            unit="ngày"
            badgeBg="bg-gradient-to-br from-orange-400 to-red-500"
            iconColor="text-white"
          />
          <StatCard
            id="stat-longest-streak"
            icon={<Trophy className="size-4" />}
            label="Max Streak"
            value={longestStreak}
            unit="ngày"
            badgeBg="bg-gradient-to-br from-amber-400 to-amber-600"
            iconColor="text-white"
          />
        </div>
      </div>

      {/* ─── Middle: Mascot ─── */}
      <div className="relative z-10 flex justify-center w-full md:w-[220px] mt-8 md:mt-0 shrink-0">
        <DogMascot onInteraction={handleMascotInteract} size={150} />
        
        {/* Dotted connecting line (visible on desktop) */}
        <div className="hidden md:block absolute top-1/2 left-[calc(50%+60px)] w-[40px] h-0 border-t-2 border-dashed border-amber-400/60 -translate-y-2" />
      </div>

      {/* ─── Right: Speech Bubble & CTA ─── */}
      <div className="relative z-10 w-full md:w-[260px] flex flex-col justify-center mt-6 md:mt-0 shrink-0">
        <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-950/5 border border-white/80">
          
          {/* Bubble Pointer */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 md:top-1/2 md:-left-[8px] md:-translate-y-1/2 md:translate-x-0 w-4 h-4 bg-white/80 backdrop-blur-lg border-t border-l border-white/80 rotate-45 md:-rotate-45" />
          
          {/* Animate text change with pop */}
          <AnimatePresence mode="wait">
            <motion.p
              key={bubbleText}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold text-slate-800 leading-relaxed relative z-10 min-h-[40px] flex items-center"
            >
              {bubbleText}
            </motion.p>
          </AnimatePresence>

          <Link 
            to={ctaLink} 
            className="welcome-cta group relative overflow-hidden mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 text-amber-950 font-extrabold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-200 hover:-translate-y-0.5"
          >
            {/* Shine Sweep light beam */}
            <span className="cta-shine-sweep absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full pointer-events-none" />
            
            <span className="relative z-10 flex items-center gap-1.5">
              <Sparkles className="size-4 animate-pulse" />
              Làm đề ngay
            </span>
            <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};
