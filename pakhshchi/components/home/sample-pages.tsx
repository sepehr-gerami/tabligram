"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, SectionHeading, Skeleton } from "@/components/ui/misc";
import { CATEGORIES } from "@/lib/categories";
import { advertiserPages } from "@/lib/pages";
import { PageCard } from "@/components/shared/page-card";
import { PageDetailDialog } from "@/components/shared/page-detail-dialog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CategoryId, InstaPage } from "@/types";

/**
 * Public page directory. Reads from the Store, so a page approved by the admin
 * (and stories/stats edited by its owner) shows up here without a rebuild.
 */
export function SamplePages() {
  const { pages, ready } = useStore();
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [open, setOpen] = useState<InstaPage | null>(null);

  const all = advertiserPages(pages);
  const list = cat === "all" ? all : all.filter((p) => p.category === cat);
  const chips: { value: CategoryId | "all"; label: string }[] = [{ value: "all", label: "همه" }, ...CATEGORIES];

  return (
    <section id="pages" className="scroll-mt-20 bg-mist">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-16">
        <SectionHeading title="پیج‌های تبلیغاتی" description="فقط پیج‌های تأییدشده نمایش داده می‌شوند. آمار هر پیج را صاحب آن وارد کرده و توسط اینستاگرام تأیید نشده است." />

        <div role="group" aria-label="فیلتر دسته‌بندی" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c.value} type="button" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}
              className="relative h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-brand-200 hover:text-brand-700 aria-pressed:border-transparent aria-pressed:text-white">
              {cat === c.value && <motion.span layoutId="chip-active" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>

        <p aria-live="polite" className="text-sm text-slate-500">
          {ready ? `${list.length} پیج در این دسته` : "در حال بارگذاری…"}
        </p>

        {!ready ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={SearchX} title="پیجی در این دسته نیست" description="دستهٔ دیگری را انتخاب کنید یا سراغ دستهٔ «همه» بروید.">
            <button type="button" onClick={() => setCat("all")} className={cn(buttonVariants({ variant: "outline" }))}>نمایش همهٔ پیج‌ها</button>
          </EmptyState>
        ) : (
          <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((p) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
                  <PageCard page={p} onSelect={() => setOpen(p)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <div className="flex justify-center">
          <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "navy", size: "lg" }))}>ثبت تبلیغ با انتخاب پیج</Link>
        </div>
      </div>

      <PageDetailDialog page={open} onClose={() => setOpen(null)} />
    </section>
  );
}
