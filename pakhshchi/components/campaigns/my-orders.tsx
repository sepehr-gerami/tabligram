"use client";

import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/shared/status-badge";
import { CAMPAIGN_STATUS, typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { useStore } from "@/lib/store";
import { formatDate, formatNumber, formatToman } from "@/lib/utils";

export function MyOrders() {
  const { campaigns, ready } = useStore();
  const mine = campaigns.filter((c) => c.mine);
  return (
    <section id="my-orders" className="scroll-mt-24 space-y-4" aria-labelledby="my-orders-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="my-orders-title" className="text-xl font-extrabold text-navy-900">سفارش‌های ثبت‌شدهٔ شما</h2>
          <p className="text-sm text-slate-500">این سفارش‌ها فقط در همین مرورگر ذخیره می‌شوند.</p>
        </div>
      </div>
      {!ready ? (
        <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : mine.length === 0 ? (
        <EmptyState icon={ClipboardList} title="هنوز سفارشی ثبت نکرده‌اید" description="بعد از ثبت اولین تبلیغ، سفارش و وضعیت آن همین‌جا نمایش داده می‌شود." />
      ) : (
        <ul className="space-y-3">
          {mine.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy-900">{c.title}</p>
                  <p className="text-sm text-slate-500">{c.business} · {categoryLabel(c.category)} · {typeLabel(c.publishType)} · {formatDate(c.createdAt)}</p>
                </div>
                <p className="text-sm text-slate-600">{formatToman(c.budget)} · {formatNumber(c.count)} انتشار</p>
                <p dir="ltr" className="text-sm font-medium text-slate-500">{c.orderNumber}</p>
                <StatusBadge meta={CAMPAIGN_STATUS[c.status]} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
