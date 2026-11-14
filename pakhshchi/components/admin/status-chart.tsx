"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadyGate } from "@/components/shared/ready-gate";
import { CAMPAIGN_STATUS } from "@/lib/constants";
import { useStore } from "@/components/shared/store";
import { formatNumber } from "@/lib/utils";
import type { CampaignStatus } from "@/types";

const R = 40;
const C = 2 * Math.PI * R;

export function StatusChart() {
  const { campaigns } = useStore();
  const keys = Object.keys(CAMPAIGN_STATUS) as CampaignStatus[];
  const counts = keys.map((k) => ({ key: k, n: campaigns.filter((c) => c.status === k).length }));
  const total = campaigns.length;
  const withPages = campaigns.filter((c) => c.assignments.length > 0);
  let offset = 0;

  return (
    <ReadyGate rows={1}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>وضعیت کمپین‌ها</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" role="img" aria-label={`نمودار وضعیت ${formatNumber(total)} کمپین`}>
              <circle cx="50" cy="50" r={R} fill="none" stroke="#eef2f7" strokeWidth="14" />
              {total > 0 && counts.filter((c) => c.n > 0).map((c) => {
                const len = (c.n / total) * C;
                const el = <motion.circle key={c.key} cx="50" cy="50" r={R} fill="none" stroke={CAMPAIGN_STATUS[c.key].color} strokeWidth="14"
                  strokeDashoffset={-offset} initial={false} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.4 }} />;
                offset += len;
                return el;
              })}
            </svg>
            <ul className="flex-1 space-y-2 text-sm">
              {counts.map((c) => (
                <li key={c.key} className="flex items-center gap-2">
                  <span aria-hidden className="size-3 rounded-full" style={{ background: CAMPAIGN_STATUS[c.key].color }} />
                  <span className="text-slate-600">{CAMPAIGN_STATUS[c.key].label}</span>
                  <span className="ms-auto font-bold text-slate-800">{formatNumber(c.n)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>پیشرفت انتشار در کمپین‌ها</CardTitle></CardHeader>
          <CardContent>
            {withPages.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">هنوز پیجی به کمپینی اضافه نشده است.</p>
            ) : (
              <ul className="space-y-4">
                {withPages.slice(0, 5).map((c) => {
                  const done = c.assignments.filter((a) => a.status === "published").length;
                  const pct = Math.round((done / c.assignments.length) * 100);
                  return (
                    <li key={c.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-slate-800">{c.title}</span>
                        <span className="shrink-0 text-slate-500">{formatNumber(done)} از {formatNumber(c.assignments.length)}</span>
                      </div>
                      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`پیشرفت ${c.title}`} className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div className="h-full rounded-full bg-brand-600" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ReadyGate>
  );
}
