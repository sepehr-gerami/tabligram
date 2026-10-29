"use client";

import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { APPROVAL_STATUS, categoryLabel, typeLabel } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { useStore } from "@/lib/store";
import { formatNumber, formatToman } from "@/lib/utils";

export function PageList() {
  const { pages } = useStore();
  const mine = pages.filter((p) => p.owned);
  return (
    <ReadyGate rows={2}>
      {mine.length === 0 ? (
        <EmptyState icon={Layers} title="هنوز پیجی ثبت نکرده‌اید" description="با فرم بالا پیج خود را ثبت کنید تا بعد از تأیید مدیر پیشنهاد تبلیغ دریافت کند." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {mine.map((p) => {
            const Icon = CATEGORY_ICONS[p.category];
            return (
              <li key={p.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon aria-hidden className="size-5" /></span>
                    <div className="min-w-0">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="block truncate text-start font-bold text-navy-900 hover:text-brand-700">{p.handle}</a>
                      <p className="text-sm text-slate-500">{categoryLabel(p.category)} · {p.city}</p>
                    </div>
                    <span className="ms-auto"><StatusBadge meta={APPROVAL_STATUS[p.approval]} /></span>
                  </div>
                  <p className="text-sm text-slate-600">{formatNumber(p.followers)} فالوئر (نمونه) · {formatToman(p.price)} برای هر انتشار</p>
                  <div className="flex flex-wrap gap-1.5">{p.publishTypes.map((t) => <Badge key={t} tone="info">{typeLabel(t)}</Badge>)}</div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </ReadyGate>
  );
}
