"use client";

import { useState } from "react";
import { Check, Layers, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { APPROVAL_STATUS, typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { useStore } from "@/components/shared/store";
import { formatNumber, ltr } from "@/lib/utils";
import { priceSummary } from "@/lib/pages";
import type { ApprovalStatus, InstaPage } from "@/types";

export function PagesTable() {
  const { pages, setApproval } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const list = pages.filter((p) => filter === "all" || p.approval === filter);

  function decide(p: InstaPage, a: ApprovalStatus) {
    setApproval(p.id, a);
    toast({ tone: a === "approved" ? "success" : "info", title: a === "approved" ? "پیج تأیید شد" : "پیج رد شد", description: ltr(p.handle) });
  }

  return (
    <ReadyGate>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="page-filter" className="text-sm text-slate-600">وضعیت تأیید</label>
        <div className="w-48">
          <Select
            name="category"
            defaultValue=""
            placeholder="دسته‌بندی را انتخاب کنید"
            onValueChange={(value) => console.log(value)}
          >
            <option value="">انتخاب دسته‌بندی</option>
            <option value="design">طراحی</option>
            <option value="programming">برنامه‌نویسی</option>
            <option value="marketing">بازاریابی</option>
          </Select>
        </div>
        <p aria-live="polite" className="text-sm text-slate-500">{formatNumber(list.length)} پیج</p>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Layers} title="پیجی با این وضعیت نیست" description="فیلتر را تغییر دهید." />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                <div className="min-w-0 flex-1 basis-52">
                  <p dir="ltr" className="truncate text-start font-bold text-navy-900">{p.handle}</p>
                  <p className="text-sm text-slate-500">{categoryLabel(p.category)} · {p.city}{p.owned && " · ثبت‌شده در پنل صاحب پیج"}</p>
                </div>
                <p className="text-sm text-slate-600">{formatNumber(p.followers)} فالوئر · {priceSummary(p)}</p>
                <div className="flex gap-1.5">{p.publishTypes.map((t) => <Badge key={t} tone="info">{typeLabel(t)}</Badge>)}</div>
                <StatusBadge meta={APPROVAL_STATUS[p.approval]} />
                <div className="flex gap-2">
                  <Button size="sm" variant="success" disabled={p.approval === "approved"} onClick={() => decide(p, "approved")}><Check />تأیید</Button>
                  <Button size="sm" variant="destructive" disabled={p.approval === "rejected"} onClick={() => decide(p, "rejected")}><X />رد</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ReadyGate>
  );
}
