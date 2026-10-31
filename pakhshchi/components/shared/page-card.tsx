"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StoryRing } from "@/components/ui/story-ring";
import { categoryIcon, categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { minPagePrice } from "@/lib/pages";
import { cn, formatNumber, formatToman } from "@/lib/utils";
import type { InstaPage } from "@/types";

/** Shared avatar: the uploaded preview image when there is one, otherwise the category icon. */
export function PageAvatar({ page, size = 54 }: { page: InstaPage; size?: number }) {
  const Icon = categoryIcon(page.category);
  return (
    <StoryRing size={size}>
      {page.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL preview, not a Next-optimizable asset
        <img src={page.avatarUrl} alt="" className="size-full rounded-full object-cover" />
      ) : (
        <Icon aria-hidden className="size-6" />
      )}
    </StoryRing>
  );
}

export const pageTitle = (p: InstaPage) => p.title?.trim() || p.handle;

/** Shows whether the page stats are verified (ownership verified via Graph/bio) or self-reported. */
export function StatsSourceNote({ page, className }: { page?: InstaPage; className?: string }) {
  const verified = page ? (page.verification?.status === "verified" || page.statsSource === "verified") : false;
  if (verified) {
    return (
      <p className={cn("text-[11px] leading-5 font-medium text-emerald-700", className)}>
        آمار این پیج تأییدشده است (اتصال حساب اینستاگرام / کد بیو).
      </p>
    );
  }
  return (
    <p className={cn("text-[11px] leading-5 text-slate-500", className)}>
      آمار «ثبت‌شده توسط صاحب پیج» است و توسط اینستاگرام تأیید نشده.
    </p>
  );
}

export function PageCard({ page, onSelect, selected = false, actionLabel }: {
  page: InstaPage; onSelect?: () => void; selected?: boolean; actionLabel?: string;
}) {
  const cheapest = minPagePrice(page);

  return (
    <Card className={cn("flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-lift", selected && "ring-2 ring-brand-600")}>
      <div className="flex items-center gap-3">
        <PageAvatar page={page} />
        <div className="min-w-0">
          <p className="truncate font-bold text-navy-900">{pageTitle(page)}</p>
          <p dir="ltr" className="truncate text-start text-xs text-slate-500">{page.handle}</p>
          <p className="text-xs text-slate-500">{categoryLabel(page.category)}{page.city ? ` · ${page.city}` : ""}</p>
        </div>
        <div className="ms-auto flex flex-col items-end gap-1">
          <Badge tone="success">تأییدشده</Badge>
          {page.statsSource === "verified" && <Badge tone="info">آمار تأییدشده</Badge>}
        </div>
      </div>

      {page.bio && <p className="line-clamp-2 text-sm leading-6 text-slate-600">{page.bio}</p>}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">فالوئر</dt><dd className="font-bold text-slate-800">{formatNumber(page.followers)}</dd></div>
        {page.avgStoryViews > 0 && <div><dt className="text-slate-500">میانگین بازدید استوری</dt><dd className="font-bold text-slate-800">{formatNumber(page.avgStoryViews)}</dd></div>}
        {page.avgPostViews > 0 && <div><dt className="text-slate-500">میانگین بازدید پست/ریلز</dt><dd className="font-bold text-slate-800">{formatNumber(page.avgPostViews)}</dd></div>}
        {cheapest > 0 && <div><dt className="text-slate-500">شروع تعرفه</dt><dd className="font-bold text-slate-800">{formatToman(cheapest)}</dd></div>}
      </dl>

      <div className="flex flex-wrap gap-1.5">{page.publishTypes.map((t) => <Badge key={t} tone="info">{typeLabel(t)}</Badge>)}</div>

      <StatsSourceNote page={page} className="mt-auto" />

      {onSelect && (
        <button type="button" onClick={onSelect} aria-pressed={selected}
          className={cn("mt-1 flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-colors",
            selected ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700")}>
          {selected ? "انتخاب شد" : actionLabel ?? "مشاهده و انتخاب این پیج"}
        </button>
      )}
    </Card>
  );
}
