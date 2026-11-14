"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { StoryRing } from "@/components/ui/story-ring";
import { categoryIcon } from "@/lib/categories";
import type { CategoryId } from "@/types";
import { formatNumber } from "@/lib/utils";

interface MarqueePage {
  id: string;
  handle: string;
  category: string;
  followers: number;
  avatarUrl: string | null;
}

/**
 * نوار پیج‌های واقعی بازار. فقط پیج‌های تأییدشدهٔ API نمایش داده می‌شوند و
 * در صورت خالی بودن یا خطا هیچ دادهٔ نمونه‌ای جایگزین نمی‌شود.
 */
export function PagesMarquee() {
  const [pages, setPages] = useState<MarqueePage[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/market/pages", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!alive || !Array.isArray(data)) return;
        setPages(
          data.slice(0, 12).map((p: MarqueePage) => ({
            id: p.id,
            handle: p.handle,
            category: p.category,
            followers: p.followers,
            avatarUrl: p.avatarUrl,
          })),
        );
      })
      .catch(() => {
        if (alive) setPages([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (pages.length === 0) return null;
  const loop = pages.length > 3 ? [...pages, ...pages] : pages;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mt-10 space-y-3">
        <p className="text-center text-sm text-slate-500">پیج‌های فعال در تبلیگرام</p>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" aria-hidden>
          <motion.div
            className="flex w-max gap-3"
            animate={pages.length > 3 ? { x: ["0%", "50%"] } : undefined}
            transition={{ duration: 38, ease: "linear", repeat: Infinity }}
          >
            {loop.map((p, i) => {
              const Icon = categoryIcon(p.category as CategoryId);
              return (
                <span key={`${p.id}-${i}`} className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/80 py-1.5 pe-4 ps-1.5 shadow-soft backdrop-blur">
                  <StoryRing size={34}>
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded avatar served by our API
                      <img src={p.avatarUrl} alt="" className="size-full rounded-full object-cover" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </StoryRing>
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
