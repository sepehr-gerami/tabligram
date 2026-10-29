"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { CAMPAIGN_STATUS, categoryLabel, typeLabel } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { formatDate, formatToman } from "@/lib/utils";
import { Inbox } from "lucide-react";

export function RecentOrders() {
  const { campaigns } = useStore();
  const recent = [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return (
    <ReadyGate rows={2}>
      {recent.length === 0 ? <EmptyState icon={Inbox} title="سفارشی وجود ندارد" /> : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="truncate font-bold text-navy-900">{c.title}</p>
                  <p className="text-sm text-slate-500">{c.business} · {categoryLabel(c.category)} · {typeLabel(c.publishType)}</p>
                </div>
                <p className="text-sm text-slate-600">{formatToman(c.budget)}</p>
                <p className="text-sm text-slate-500">{formatDate(c.createdAt)}</p>
                <StatusBadge meta={CAMPAIGN_STATUS[c.status]} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </ReadyGate>
  );
}
