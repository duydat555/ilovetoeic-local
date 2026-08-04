import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Headphones, BookOpen,
  Languages, BarChart3, Target, Sparkles, Menu, X, Star, Users, Award, ShieldCheck
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { BrandName } from '../../components/common/BrandName';
import { useAuth } from '../../context/AuthContext';
import { getRoleHome, getUserRole } from '../../utils/rbac';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const homeTarget = isAuthenticated && user ? getRoleHome(getUserRole(user)) : '/dashboard';

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 dark:bg-canvas text-slate-800 dark:text-content flex flex-col font-sans">
      {/* Landing Header */}
      <header className="h-[72px] border-b border-white/70 dark:border-line bg-white/75 dark:bg-canvas/80 backdrop-blur-2xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="size-12 rounded-2xl shadow-sm ring-1 ring-slate-200/70 dark:ring-white/10" />
          <BrandName className="rounded-md bg-white px-1.5 text-xl font-bold tracking-tight shadow-sm" />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600 dark:text-content-muted">
          <a href="#hero" className="hover:text-brand-600 transition-colors">Trang chủ</a>
          <a href="#features" className="hover:text-brand-600 transition-colors">Tính năng</a>
          <a href="#path" className="hover:text-brand-600 transition-colors">Lộ trình học</a>
          <a href="#testimonials" className="hover:text-brand-600 transition-colors">Đánh giá</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to={homeTarget}
              className="px-5 py-2.5 text-sm font-bold text-brand-ink bg-brand hover:bg-brand-hover rounded-xl shadow-md shadow-brand-600/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Vào học ngay <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-content hover:text-brand-600 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 text-sm font-semibold text-brand-ink bg-brand hover:bg-brand-hover rounded-xl shadow-md shadow-brand-600/20 transition-all transform hover:-translate-y-0.5"
              >
                Học miễn phí ngay
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          className="md:hidden p-2.5 rounded-xl text-slate-600 dark:text-content-muted hover:bg-slate-100 dark:hover:bg-surface-hover transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-surface border-b border-slate-200 dark:border-line px-4 py-6 flex flex-col gap-4 shadow-xl">
          <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Trang chủ</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Tính năng</a>
          <a href="#path" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Lộ trình học</a>
          <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium">Đánh giá</a>
          <hr className="border-slate-200 dark:border-line" />
          {isAuthenticated ? (
            <Link to={homeTarget} className="text-center py-3 font-bold text-brand-ink bg-brand rounded-xl">Vào học ngay</Link>
          ) : (
            <>
              <Link to="/login" className="text-center py-2.5 font-semibold text-slate-700 dark:text-content">Đăng nhập</Link>
              <Link to="/register" className="text-center py-3 font-semibold text-brand-ink bg-brand rounded-xl">Học miễn phí ngay</Link>
            </>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative py-16 md:py-24 lg:py-28 px-4 md:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.03fr_.97fr] gap-14 items-center">
        <div className="absolute -top-40 -right-64 size-[640px] rounded-full bg-brand-300/25 blur-3xl dark:bg-brand-700/10 pointer-events-none" />
        <div className="absolute top-64 -left-72 size-[520px] rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative flex flex-col gap-6"
        >
          <div className="eyebrow w-fit">
            <Sparkles className="w-4 h-4" />
            <span>Nền tảng luyện thi TOEIC AI cá nhân hóa #1 Việt Nam</span>
          </div>

          <h1 className="text-[2.6rem] sm:text-5xl lg:text-[4rem] font-extrabold text-slate-950 dark:text-content tracking-[-.04em] leading-[1.08]">
            Chinh phục <span className="text-brand-600 dark:text-brand-300">TOEIC 750+</span> theo lộ trình của riêng bạn
          </h1>

          <p className="text-lg text-slate-600 dark:text-content-muted leading-relaxed">
            Học thông minh với ngân hàng đề thi ETS mới nhất, thuật toán phát hiện điểm yếu và thẻ từ vựng Flashcard thông minh giúp tăng 150-200 điểm TOEIC chỉ sau 30 ngày.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link
              to={homeTarget}
              className="btn-primary min-h-14 rounded-2xl px-8 text-base group"
            >
              <span>{isAuthenticated ? 'Vào học ngay' : 'Bắt đầu học miễn phí'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/mock-test"
              className="btn-secondary min-h-14 rounded-2xl px-8 text-base"
            >
              Làm test đầu vào
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-line">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-content">25.000+</div>
              <div className="text-xs text-slate-500 font-medium">Học viên tin tưởng</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-content">500+</div>
              <div className="text-xs text-slate-500 font-medium">Đề thi ETS mới nhất</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-content">98%</div>
              <div className="text-xs text-slate-500 font-medium">Đạt mục tiêu TOEIC</div>
            </div>
          </div>
        </motion.div>

        {/* Hero Visual Card Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: .96, x: 24 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: .65, delay: .12 }}
          className="relative"
        >
          <div className="absolute -inset-8 bg-gradient-to-r from-brand-500/25 to-brand-400/25 rounded-[40px] blur-3xl" />

          <div className="relative rounded-3xl border border-white/80 dark:border-line bg-white/90 dark:bg-surface-elevated/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-line pb-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-brand-500/10 grid place-items-center text-brand-600 dark:text-brand-300 font-bold">
                  AI
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-content text-base">Phân tích năng lực học tập</h3>
                  <p className="text-xs text-slate-500 dark:text-content-muted">Cập nhật theo thời gian thực</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Đang tăng +45đ
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 dark:bg-surface/60 p-4 border border-slate-200/60 dark:border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Headphones className="size-5 text-brand-600 dark:text-brand-300" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-content-muted">Kỹ năng Nghe (Listening)</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-content">Part 1 - 4: 410 / 495 điểm</div>
                  </div>
                </div>
                <div className="size-2 rounded-full bg-emerald-500" />
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-surface/60 p-4 border border-slate-200/60 dark:border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="size-5 text-brand-600 dark:text-brand-300" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-content-muted">Kỹ năng Đọc (Reading)</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-content">Part 5 - 7: 380 / 495 điểm</div>
                  </div>
                </div>
                <div className="size-2 rounded-full bg-amber-500" />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-line flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-content">
                <ShieldCheck className="size-4 text-brand-600 dark:text-brand-300" /> Chuẩn đề thi ETS 2026
              </span>
              <span>Dự đoán: 790 TOEIC</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-white/70 dark:bg-surface/50 px-4 md:px-8 border-y border-white dark:border-line">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-content tracking-tight">
              Tính năng vượt trội cho mục tiêu TOEIC của bạn
            </h2>
            <p className="text-slate-600 dark:text-content-muted text-base">
              Đầy đủ công cụ luyện tập từ cơ bản đến nâng cao được tối ưu riêng cho học viên Việt Nam.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-surface-elevated p-7 space-y-4 hover:shadow-xl transition-all">
              <div className="size-12 rounded-2xl bg-brand-500/10 grid place-items-center text-brand-600 dark:text-brand-300">
                <Languages className="size-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-content">Thẻ từ vựng Flashcard AI</h3>
              <p className="text-sm text-slate-600 dark:text-content-muted leading-relaxed">
                Học từ vựng qua âm thanh chuẩn, ví dụ thực tế và giải thích chi tiết. Thuật toán Lặp lại ngắt quãng giúp nhớ từ vựng lâu gấp 3 lần.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-surface-elevated p-7 space-y-4 hover:shadow-xl transition-all">
              <div className="size-12 rounded-2xl bg-brand-500/10 grid place-items-center text-brand-600 dark:text-brand-300">
                <BarChart3 className="size-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-content">Thi thử ETS thời gian thực</h3>
              <p className="text-sm text-slate-600 dark:text-content-muted leading-relaxed">
                Giao diện và áp lực thời gian mô phỏng 100% kỳ thi thật tại IIG. Chấm điểm ngay kèm đáp án chi tiết và phân tích câu sai.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-line bg-white dark:bg-surface-elevated p-7 space-y-4 hover:shadow-xl transition-all">
              <div className="size-12 rounded-2xl bg-brand-500/10 grid place-items-center text-brand-600 dark:text-brand-300">
                <Target className="size-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-content">Luyện tập theo dạng bài</h3>
              <p className="text-sm text-slate-600 dark:text-content-muted leading-relaxed">
                Tập trung chinh phục từng Part từ 1 đến 7. Hệ thống tự động phát hiện lỗ hổng kiến thức để bổ sung bài tập cải thiện ngay.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
