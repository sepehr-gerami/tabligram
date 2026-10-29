"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { StoryRing } from "@/components/ui/story-ring";
import { CATEGORIES, categoryLabel, typeLabel } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { initialState } from "@/lib/data";
import { cn, formatNumber, formatToman } from "@/lib/utils";
import type { CategoryId } from "@/types";

const SAMPLE = initialState.pages.filter((p) => !p.owned && p.approval === "approved");

export function SamplePages() {
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const list = cat === "all" ? SAMPLE : SAMPLE.filter((p) => p.category === cat);
  const chips: { value: CategoryId | "all"; label: string }[] = [{ value: "all", label: "همه" }, ...CATEGORIES];

  return (
    <section id="pages" className="scroll-mt-20 bg-mist">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-16">
        <SectionHeading title="نمونه‌ای از پیج‌های تبلیغاتی" description="این پیج‌ها، فالوئرها و تعرفه‌ها نمونه هستند و اطلاعات تأییدشدهٔ واقعی نیستند." />
        <div role="group" aria-label="فیلتر دسته‌بندی" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c.value} type="button" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}
              className="relative h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-brand-200 hover:text-brand-700 aria-pressed:border-transparent aria-pressed:text-white">
              {cat === c.value && <motion.span layoutId="chip-active" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState icon={SearchX} title="پیجی در این دسته نیست" description="دستهٔ دیگری را انتخاب کنید." />
        ) : (
          <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((p) => {
                const Icon = CATEGORY_ICONS[p.category];
                return (
                  <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                    <Card className="flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
                      <div className="flex items-center gap-3">
                        <StoryRing size={54}><Icon aria-hidden className="size-6" /></StoryRing>
                        <div className="min-w-0">
                          <p dir="ltr" className="truncate text-start font-bold text-navy-900">{p.handle}</p>
                          <p className="text-sm text-slate-500">{categoryLabel(p.category)} · {p.city}</p>
                        </div>
                        <Badge className="ms-auto">نمونه</Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-slate-500">فالوئر</dt><dd className="font-bold text-slate-800">{formatNumber(p.followers)}</dd></div>
                        <div><dt className="text-slate-500">تعرفه</dt><dd className="font-bold text-slate-800">{formatToman(p.price)}</dd></div>
                      </dl>
                      <div className="flex flex-wrap gap-1.5">{p.publishTypes.map((t) => <Badge key={t} tone="info">{typeLabel(t)}</Badge>)}</div>
                      <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "outline" }), "mt-auto")}>ثبت تبلیغ برای این دسته</Link>
                    </Card>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
