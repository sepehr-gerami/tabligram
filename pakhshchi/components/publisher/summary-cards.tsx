"use client";

import { BadgeCheck, Clock, Inbox, Layers, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ReadyGate } from "@/components/shared/ready-gate";
import { MAX_PAGES_PER_OWNER } from "@/lib/constants";
import { ownedPages } from "@/lib/pages";
import { useStore } from "@/lib/store";
import { formatNumber, formatToman } from "@/lib/utils";

export function SummaryCards() {
  const { pages, offers } = useStore();
  const mine = ownedPages(pages);
  const myIds = new Set(mine.map((p) => p.id));
  const myOffers = offers.filter((o) => o.pageId && myIds.has(o.pageId));
  const accepted = myOffers.filter((o) => o.status === "accepted");

  return (
    <ReadyGate rows={2}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Layers} label="پیج‌های ثبت‌شده" value={`${formatNumber(mine.length)} از ${formatNumber(MAX_PAGES_PER_OWNER)}`}
          hint={`${formatNumber(Math.max(0, MAX_PAGES_PER_OWNER - mine.length))} ظرفیت باقی مانده`} />
        <StatCard icon={BadgeCheck} label="پیج‌های تأییدشده" value={mine.filter((p) => p.approval === "approved").length}
          hint={`${formatNumber(mine.filter((p) => p.approval !== "approved").length)} در انتظار یا ردشده`} />
        <StatCard icon={Clock} label="پیج‌های در انتظار تأیید" value={mine.filter((p) => p.approval === "pending").length} />
        <StatCard icon={Inbox} label="پیشنهادهای دریافتی" value={myOffers.length}
          hint={`${formatNumber(myOffers.filter((o) => o.status === "new").length)} جدید`} />
        <StatCard icon={BadgeCheck} label="پیشنهادهای پذیرفته‌شده" value={accepted.length} />
        <StatCard icon={Wallet} label="مجموع پیشنهادهای پذیرفته" value={formatToman(accepted.reduce((s, o) => s + o.amount, 0))} hint="مبلغ پیشنهادی، نه پرداخت‌شده" />
      </div>

      <section aria-labelledby="stats-summary-title" className="mt-6">
        <h3 id="stats-summary-title" className="mb-3 text-base font-bold text-navy-900">خلاصهٔ آمار پیج‌ها</h3>
        {mine.length === 0 ? (
          <p className="rounded-xl bg-mist p-4 text-sm text-slate-500">هنوز پیجی ثبت نکرده‌اید.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <span className="font-bold text-navy-900">{p.title || p.handle}</span>
                <span className="text-slate-500">{formatNumber(p.followers)} فالوئر</span>
                <span className="text-slate-500">بازدید استوری {formatNumber(p.avgStoryViews)}</span>
                <span className="text-slate-500">بازدید پست {formatNumber(p.avgPostViews)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">این اعداد توسط صاحب پیج وارد شده‌اند و تأیید اینستاگرام نیستند؛ پیشنهادها و مبالغ هم نمونه‌اند.</p>
      </section>
    </ReadyGate>
  );
}
