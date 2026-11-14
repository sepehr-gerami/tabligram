"use client";

import Link from "next/link";
import { Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { pagePrice } from "@/lib/pages";
import { cn, formatNumber, formatToman } from "@/lib/utils";
import { PageAvatar, pageTitle, StatsSourceNote } from "@/components/shared/page-card";
import type { InstaPage, PublishType } from "@/types";

/**
 * One details view for every place a page is inspected (home, campaign page).
 * Only approved pages are ever passed in — the callers filter with `isPublicPage`.
 */
export function PageDetailDialog({ page, onClose, onSelect }: {
  page: InstaPage | null;
  onClose: () => void;
  /** When given, the dialog offers picking the page (and a publish type). */
  onSelect?: (page: InstaPage, type: PublishType) => void;
}) {
  return (
    <Dialog open={page !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        {page && (
          <>
            <DialogHeader>
              <div className="mb-3 flex items-center gap-3">
                <PageAvatar page={page} size={60} />
                <div className="min-w-0">
                  <DialogTitle className="truncate">{pageTitle(page)}</DialogTitle>
                  <DialogDescription dir="ltr" className="truncate text-start">{page.handle}</DialogDescription>
                </div>
                {page.approval === "approved" && <Badge tone="success" className="ms-auto">تأیید مدیر</Badge>}
              </div>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{categoryLabel(page.category)}</Badge>
              {page.city && <Badge tone="neutral">{page.city}</Badge>}
              {page.publishTypes.map((t) => <Badge key={t} tone="info">{typeLabel(t)}</Badge>)}
            </div>

            {page.bio && <p className="mt-4 leading-7 text-slate-700">{page.bio}</p>}

            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-mist p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">فالوئر</dt><dd className="font-bold text-slate-800">{formatNumber(page.followers)}</dd></div>
              <div><dt className="text-slate-500">میانگین بازدید استوری</dt><dd className="font-bold text-slate-800">{formatNumber(page.avgStoryViews)}</dd></div>
              <div><dt className="text-slate-500">میانگین بازدید پست/ریلز</dt><dd className="font-bold text-slate-800">{formatNumber(page.avgPostViews)}</dd></div>
            </dl>
            <StatsSourceNote className="mt-2" />

            {!onSelect && (
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/campaigns/new?page=${encodeURIComponent(page.id)}`}
                  className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
                >
                  <Send className="-scale-x-100" />
                  ثبت تبلیغ برای این پیج
                </Link>
                <p className="text-xs leading-5 text-slate-500">
                  با ثبت سفارش، درخواست تبلیغ شما برای بررسی به مدیر ارسال می‌شود.
                </p>
              </div>
            )}

            {onSelect && (
              <section aria-labelledby="pick-title" className="mt-5 space-y-2">
                <h3 id="pick-title" className="text-sm font-bold text-navy-900">انتخاب نوع تبلیغ</h3>
                <div className="space-y-2">
                  {page.publishTypes.map((t) => (
                    <div key={t} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{typeLabel(t)}</p>
                        <p className="text-xs text-slate-500">{formatToman(pagePrice(page, t))} برای هر انتشار</p>
                      </div>
                      <Button size="sm" onClick={() => onSelect(page, t)}><Check />انتخاب {typeLabel(t)}</Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}