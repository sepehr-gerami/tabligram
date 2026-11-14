"use client";

import { useState } from "react";
import { Eye, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { CampaignDetailDialog } from "@/components/admin/campaign-detail-dialog";
import { CAMPAIGN_STATUS, typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { useStore } from "@/components/shared/store";
import { formatNumber, formatToman, toLatinDigits } from "@/lib/utils";
import type { CampaignStatus } from "@/types";

export function CampaignTable() {
  const { campaigns } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = toLatinDigits(query.trim()).toLowerCase();
  const list = campaigns.filter((c) =>
    (status === "all" || c.status === status) &&
    (!q || [c.title, c.business, c.orderNumber].some((s) => s.toLowerCase().includes(q))));

  return (
    <ReadyGate>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="relative">
          <label htmlFor="campaign-search" className="sr-only">جست‌وجوی کمپین</label>
          <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input id="campaign-search" type="search" className="ps-10" placeholder="جست‌وجو در عنوان، کسب‌وکار یا شمارهٔ سفارش" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label htmlFor="campaign-status" className="sr-only">فیلتر وضعیت</label>
          <Select id="campaign-status" value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus | "all")}>
            <option value="all">همهٔ وضعیت‌ها</option>
            {(Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map((k) => <option key={k} value={k}>{CAMPAIGN_STATUS[k].label}</option>)}
          </Select>
        </div>
      </div>
      <p aria-live="polite" className="text-sm text-slate-500">{formatNumber(list.length)} کمپین</p>

      {list.length === 0 ? (
        <EmptyState icon={SearchX} title="کمپینی پیدا نشد" description="عبارت جست‌وجو یا فیلتر وضعیت را تغییر دهید.">
          <Button variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>پاک‌کردن فیلترها</Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => {
            const done = c.assignments.filter((a) => a.status === "published").length;
            return (
              <li key={c.id}>
                <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-bold text-navy-900">{c.title}</p>
                    <p className="text-sm text-slate-500">{c.business} · {categoryLabel(c.category)} · {typeLabel(c.publishType)}</p>
                  </div>
                  <p dir="ltr" className="text-sm font-medium text-slate-500">{c.orderNumber}</p>
                  <p className="text-sm text-slate-600">{formatToman(c.budget)}</p>
                  <p className="text-sm text-slate-600">{c.assignments.length ? `${formatNumber(done)} از ${formatNumber(c.assignments.length)} منتشر شد` : "پیجی انتخاب نشده"}</p>
                  <StatusBadge meta={CAMPAIGN_STATUS[c.status]} />
                  <Button variant="outline" size="sm" onClick={() => setOpenId(c.id)}><Eye />مشاهدهٔ جزئیات</Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <CampaignDetailDialog campaignId={openId} onClose={() => setOpenId(null)} />
    </ReadyGate>
  );
}
