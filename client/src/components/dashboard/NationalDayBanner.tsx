import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy, Award, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from './StatCard';
import { DogMascot } from '../DogMascot';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import quockhanhSvg from '../../assets/icons/quockhanh.svg';
import './NationalDayBanner.css';

export interface NationalDayBannerProps {
  userName: string;
  xp: number;
  streakDays: number;
  longestStreak: number;
  ctaLink?: string;
  isLoading?: boolean;
}

const DEFAULT_MESSAGE = "Mừng Quốc khánh 2/9! Hào khí ngàn năm — cùng chinh phục 900+ TOEIC nào cậu ơi! 🇻🇳";
const FESTIVE_MESSAGES = [
  "Chào mừng Quốc khánh 2/9! 🇻🇳",
  "Tự hào vươn xa cùng TOEIC nào cậu ơi! 🚀",
  "Nghỉ lễ không quên luyện đề cùng Tinh Tú nhé! 🐾",
  "Hôm nay nhận thêm XP rực rỡ nhé cậu!",
  "Độc lập - Tự do - Chinh phục 900+ TOEIC! 💪",
  "Tinh Tú giơ cao cờ mừng 2/9 nè! 🇻🇳",
];

export const NationalDayBanner: React.FC<NationalDayBannerProps> = ({
  userName,
  xp,
  streakDays,
  longestStreak,
  ctaLink = '/practice-by-level',
  isLoading = false,
}) => {
  const [bubbleText, setBubbleText] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    if (bubbleText !== DEFAULT_MESSAGE) {
      const timer = setTimeout(() => {
        setBubbleText(DEFAULT_MESSAGE);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bubbleText]);

  const handleMascotInteract = () => {
    let newMessage;
    do {
      newMessage = FESTIVE_MESSAGES[Math.floor(Math.random() * FESTIVE_MESSAGES.length)];
    } while (newMessage === bubbleText && FESTIVE_MESSAGES.length > 1);
    setBubbleText(newMessage);
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <section className="nd-banner relative flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 rounded-[24px] overflow-hidden bg-[#f3e4bf] border border-[#e2d0a3]">
          <div className="relative z-10 flex-1 flex flex-col space-y-4 w-full md:w-auto">
            <BoneyardSkeleton name="nd-badge-skel" height={24} width={130} className="!rounded-full !bg-amber-300/50 mb-3" />
            <BoneyardSkeleton name="nd-title-skel" height={36} width="60%" className="!rounded-xl !bg-amber-300/50" />
            <BoneyardSkeleton name="nd-sub-skel" height={16} width="80%" className="mt-2.5 !rounded-lg !bg-amber-300/30" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative w-full mt-7 sm:mt-10">
      <section
        className="nd-banner relative w-full flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 rounded-[28px] bg-[#f3e4bf] border border-[#e2d0a3] text-slate-900 overflow-visible"
        aria-label="Chào mừng Quốc khánh 2/9"
      >
        {/* ── HERO BACKGROUND SVG (POP-OUT / OVERLAPPING FLAG) ── */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
          <img
            src={quockhanhSvg}
            alt="Hình nền Quốc khánh 2/9 (SVG)"
            className="absolute left-0 bottom-0 h-[120%] sm:h-[130%] md:h-[135%] max-w-none object-contain object-left-bottom origin-bottom-left -translate-x-4 sm:-translate-x-6 translate-y-4 sm:translate-y-6 pointer-events-none"
          />
        </div>

        {/* ── MAIN CONTENT (Badge + Greeting + Stats pushed right to avoid overlap) ── */}
        <div className="relative z-20 flex-1 flex flex-col space-y-4 w-full md:w-auto pl-[180px] sm:pl-[260px] md:pl-[300px]">
          <div>
            <motion.div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DA251D] text-[#FFCD00] text-xs font-black tracking-wider uppercase shadow-md shadow-red-900/20 mb-3 border border-red-600"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Sparkles className="size-3.5 text-[#FFCD00] animate-spin-slow" />
              <span>Mừng Quốc khánh 2/9 🇻🇳</span>
            </motion.div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-950 tracking-tight leading-snug drop-shadow-sm">
              Chào {userName}{' '}
              <span className="inline-block animate-[wave-hand_2s_ease-in-out_infinite] origin-bottom-right">👋</span>
            </h1>

            <p className="nd-subtext text-sm sm:text-base font-bold mt-1.5 max-w-md leading-relaxed">
              Hào khí 2/9 — duy trì chuỗi luyện TOEIC rực rỡ cùng Tinh Tú và chinh phục mục tiêu hôm nay!
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-3 pt-2">
            <StatCard
              id="stat-xp-nd"
              icon={<Award className="size-4" />}
              label="Điểm XP"
              value={xp}
              badgeBg="bg-gradient-to-br from-amber-400 to-amber-500"
              iconColor="text-amber-950"
              cardBg="bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md"
              textColor="text-slate-900"
              labelColor="text-slate-600 font-bold"
            />
            <StatCard
              id="stat-streak-nd"
              icon={<Flame className="size-4" />}
              label="Chuỗi ngày"
              value={streakDays}
              unit="ngày"
              badgeBg="bg-gradient-to-br from-orange-400 to-red-500"
              iconColor="text-white"
              cardBg="bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md"
              textColor="text-slate-900"
              labelColor="text-slate-600 font-bold"
            />
            <StatCard
              id="stat-longest-nd"
              icon={<Trophy className="size-4" />}
              label="Max Streak"
              value={longestStreak}
              unit="ngày"
              badgeBg="bg-gradient-to-br from-amber-400 to-amber-600"
              iconColor="text-amber-950"
              cardBg="bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md"
              textColor="text-slate-900"
              labelColor="text-slate-600 font-bold"
            />
          </div>
        </div>

        {/* ── MIDDLE: Mascot Tinh Tú ── */}
        <div className="relative z-20 flex justify-center w-full md:w-[200px] mt-6 md:mt-0 shrink-0">
          <DogMascot onInteraction={handleMascotInteract} size={140} />
          <div className="hidden md:block absolute top-1/2 left-[calc(50%+55px)] w-[35px] h-0 border-t-2 border-dashed border-amber-400/60 -translate-y-2" />
        </div>

        {/* ── RIGHT: Speech Bubble + CTA ── */}
        <div className="relative z-20 w-full md:w-[250px] flex flex-col justify-center mt-6 md:mt-0 shrink-0">
          <div className="relative bg-white/95 backdrop-blur-lg rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-950/10 border border-white/90">
            {/* Bubble Pointer */}
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 md:top-1/2 md:-left-[8px] md:-translate-y-1/2 md:translate-x-0 w-4 h-4 bg-white/95 backdrop-blur-lg border-t border-l border-white/90 rotate-45 md:-rotate-45" />

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
              className="nd-cta group relative overflow-hidden mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 text-amber-950 font-extrabold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-200 hover:-translate-y-0.5"
            >
              <span className="nd-cta-shine absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full pointer-events-none" />
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="size-4 animate-pulse text-amber-950" />
                Làm đề ngay
              </span>
              <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1 text-amber-950" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
