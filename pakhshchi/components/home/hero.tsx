"use client";

import Link from "next/link";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { Film, ImageIcon, Layers } from "lucide-react";
import { HeroBannerCarousel } from "@/components/home/hero-banner-carousel";
import { InstagramBackdrop } from "@/components/home/instagram-backdrop";
import { PagesMarquee } from "@/components/home/pages-marquee";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORDS = "یک تبلیغ، چندین پیج اینستاگرام".split(" ");
const EASE = [0.22, 1, 0.36, 1] as const;
const headline: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const word: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};
const CHIPS = [{ icon: Layers, label: "استوری" }, { icon: ImageIcon, label: "پست" }, { icon: Film, label: "ریلز" }];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <InstagramBackdrop />
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16 lg:pt-20">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <div className="flex flex-wrap justify-center gap-2">
              {CHIPS.map(({ icon: Icon, label }, i) => (
                <motion.span key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.08, duration: 0.5, ease: EASE }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-navy-800 shadow-soft backdrop-blur">
                  <Icon aria-hidden className="size-4 text-[#d62976]" />{label}
                </motion.span>
              ))}
            </div>
            <motion.h1 variants={headline} initial="hidden" animate="show" className="text-balance text-4xl font-extrabold leading-[1.4] text-navy-900 sm:text-5xl sm:leading-[1.35] lg:text-6xl lg:leading-[1.3]">
              {WORDS.map((w, i) => <motion.span key={i} variants={word} className="me-[0.28em] inline-block">{w}</motion.span>)}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6, ease: EASE }} className="mx-auto max-w-2xl text-lg leading-9 text-slate-700">
              سفارش تبلیغ را یک‌بار ثبت کنید. تبلیگرام پیج‌های مرتبط را پیشنهاد می‌دهد و انتشار هر پیج را تا ارائهٔ مدرک دنبال می‌کند.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease: EASE }} className="flex flex-wrap justify-center gap-3">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg" }), "shadow-lift")}>ثبت تبلیغ جدید</Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link href="/#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-white/80 backdrop-blur")}>نحوهٔ کار</Link>
              </motion.div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.85, duration: 0.8, ease: EASE }} className="mt-12">
            <HeroBannerCarousel />
          </motion.div>
          <PagesMarquee />
        </div>
      </MotionConfig>
    </section>
  );
}
