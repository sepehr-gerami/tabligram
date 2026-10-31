"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ownedPages } from "@/lib/pages";
import { useStore } from "@/lib/store";
import { formatNumber, formatToman } from "@/lib/utils";
import { BUNDLE_TIERS, bundleFor, bundlePrice, isSmallPage, pageCpm, SMALL_PAGE_THRESHOLD, suggestedPrice } from "@/lib/pricing";
import { PUBLISH_TYPES } from "@/lib/constants";
import { pageTitle } from "@/components/shared/page-card";

/**
 * Pricing advisor for publishers: CPM-based fair price per publish type and the
 * bundle discounts small pages get. Advice only — the owner still sets tariffs
 * in the page form.
 */
export function PricingAdvisor() {
  const { pages } = useStore();
  const mine = useMemo(() => ownedPages(pages).filter((p) => p.publishTypes.length > 0), [pages]);
  if (mine.length === 0) return null;

  return (
    <div className="space-y-3">
      {mine.map((p) => {
        const small = isSmallPage(p);
        return (
          <Card key={p.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-navy-900">{pageTitle(p)}</h4>
                <Badge tone={small ? "info" : "neutral"}>
                  {small ? `پیج کوچک (تا ${formatNumber(SMALL_PAGE_THRESHOLD)} فالوئر)` : "پیج متوسط/بزرگ"}
                </Badge>
              </div>
              <ul className="grid gap-2 sm:grid-cols-3">
                {PUBLISH_TYPES.filter((t) => p.publishTypes.includes(t.value)).map((t) => {
                  const unit = p.prices[t.value];
                  const suggestion = suggestedPrice(p, t.value);
                  const cpm = pageCpm(p, t.value, unit);
                  return (
                    <li key={t.value} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-800">{t.label}</p>
                      <p className="text-xs text-slate-500">تعرفهٔ شما: {unit > 0 ? formatToman(unit) : "ثبت نشده"}</p>
                      <p className="text-xs text-emerald-700">پیشنهاد بر پایهٔ CPM: {formatToman(suggestion)}</p>
                      {cpm !== null && <p className="text-xs text-slate-500">CPM فعلی: {formatNumber(cpm)} تومان</p>}
                    </li>
                  );
                })}
              </ul>
              {small && (
                <div className="rounded-xl bg-brand-50 p-3 text-sm">
                  <p className="font-medium text-brand-800">بسته‌های تخفیف‌دار پیج کوچک</p>
                  <ul className="mt-1 space-y-1 text-xs text-brand-900">
                    {BUNDLE_TIERS.filter((t) => t.discount > 0).map((t) => {
                      const unit = Math.max(...PUBLISH_TYPES.map((x) => p.prices[x.value]), 0) || 0;
                      if (unit <= 0) return null;
                      const total = bundlePrice(unit, t.count);
                      return (
                        <li key={t.count}>
                          {bundleFor(t.count).label}: {formatToman(total)} ({formatNumber(t.discount * 100)}٪ تخفیف نسبت به تک‌فروشی)
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
