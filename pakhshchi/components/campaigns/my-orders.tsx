"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, RefreshCw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { useSession } from "@/components/auth/auth-provider";
import { campaignStatusMeta, holdStatusMeta, orderStatusMeta } from "@/lib/api-status";
import { typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { cn, formatDate, formatNumber, formatToman } from "@/lib/utils";
import type { CategoryId, PublishType } from "@/types";

interface ApiOrder {
  id: string;
  status: string;
  amount: number;
  publishType: string;
  createdAt: string;
  page: { id: string; title: string; handle: string; category: string };
  hold: { status: string; amount: number; commission: number; publisherAmount: number } | null;
}

interface ApiCampaign {
  id: string;
  orderNumber: string;
  title: string;
  business: string;
  category: string;
  budget: number;
  pageCount: number;
  status: string;
  createdAt: string;
  blocked: number;
  remainingBudget: number;
  orders: ApiOrder[];
}

export function MyOrders() {
  const { user } = useSession();
  const [campaigns, setCampaigns] = useState<ApiCampaign[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data && typeof data.error === "string" ? data.error : "دریافت سفارش‌ها ناموفق بود.");
      setCampaigns(Array.isArray(data) ? (data as ApiCampaign[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت سفارش‌ها ناموفق بود.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section id="my-orders" className="scroll-mt-24 space-y-4" aria-labelledby="my-orders-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="my-orders-title" className="text-xl font-extrabold text-navy-900">کمپین‌ها و سفارش‌های شما</h2>
          <p className="text-sm text-slate-500">وضعیت هر درخواست، مبلغ بلوکه‌شده و پیگیری سفارش را اینجا ببینید.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/wallet" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
            <Wallet className="size-4" /> کیف پول
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading || !user} className="gap-1.5">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} به‌روزرسانی
          </Button>
        </div>
      </div>

      {error && <Alert tone="warning">{error}</Alert>}

      {!user ? (
        <EmptyState icon={ClipboardList} title="برای دیدن سفارش‌ها وارد شوید" description="پس از ورود، کمپین‌ها و وضعیت درخواست‌های شما همین‌جا نمایش داده می‌شود." />
      ) : campaigns === null ? (
        <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={ClipboardList} title="هنوز کمپینی ثبت نکرده‌اید" description="بعد از ثبت اولین تبلیغ، سفارش‌ها و وضعیت آن‌ها همین‌جا نمایش داده می‌شود." />
      ) : (
        <ul className="space-y-4">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-bold text-navy-900">{c.title}</p>
                    <p className="text-sm text-slate-500">
                      {c.business} · {categoryLabel(c.category as CategoryId)}{" "}
                      <span dir="ltr" className="mx-1 inline-block text-xs text-slate-400">{c.orderNumber}</span>
                      · {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>بودجه: <b className="text-navy-900">{formatToman(c.budget)}</b></p>
                    <p className="text-xs text-slate-500">
                      بلوکه: {formatToman(c.blocked)} · باقی‌مانده: {formatToman(c.remainingBudget)} · حداکثر {formatNumber(c.pageCount)} پیج
                    </p>
                  </div>
                  <Badge tone={campaignStatusMeta(c.status).tone}>{campaignStatusMeta(c.status).label}</Badge>
                </div>

                {c.orders.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">
                    هنوز درخواستی برای این کمپین ارسال نشده است. از بازار پیج‌ها پیشنهاد بفرستید.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {c.orders.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4">
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate text-sm font-bold text-navy-900">{o.page.title}</p>
                          <p dir="ltr" className="truncate text-start text-xs text-slate-500">{o.page.handle}</p>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>{formatToman(o.amount)} · {typeLabel(o.publishType as PublishType)}</p>
                          {o.hold && (
                            <p className="text-xs text-slate-500">
                              کمیسیون: {formatToman(o.hold.commission)} · سهم پیج: {formatToman(o.hold.publisherAmount)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={orderStatusMeta(o.status).tone}>{orderStatusMeta(o.status).label}</Badge>
                          {o.hold && <Badge tone={holdStatusMeta(o.hold.status).tone}>{holdStatusMeta(o.hold.status).label}</Badge>}
                        </div>
                        <Link href={`/orders/${o.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                          جزئیات و اقدام
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
