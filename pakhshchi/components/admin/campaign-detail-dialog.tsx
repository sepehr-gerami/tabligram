"use client";

import { useState } from "react";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, describe } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { CAMPAIGN_STATUS, PUBLISH_STATUS, typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { useStore } from "@/lib/store";
import { formatDate, formatNumber, formatToman, isHttpUrl, ltr } from "@/lib/utils";
import { priceSummary } from "@/lib/pages";
import type { Assignment, CampaignStatus, InstaPage, PublishStatus } from "@/types";

export function CampaignDetailDialog({ campaignId, onClose }: { campaignId: string | null; onClose: () => void }) {
  const { campaigns, pages, setCampaignStatus, assignPage, unassignPage, updateAssignment } = useStore();
  const toast = useToast();
  const campaign = campaigns.find((c) => c.id === campaignId) ?? null;

  const assigned = new Set(campaign?.assignments.map((a) => a.pageId));
  const candidates = campaign
    ? pages
        .filter((p) => p.approval === "approved" && !assigned.has(p.id))
        .map((p) => ({ p, match: p.category === campaign.category && p.publishTypes.includes(campaign.publishType) }))
        .sort((a, b) => Number(b.match) - Number(a.match))
    : [];

  const facts = campaign && [
    ["کسب‌وکار", campaign.business], ["شمارهٔ سفارش", campaign.orderNumber], ["بودجه", formatToman(campaign.budget)],
    ["تعداد انتشار", formatNumber(campaign.count)], ["نوع انتشار", typeLabel(campaign.publishType)], ["دسته‌بندی", categoryLabel(campaign.category)],
    ["محدودهٔ جغرافیایی", campaign.region || "تعیین نشده"], ["تاریخ ثبت", formatDate(campaign.createdAt)], ["فایل تبلیغ", campaign.mediaName ?? "ندارد"],
  ];

  function changeStatus(s: CampaignStatus) {
    if (!campaign || campaign.status === s) return;
    setCampaignStatus(campaign.id, s);
    toast({ tone: "success", title: "وضعیت سفارش تغییر کرد", description: CAMPAIGN_STATUS[s].label });
  }

  function add(p: InstaPage) {
    if (!campaign) return;
    assignPage(campaign.id, p.id);
    toast({ tone: "success", title: "پیج به کمپین اضافه شد", description: p.owned ? `${ltr(p.handle)} · برای صاحب پیج پیشنهاد ساخته شد` : ltr(p.handle) });
  }

  return (
    <Dialog open={campaign !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {campaign && facts && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>{campaign.title}</DialogTitle>
              <DialogDescription>{campaign.description}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              {facts.map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-bold text-slate-800">{v}</dd></div>)}
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-slate-500">لینک</dt>
                <dd dir="ltr" className="truncate text-start font-medium text-brand-700">{campaign.link}</dd>
              </div>
              {campaign.notes && <div className="col-span-2 sm:col-span-3"><dt className="text-slate-500">توضیحات تکمیلی</dt><dd className="leading-7 text-slate-700">{campaign.notes}</dd></div>}
            </dl>

            <section aria-labelledby="status-title" className="space-y-2">
              <div className="flex items-center gap-2"><h3 id="status-title" className="font-bold text-navy-900">وضعیت سفارش</h3><StatusBadge meta={CAMPAIGN_STATUS[campaign.status]} /></div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map((s) => (
                  <Button key={s} size="sm" variant={campaign.status === s ? "default" : "outline"} aria-pressed={campaign.status === s} onClick={() => changeStatus(s)}>{CAMPAIGN_STATUS[s].label}</Button>
                ))}
              </div>
            </section>

            <section aria-labelledby="assigned-title" className="space-y-3">
              <h3 id="assigned-title" className="font-bold text-navy-900">پیج‌های انتخاب‌شده ({formatNumber(campaign.assignments.length)})</h3>
              {campaign.assignments.length === 0 ? (
                <p className="rounded-xl bg-mist p-4 text-sm text-slate-500">هنوز پیجی انتخاب نشده است. از فهرست پایین پیج اضافه کنید.</p>
              ) : (
                <ul className="space-y-3">
                  {campaign.assignments.map((a) => {
                    const page = pages.find((p) => p.id === a.pageId);
                    return page && (
                      <AssignmentRow key={a.pageId} a={a} page={page}
                        onStatus={(s) => { updateAssignment(campaign.id, a.pageId, { status: s }); toast({ tone: "success", title: "وضعیت انتشار تغییر کرد", description: `${ltr(page.handle)} · ${PUBLISH_STATUS[s].label}` }); }}
                        onProof={(url) => { updateAssignment(campaign.id, a.pageId, { proofUrl: url }); toast({ tone: "success", title: "لینک مدرک ثبت شد", description: ltr(page.handle) }); }}
                        onRemove={() => { unassignPage(campaign.id, a.pageId); toast({ tone: "info", title: "پیج از کمپین حذف شد", description: ltr(page.handle) }); }} />
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="add-title" className="space-y-3">
              <h3 id="add-title" className="font-bold text-navy-900">افزودن پیج مناسب</h3>
              {candidates.length === 0 ? (
                <p className="rounded-xl bg-mist p-4 text-sm text-slate-500">پیج تأییدشدهٔ دیگری برای افزودن وجود ندارد.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto pe-1">
                  {candidates.map(({ p, match }) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 p-3">
                      <div className="min-w-0 flex-1 basis-40">
                        <p dir="ltr" className="truncate text-start text-sm font-bold text-navy-900">{p.handle}</p>
                        <p className="text-xs text-slate-500">{categoryLabel(p.category)} · {p.city} · {formatNumber(p.followers)} فالوئر (ثبت‌شده توسط صاحب پیج)</p>
                      </div>
                      {match && <Badge tone="success">مرتبط</Badge>}
                      <span className="text-xs text-slate-600">{priceSummary(p)}</span>
                      <Button size="sm" variant="outline" onClick={() => add(p)}><Plus />افزودن</Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignmentRow({ a, page, onStatus, onProof, onRemove }: {
  a: Assignment; page: InstaPage; onStatus: (s: PublishStatus) => void; onProof: (url: string) => void; onRemove: () => void;
}) {
  const [proof, setProof] = useState(a.proofUrl);
  const [error, setError] = useState<string>();
  const id = `proof-${page.id}`;

  function save() {
    const url = proof.trim();
    if (url && !isHttpUrl(url)) { setError("لینک معتبر نیست. آدرس کامل را با https وارد کنید."); return; }
    setError(undefined);
    onProof(url);
  }

  return (
    <li className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <p dir="ltr" className="min-w-0 flex-1 truncate text-start font-bold text-navy-900">{page.handle}</p>
        <StatusBadge meta={PUBLISH_STATUS[a.status]} />
        <Button size="icon" variant="ghost" className="size-9 text-red-600" aria-label={`حذف ${page.handle} از کمپین`} onClick={onRemove}><Trash2 /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
        <Field id={`status-${page.id}`} label="وضعیت انتشار" required>
          <Select id={`status-${page.id}`} value={a.status} onChange={(e) => onStatus(e.target.value as PublishStatus)}>
            {(Object.keys(PUBLISH_STATUS) as PublishStatus[]).map((s) => <option key={s} value={s}>{PUBLISH_STATUS[s].label}</option>)}
          </Select>
        </Field>
        <Field id={id} label="لینک مدرک انتشار" required error={error}>
          <div className="flex gap-2">
            <Input {...describe(id, error)} dir="ltr" className="text-start" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://" value={proof} onChange={(e) => { setProof(e.target.value); setError(undefined); }} />
            <Button variant="outline" size="icon" className="size-12 shrink-0" aria-label="ثبت لینک مدرک" onClick={save}><Save /></Button>
          </div>
        </Field>
      </div>
      {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"><ExternalLink aria-hidden className="size-3.5" />مشاهدهٔ مدرک ثبت‌شده</a>}
    </li>
  );
}
