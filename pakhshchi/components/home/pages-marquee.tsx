"use client";

import { MotionConfig, motion } from "framer-motion";
import { StoryRing } from "@/components/ui/story-ring";
import { categoryIcon } from "@/lib/categories";
import { initialState } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const PAGES = initialState.pages.filter((p) => !p.owned && p.approval === "approved");

export function PagesMarquee() {
  const loop = [...PAGES, ...PAGES];
  return (
    <MotionConfig reducedMotion="user">
      <div className="mt-10 space-y-3">
        <p className="text-center text-sm text-slate-500">پیج‌های نمونه در پخش‌چی</p>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" aria-hidden>
          <motion.div className="flex w-max gap-3" animate={{ x: ["0%", "50%"] }} transition={{ duration: 38, ease: "linear", repeat: Infinity }}>
            {loop.map((p, i) => {
              const Icon = categoryIcon(p.category);
              return (
                <span key={i} className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/80 py-1.5 pe-4 ps-1.5 shadow-soft backdrop-blur">
                  <StoryRing size={34}><Icon className="size-4" /></StoryRing>
                  <span dir="ltr" className="text-sm font-medium text-slate-800">{p.handle}</span>
                  <span className="text-xs text-slate-500">{formatNumber(p.followers)}</span>
                </span>
              );
            })}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
