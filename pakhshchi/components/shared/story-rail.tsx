"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { StoryRing } from "@/components/ui/story-ring";
import { categoryIcon } from "@/lib/categories";
import { activeStories } from "@/lib/pages";
import { pageTitle } from "@/components/shared/page-card";
import { StoryViewer } from "@/components/shared/story-viewer";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { InstaPage } from "@/types";

/**
 * Horizontal story rail. Real data: only active stories of approved pages.
 * Mobile: native horizontal swipe. Desktop: arrow buttons scrolling the rail.
 */
export function StoryRail({ title = "استوری پیج‌ها", className, pages: pagesProp }: {
  title?: string;
  className?: string;
  /** Optional page filter (e.g. only pages already chosen on the campaign page). */
  pages?: InstaPage[];
}) {
  const { stories, pages, ready } = useStore();
  const railRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const visiblePages = pagesProp ?? pages;
  const allowed = new Set(visiblePages.map((p) => p.id));
  const items = activeStories(stories, visiblePages).filter((s) => allowed.has(s.pageId))
    .map((story) => ({ story, page: visiblePages.find((p) => p.id === story.pageId)! }))
    .filter((it) => it.page);

  const scrollBy = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // RTL: scrolling left in the document order means negative offset for "next".
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 400), behavior: "smooth" });
  };

  if (!ready) {
    return <div className={cn("h-28 animate-pulse rounded-2xl bg-slate-100", className)} aria-hidden />;
  }

  return (
    <section aria-labelledby="story-rail-title" className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="story-rail-title" className="flex items-center gap-2 text-lg font-extrabold text-navy-900">
          <Sparkles aria-hidden className="size-4 text-brand-600" />{title}
        </h2>
        {items.length > 0 && (
          <div className="hidden gap-1.5 sm:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label="استوری‌های بعدی" className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label="استوری‌های قبلی" className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Sparkles} title="استوری فعالی وجود ندارد"
          description="صاحبان پیج می‌توانند از پنل خود استوری ثبت کنند؛ استوری‌ها ۲۴ ساعت پس از ثبت در این بخش نمایش داده می‌شوند." />
      ) : (
        <div ref={railRef} className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ story, page }, i) => {
            const Icon = categoryIcon(page.category);
            return (
              <button key={story.id} type="button" onClick={() => setOpen(i)} aria-label={`مشاهدهٔ استوری ${pageTitle(page)}`}
                className="group flex w-24 shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-colors hover:bg-white">
                {story.mediaUrl && story.mediaKind === "image" ? (
                  <span className="relative inline-grid size-16 place-items-center rounded-full p-[2.5px] [background:conic-gradient(from_90deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)]">
                    <span className="absolute inset-[2.5px] rounded-full bg-white" />
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                    <img src={story.mediaUrl} alt="" className="relative size-full rounded-full object-cover p-[2.5px]" />
                  </span>
                ) : (
                  <StoryRing size={64}>
                    <Icon aria-hidden className="size-6" />
                  </StoryRing>
                )}
                <span className="line-clamp-2 w-full text-[11px] leading-4 text-slate-600 group-hover:text-navy-900">{pageTitle(page)}</span>
              </button>
            );
          })}
        </div>
      )}

      <StoryViewer items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </section>
  );
}


