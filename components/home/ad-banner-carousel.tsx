"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform, type PanInfo, type Variants,
} from "framer-motion";
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Ellipsis, Heart, MessageCircle, Pause, Play, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StoryRing } from "@/components/ui/story-ring";
import { buildSlides, type BannerSlide } from "@/lib/banners";
import { categoryLabel, typeLabel } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import type { CategoryId } from "@/types";

const DURATION = 6500;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Deep color on the text side (right in RTL), bright Instagram tones toward the phone. */
const THEMES: Record<CategoryId, string> = {
  fashion: "linear-gradient(to left, #6d1a52 0%, #c42b78 55%, #f77737 100%)",
  food: "linear-gradient(to left, #7a2412 0%, #d9442b 52%, #f9a03f 100%)",
  tech: "linear-gradient(to left, #1f2a7a 0%, #6a3ab5 55%, #d62976 100%)",
  beauty: "linear-gradient(to left, #4b2380 0%, #b5359a 55%, #f0627d 100%)",
  travel: "linear-gradient(to left, #1a3a8f 0%, #4f5bd5 52%, #c13584 100%)",
};

const slideVariants: Variants = {
  enter: (d: number) => ({ opacity: 0, x: -70 * d }),
  center: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE, staggerChildren: 0.09, delayChildren: 0.12 } },
  exit: (d: number) => ({ opacity: 0, x: 70 * d, transition: { duration: 0.3 } }),
};
const itemVariants: Variants = {
  enter: { opacity: 0, y: 20, filter: "blur(6px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: EASE } },
};

function CtrlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 [&_svg]:size-5">
      {children}
    </button>
  );
}

function PostMock({ slide }: { slide: BannerSlide }) {
  const Icon = CATEGORY_ICONS[slide.category];
  return (
    <div className="w-56 rounded-[1.75rem] bg-white p-2.5 text-slate-900 shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)] sm:w-60">
      <div className="flex items-center gap-2 px-1 pb-2">
        <StoryRing size={34} spin><Icon className="size-4" /></StoryRing>
        <div className="min-w-0 flex-1">
          <p dir="ltr" className="truncate text-start text-[11px] font-bold">{slide.handle}</p>
          <p className="text-[10px] text-slate-500">تبلیغ · {typeLabel(slide.publishType)}</p>
        </div>
        <Ellipsis aria-hidden className="size-4 text-slate-400" />
      </div>
      <div className="relative aspect-square overflow-hidden rounded-xl" style={{ background: THEMES[slide.category] }}>
        <span className="absolute -start-6 -top-6 size-28 rounded-full bg-white/20" />
        <span className="absolute -bottom-8 -end-6 size-32 rounded-full bg-white/15" />
        <div className="absolute inset-0 grid place-items-center">
          <motion.span className="grid size-20 place-items-center rounded-full bg-white/25 text-white backdrop-blur" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <Icon aria-hidden className="size-10" />
          </motion.span>
        </div>
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 text-[11px] font-bold leading-5 text-white">{slide.title}</p>
      </div>
      <div className="flex items-center gap-3 px-1 pt-2.5 text-slate-800">
        <motion.span animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.6, delay: 1.2, repeat: Infinity, repeatDelay: 2.6 }}>
          <Heart aria-hidden className="size-5 fill-[#e1306c] text-[#e1306c]" />
        </motion.span>
        <MessageCircle aria-hidden className="size-5" />
        <Send aria-hidden className="size-5 -scale-x-100" />
        <Bookmark aria-hidden className="ms-auto size-5" />
      </div>
      <p className="px-1 pt-1.5 text-[11px] font-bold">{formatNumber(slide.likes)} پسندیدن</p>
      <p className="truncate px-1 pb-1 text-[11px] text-slate-600"><b className="text-slate-900">{slide.business}</b> {slide.text}</p>
    </div>
  );
}

