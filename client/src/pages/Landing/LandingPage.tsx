import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Headphones, BookOpen,
  Languages, BarChart3, Target, Sparkles, Menu, X, Star, Users, Award, ShieldCheck
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { BrandName } from '../../components/common/BrandName';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

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
          <Link to="/login" className="text-center py-2.5 font-semibold text-slate-700 dark:text-content">Đăng nhập</Link>
          <Link to="/register" className="text-center py-3 font-semibold text-brand-ink bg-brand rounded-xl">Học miễn phí ngay</Link>
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
              to="/dashboard"
              className="btn-primary min-h-14 rounded-2xl px-8 text-base group"
            >
              <span>Bắt đầu học miễn phí</span>
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
          <div className="relative surface rounded-[32px] p-5 sm:p-7 flex flex-col gap-6">
            <div className="absolute -right-5 top-14 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-xl dark:border-line dark:bg-surface/90 animate-float">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dự đoán mới</div>
              <div className="mt-1 text-lg font-extrabold text-emerald-600">+35 điểm</div>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/10 text-brand-600 font-bold flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-content">Mục tiêu cá nhân</div>
                  <div className="text-xs text-slate-500">Mục tiêu: 750 / Đạt: 620</div>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
                +130 điểm
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiến độ hôm nay</div>
              <div className="bg-slate-50 dark:bg-surface-hover/50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Headphones className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-semibold">Listening Part 2 (WH-Questions)</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="bg-slate-50 dark:bg-surface-hover/50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                  <span className="text-sm font-semibold">Reading Part 5 (Từ loại Noun/Adj)</span>
                </div>
                <span className="text-xs font-bold text-brand-600">Đang học</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white/70 dark:bg-surface/50 px-4 md:px-8 border-y border-white dark:border-line">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-content">
              Tính năng vượt trội nâng tầm kết quả học tập
            </h2>
            <p className="text-slate-600 dark:text-content-muted">
              Được thiết kế chuẩn khung đề thi ETS TOEIC thực tế, giúp bạn rèn luyện phản xạ và tối ưu từng giây làm bài.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Lộ trình cá nhân hóa', desc: 'Phân tích trình độ đầu vào để tự động đề xuất danh sách bài học và kỹ năng cần tập trung mỗi ngày.' },
              { icon: Headphones, title: 'Luyện nghe Listening chuyên sâu', desc: 'Trình phát audio thông minh có transcript chi tiết, dịch nghĩa từng câu và từ vựng trọng tâm.' },
              { icon: BookOpen, title: 'Kho đề thi ETS phong phú', desc: 'Đề thi đầy đủ 200 câu và Mini Test 60 phút có đồng hồ đếm ngược tự động chấm điểm chính xác.' },
              { icon: Languages, title: 'Thẻ từ vựng Flashcard 3D', desc: 'Học từ vựng theo chủ đề Office, Business, Finance với hiệu ứng lật 3D và phiên âm IPA chuẩn.' },
              { icon: BarChart3, title: 'Phân tích điểm mạnh & điểm yếu', desc: 'Biểu đồ Recharts chi tiết tỷ lệ chính xác từng Part giúp phát hiện ngay phần kiến thức bị hổng.' },
              { icon: Award, title: 'Sổ lỗi sai thông minh', desc: 'Tự động tổng hợp và nhắc nhở ôn tập lại những câu hỏi bạn đã chọn sai để không lặp lại lỗi.' }
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -7 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="surface p-8 group"
                >
                  <div className="icon-box mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-content mb-3">{f.title}</h3>
                  <p className="text-slate-600 dark:text-content-muted text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Path Steps */}
      <section id="path" className="py-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-content">
            5 Bước chinh phục TOEIC thành công
          </h2>
          <p className="text-slate-600 dark:text-content-muted">
            Quy trình chuẩn hóa giúp bạn từng bước tự tin bước vào phòng thi thật.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { step: '01', title: 'Test đầu vào', desc: 'Đánh giá chính xác điểm xuất phát' },
            { step: '02', title: 'Đặt mục tiêu', desc: 'Thiết lập điểm số mong muốn & ngày thi' },
            { step: '03', title: 'Nhận lộ trình', desc: 'Hệ thống tự tạo kế hoạch học tập' },
            { step: '04', title: 'Luyện tập daily', desc: 'Học từ vựng, nghe & đọc mỗi ngày' },
            { step: '05', title: 'Thi thử ETS', desc: 'Tối ưu tốc độ & điểm số thực tế' }
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-surface-elevated p-6 rounded-2xl border border-slate-200 dark:border-line relative">
              <span className="text-3xl font-extrabold text-brand-600/20 dark:text-brand-300/20 block mb-2">{s.step}</span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-content mb-2">{s.title}</h4>
              <p className="text-xs text-slate-500 dark:text-content-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-brand text-brand-ink px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Cảm nhận từ học viên đạt 750+ TOEIC</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-800 dark:text-content">
            {[
              { name: 'Trần Thu Thảo', score: '880 TOEIC', text: 'Nhờ tính năng sổ lỗi sai và lật từ vựng Flashcard 3D, mình đã tăng từ 550 lên 880 điểm chỉ sau 2 tháng tự học.' },
              { name: 'Lê Hoàng Nam', score: '820 TOEIC', text: 'Trình phát audio bài Listening có transcript dịch nghĩa chi tiết giúp mình luyện phản xạ Part 3 & Part 4 cực kỳ hiệu quả.' },
              { name: 'Phạm Đức Anh', score: '795 TOEIC', text: 'Giao diện cực kỳ hiện đại, không quảng cáo làm phiền và biểu đồ điểm số phân tích điểm yếu rất trực quan.' }
            ].map((t, i) => (
              <div key={i} className="bg-white dark:bg-surface-elevated p-8 rounded-3xl shadow-xl flex flex-col justify-between text-left">
                <div className="space-y-4">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-content-muted italic">"{t.text}"</p>
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-line flex items-center justify-between mt-6">
                  <span className="font-bold text-slate-900 dark:text-content">{t.name}</span>
                  <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-200 rounded-full text-xs font-bold">
                    {t.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 md:px-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <BrandLogo className="size-10 rounded-xl" />
              <BrandName className="rounded-md bg-white px-1.5 text-lg font-bold" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nền tảng luyện thi TOEIC trực tuyến hàng đầu giúp học viên tự tin chinh phục mục tiêu điểm số cao nhất.
            </p>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-white mb-4">Sản phẩm</h5>
            <ul className="space-y-2 text-xs">
              <li><Link to="/mock-test" className="hover:text-white">Luyện tập theo đề TOEIC</Link></li>
              <li><Link to="/mock-test" className="hover:text-white">Đề thi thử ETS</Link></li>
              <li><Link to="/vocabulary" className="hover:text-white">Từ vựng Flashcards</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-white mb-4">Hỗ trợ</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white">Hướng dẫn học tập</a></li>
              <li><a href="#" className="hover:text-white">Câu hỏi thường gặp</a></li>
              <li><a href="#" className="hover:text-white">Chính sách bảo mật</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-white mb-4">Liên hệ</h5>
            <p className="text-xs text-slate-500">Email: support@ilovetoeic.edu.vn</p>
            <p className="text-xs text-slate-500 mt-1">Hotline: 1900 6789</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-8 text-center text-xs text-slate-600">
          © 2026 <BrandName className="font-semibold" />. Tất cả quyền được bảo lưu.
        </div>
      </footer>
    </div>
  );
};
