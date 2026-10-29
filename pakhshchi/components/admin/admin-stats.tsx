"use client";

import { ClipboardCheck, Layers, Megaphone, PlayCircle } from "lucide-react";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatCard } from "@/components/shared/stat-card";
import { useStore } from "@/lib/store";

export function AdminStats() {
  const { campaigns, pages } = useStore();
  return (
    <ReadyGate rows={2}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Megaphone} label="کل کمپین‌ها" value={campaigns.length} />
        <StatCard icon={PlayCircle} label="سفارش‌های در حال اجرا" value={campaigns.filter((c) => c.status === "running").length} />
        <StatCard icon={Layers} label="پیج‌های ثبت‌شده" value={pages.length} hint={`${pages.filter((p) => p.approval === "pending").length} در انتظار تأیید`} />
        <StatCard icon={ClipboardCheck} label="سفارش‌های نیازمند بررسی" value={campaigns.filter((c) => c.status === "pending").length} />
      </div>
    </ReadyGate>
  );
}
