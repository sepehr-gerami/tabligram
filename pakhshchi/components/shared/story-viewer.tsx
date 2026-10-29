"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/utils";
import { PageAvatar, pageTitle } from "@/components/shared/page-card";
import type { InstaPage, Story } from "@/types";

interface ViewerItem { story: Story; page: InstaPage }

/**
 * Instagram-like viewer. Radix Dialog owns focus trap, Escape and focus restore.
 * Prev/next are buttons plus ArrowLeft/ArrowRight (RTL: left = next).
 */
export function StoryViewer({ items, index, onIndex, onClose }: {
  items: ViewerItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void;
}) {
  const [dir, setDir] = useState(0);
  const current = index !== null ? items[index] : undefined;

  const move = useCallback((delta: number) => {
    if (index === null) return;
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    setDir(delta);
    onIndex(next);
  }, [index, items.length, onIndex]);

  useEffect(() => { setDir(0); }, [index]);

  return (
    <Dialog open={current !== undefined} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm overflow-hidden bg-white p-0"
        aria-label="نمایشگر استوری"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") { e.preventDefault(); move(1); }
          if (e.key === "ArrowRight") { e.preventDefault(); move(-1); }
        }}
      >
        {current && (
          <div className="flex flex-col">
            {/* progress segments */}
            <div className="flex gap-1 px-3 pt-3" aria-hidden>
              {items.map((it, i) => (
                <span key={it.story.id} className={`h-1 flex-1 rounded-full ${i <= (index ?? 0) ? "bg-brand-600" : "bg-slate-200"}`} />
              ))}
            </div>

            <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
              <PageAvatar page={current.page} size={38} />
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm">{pageTitle(current.page)}</DialogTitle>
                <DialogDescription dir="ltr" className="truncate text-start text-xs">{current.page.handle}</DialogDescription>
              </div>
              <span className="ms-auto shrink-0 text-[11px] text-slate-500">{formatDate(current.story.createdAt)}</span>
            </div>

            <div className="mx-auto grid aspect-[9/16] w-full max-w-[20rem] place-items-center overflow-hidden bg-navy-900/95">
              {current.story.mediaUrl && current.story.mediaKind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={current.story.mediaUrl} alt={current.story.caption || "استوری"} className="size-full object-contain" />
              )}
              {current.story.mediaUrl && current.story.mediaKind === "video" && (
                <video src={current.story.mediaUrl} controls playsInline autoPlay muted className="size-full object-contain" aria-label="ویدئوی استوری" />
              )}
              {!current.story.mediaUrl && (
                <p className="px-6 text-center text-sm text-white/80">این استوری فقط متن دارد.</p>
              )}
            </div>

            <div className="space-y-1.5 px-4 py-3">
              {current.story.caption && <p className="text-sm leading-7 text-slate-800">{current.story.caption}</p>}
              <p className="text-xs text-slate-500">
                {categoryLabel(current.page.category)} · {pageTitle(current.page)} · <span className="text-slate-400">استوری نمونه</span>
              </p>
            </div>

            {dir !== 0 && index === items.length - 1 && dir > 0 && (
              <p className="px-4 pb-3 text-xs text-slate-500">به پایان استوری‌ها رسیدید.</p>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 p-3">
              <button type="button" onClick={() => move(-1)} disabled={(index ?? 0) <= 0} aria-label="استوری قبلی"
                className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight aria-hidden className="size-4" />قبلی
              </button>
              <p aria-live="polite" className="text-xs text-slate-500">{(index ?? 0) + 1} از {items.length}</p>
              <button type="button" onClick={() => move(1)} disabled={(index ?? 0) >= items.length - 1} aria-label="استوری بعدی"
                className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                بعدی<ChevronLeft aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
