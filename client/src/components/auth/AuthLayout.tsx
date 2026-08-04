import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Quote } from 'lucide-react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';

const authCopy = {
  login: {
    heading: 'Chào mừng bạn quay trở lại!',
    description:
      'Tiếp tục lộ trình đang học và tiến gần hơn tới điểm TOEIC mục tiêu của bạn.',
    quote: 'Không cần học nhiều hơn. Chỉ cần học đúng phần bạn đang yếu.',
  },
  register: {
    heading: 'Bắt đầu hành trình chinh phục TOEIC!',
    description:
      'Tạo tài khoản để nhận lộ trình cá nhân hóa và bắt đầu học theo mục tiêu của riêng bạn.',
    quote: 'Mục tiêu rõ ràng hôm nay giúp mỗi buổi học ngày mai có ý nghĩa hơn.',
  },
};

const AuthWordmark = () => (
  <span className="text-xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-gray-100">
    ilove<span className="text-[#ffc72c]">toeic</span>
  </span>
);

export const AuthLayout: React.FC = () => {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const isRegister = location.pathname === '/register';
  const copy = isRegister ? authCopy.register : authCopy.login;

  const formMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : isRegister
      ? {
          initial: { opacity: 0, x: 42 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 42 },
        }
      : {
          initial: { opacity: 0, x: -42 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -42 },
        };

  return (
    <main className="min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-gray-100 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <aside
        className="relative hidden min-h-[100dvh] overflow-hidden border-r border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 92%, rgba(255, 199, 44, 0.16), transparent 42%), linear-gradient(145deg, rgba(255, 255, 255, 0.025), transparent 48%)',
        }}
      >
        <div className="relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Trang chủ
          </Link>

          <div className="mt-12 flex items-center gap-3">
            <BrandLogo className="size-12 rounded-xl ring-1 ring-slate-200 dark:ring-white/10" />
            <AuthWordmark />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="mt-16 max-w-lg"
            >
              <h2 className="max-w-md text-4xl font-extrabold leading-[1.12] tracking-[-0.035em] text-slate-950 dark:text-gray-50 xl:text-5xl">
                {copy.heading}
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-600 dark:text-gray-400">
                {copy.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={`quote-${location.pathname}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.3 }}
            className="relative mt-12 max-w-lg rounded-2xl border border-[#e5ad00]/25 bg-white/75 p-5 shadow-[0_18px_45px_-32px_rgba(138,94,21,0.32),inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-[#ffc72c]/20 dark:bg-gray-900/65 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <Quote className="size-5 text-[#ffc72c]" aria-hidden="true" />
            <blockquote className="mt-3 text-sm font-medium leading-6 text-slate-700 dark:text-gray-200">
              “{copy.quote}”
            </blockquote>
            <figcaption className="mt-3 text-xs text-slate-500 dark:text-gray-500">Lời nhắc dành cho bạn</figcaption>
          </motion.figure>
        </AnimatePresence>
      </aside>

      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 dark:bg-gray-950 sm:px-8 lg:px-12 lg:py-10">
        <div
          className="pointer-events-none absolute -right-40 -top-48 size-[30rem] rounded-full opacity-70 blur-3xl"
          style={{ background: 'rgba(255, 199, 44, 0.055)' }}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[36rem]">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-3" aria-label="ilovetoeic - Trang chủ">
              <BrandLogo className="size-10 rounded-xl ring-1 ring-slate-200 dark:ring-white/10" />
              <AuthWordmark />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Trang chủ
            </Link>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={formMotion.initial}
              animate={formMotion.animate}
              exit={formMotion.exit}
              transition={{ duration: reduceMotion ? 0.15 : 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
};
