"use client";

import { BadgeCheck, Inbox, Layers, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ReadyGate } from "@/components/shared/ready-gate";
import { useStore } from "@/lib/store";
import { formatToman } from "@/lib/utils";

export function SummaryCards() {
  const { pages, offers } = useStore();
  const mine = pages.filter((p) => p.owned);
  const accepted = offers.filter((o) => o.status === "accepted");
  return (
    <ReadyGate rows={2}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Layers} label="پیج‌های ثبت‌شده" value={mine.length} hint={`${mine.filter((p) => p.approval === "approved").length} تأییدشده`} />
        <StatCard icon={Inbox} label="پیشنهادهای جدید" value={offers.filter((o) => o.status === "new").length} />
        <StatCard icon={BadgeCheck} label="پیشنهادهای پذیرفته‌شده" value={accepted.length} />
        <StatCard icon={Wallet} label="مجموع پیشنهادهای پذیرفته" value={formatToman(accepted.reduce((s, o) => s + o.amount, 0))} hint="عدد نمونه" />
      </div>
    </ReadyGate>
  );
}