export function AdBannerCarousel({ className }: { className?: string }) {
  const { campaigns, pages } = useStore();
  const slides = useMemo(() => buildSlides(campaigns, pages), [campaigns, pages]);
  const n = slides.length;
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);

  const progress = useMotionValue(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 18 });
  const sy = useSpring(my, { stiffness: 110, damping: 18 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const fx = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const fy = useTransform(sy, [-0.5, 0.5], [-10, 10]);

  const cur = Math.min(index, n - 1);
  const slide = slides[cur];
  const playing = !reduced && !userPaused && !hovering && !focused && !hidden && n > 1;

  const go = useCallback((delta: number) => {
    setDir(delta >= 0 ? 1 : -1);
    setIndex((i) => (Math.min(i, n - 1) + delta + n) % n);
    progress.set(0);
  }, [n, progress]);

  const jump = (i: number) => { setDir(i > cur ? 1 : -1); setIndex(i); progress.set(0); };

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useAnimationFrame((_, delta) => {
    if (!playing) return;
    const next = progress.get() + delta / DURATION;
    if (next >= 1) go(1); else progress.set(next);
  });

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") go(1);   // RTL: forward is leftwards
    if (e.key === "ArrowRight") go(-1);
  };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onEnter = (e: PointerEvent<HTMLElement>) => { if (e.pointerType === "mouse") setHovering(true); };
  const onLeave = () => { setHovering(false); mx.set(0); my.set(0); };
  const onFocus = (e: FocusEvent<HTMLElement>) => { if (e.target.matches(":focus-visible")) setFocused(true); };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 70) go(1); else if (info.offset.x < -70) go(-1);   // RTL: dragging right reveals the next slide
  };

  const Icon = CATEGORY_ICONS[slide.category];

  return (
    <section aria-roledescription="carousel" aria-label="نمونه تبلیغات پخش‌چی" onKeyDown={onKey} onPointerMove={onMove} onPointerEnter={onEnter} onPointerLeave={onLeave}
      onFocus={onFocus} onBlur={() => setFocused(false)}
      className={cn("relative h-[38rem] overflow-hidden rounded-[2rem] text-white shadow-lift ring-1 ring-black/5 md:h-[30rem]", className)}>
      <AnimatePresence initial={false}>
        <motion.div key={`bg-${slide.id}`} aria-hidden className="absolute inset-0" style={{ background: THEMES[slide.category] }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-transparent md:bg-gradient-to-l md:from-black/25 md:via-transparent" />
      <div aria-hidden className="absolute inset-0 opacity-[.14] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
      <motion.span aria-hidden className="absolute -start-24 -top-28 size-80 rounded-full bg-white/10 blur-2xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={onDragEnd} style={{ touchAction: "pan-y" }} className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <AnimatePresence initial custom={dir}>
          <motion.div key={slide.id} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit"
            className="absolute inset-0 grid grid-rows-[auto_1fr] gap-4 px-6 pt-14 md:grid-cols-[1.1fr_1fr] md:grid-rows-1 md:items-center md:px-12 md:pb-4 md:pt-10">
            <div className="flex min-w-0 flex-col items-start justify-center gap-4 md:pb-12">
              <motion.span variants={itemVariants} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium backdrop-blur">
                <Icon aria-hidden className="size-4" />{slide.business}
              </motion.span>
              <motion.h2 variants={itemVariants} className="text-2xl font-extrabold leading-snug sm:text-3xl md:text-4xl md:leading-snug">{slide.title}</motion.h2>
              <motion.p variants={itemVariants} className="line-clamp-2 max-w-md text-sm leading-7 text-white/90 md:text-base md:leading-8">{slide.text}</motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg" }), "bg-white text-navy-900 shadow-lift hover:bg-white/90")}>ثبت تبلیغ مشابه<ArrowLeft /></Link>
                <span className="text-sm text-white/85">{typeLabel(slide.publishType)} · {categoryLabel(slide.category)}</span>
              </motion.div>
            </div>

            <div className="relative flex h-full items-start justify-center overflow-hidden md:items-center md:overflow-visible" style={{ perspective: 900 }}>
              <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} initial={{ opacity: 0, y: 40, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}>
                <PostMock slide={slide} />
              </motion.div>
              <motion.div aria-hidden style={{ x: fx, y: fy }} className="absolute end-0 top-6 hidden md:block">
                <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lift">
                  <Heart className="size-4 fill-[#e1306c] text-[#e1306c]" />{formatNumber(slide.likes)} پسندیدن
                </motion.div>
              </motion.div>
              <motion.div aria-hidden style={{ x: fx, y: fy }} className="absolute bottom-14 start-0 hidden md:block">
                <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lift">
                  <MessageCircle className="size-4 text-brand-600" />{formatNumber(slide.comments)} نظر
                </motion.div>
              </motion.div>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-24 hidden justify-center gap-10 md:flex">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} initial={{ opacity: 0 }} animate={{ y: [0, -150], opacity: [0, 1, 0], x: [0, i % 2 ? 14 : -14, 0] }} transition={{ duration: 3.2, delay: 1.4 + i * 0.7, repeat: Infinity, repeatDelay: 1.2, ease: "easeOut" }}>
                    <Heart className="size-5 fill-white/90 text-white/90" />
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="absolute inset-x-5 top-3 z-20 flex gap-1.5 md:inset-x-10 md:top-4">
        {slides.map((s, i) => (
          <button key={s.id} type="button" onClick={() => jump(i)} aria-label={`رفتن به تبلیغ ${formatNumber(i + 1)}: ${s.title}`} aria-current={i === cur ? "true" : undefined} className="flex h-6 flex-1 items-center">
            <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/30">
              {i < cur && <span className="absolute inset-0 bg-white" />}
              {i === cur && <motion.span className="absolute inset-0 origin-right bg-white" style={{ scaleX: reduced ? 1 : progress }} />}
            </span>
          </button>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-2 md:inset-x-auto md:bottom-6 md:start-12 md:justify-start">
        <CtrlButton label="تبلیغ قبلی" onClick={() => go(-1)}><ChevronRight /></CtrlButton>
        {!reduced && n > 1 && (
          <CtrlButton label={userPaused ? "ادامهٔ پخش خودکار" : "توقف پخش خودکار"} onClick={() => setUserPaused((p) => !p)}>{userPaused ? <Play /> : <Pause />}</CtrlButton>
        )}
        <CtrlButton label="تبلیغ بعدی" onClick={() => go(1)}><ChevronLeft /></CtrlButton>
        <span aria-hidden className="ms-1 text-xs text-white/80">{formatNumber(cur + 1)} / {formatNumber(n)}</span>
      </div>
      <span className="absolute end-4 top-8 z-20 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur md:bottom-6 md:end-12 md:top-auto">نمونهٔ تبلیغ</span>
      <p className="sr-only" aria-live={playing ? "off" : "polite"}>تبلیغ {formatNumber(cur + 1)} از {formatNumber(n)}: {slide.title}</p>
    </section>
  );
}
