"use client";

import { useState } from "react";
import { AlertTriangle, Layers, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageAvatar, pageTitle, StatsSourceNote } from "@/components/shared/page-card";
import { APPROVAL_STATUS, typeLabel } from "@/lib/constants";
import { categoryLabel } from "@/lib/categories";
import { ownedPages } from "@/lib/pages";
import { useStore } from "@/lib/store";
import { formatNumber, formatToman } from "@/lib/utils";
import type { InstaPage } from "@/types";
import { PageEditDialog } from "@/components/publisher/page-edit-dialog";

export function PageList() {
  const { pages, removePage, stories } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<InstaPage | null>(null);
  const [deleting, setDeleting] = useState<InstaPage | null>(null);
  const mine = ownedPages(pages);

  return (
    <ReadyGate rows={2}>
      {mine.length === 0 ? (
        <EmptyState icon={Layers} title="هنوز پیجی ثبت نکرده‌اید" description="با فرم بالا پیج خود را ثبت کنید تا بعد از تأیید مدیر پیشنهاد تبلیغ دریافت کند." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {mine.map((p) => {
            const storyCount = stories.filter((s) => s.pageId === p.id && !s.disabled).length;
            return (
              <li key={p.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <PageAvatar page={p} size={48} />
                    <div className="min-w-0">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="block truncate font-bold text-navy-900 hover:text-brand-700">{pageTitle(p)}</a>
                      <p dir="ltr" className="truncate text-start text-xs text-slate-500">{p.handle}</p>
                      <p className="text-xs text-slate-500">{categoryLabel(p.category)}{p.city ? ` · ${p.city}` : ""}</p>
                    </div>
                    <span className="ms-auto"><StatusBadge meta={APPROVAL_STATUS[p.approval]} /></span>
                  </div>

                  {p.bio && <p className="line-clamp-2 text-sm leading-6 text-slate-600">{p.bio}</p>}

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">فالوئر</dt><dd className="font-bold text-slate-800">{formatNumber(p.followers)}</dd></div>
                    <div><dt className="text-xs text-slate-500">بازدید استوری</dt><dd className="font-bold text-slate-800">{formatNumber(p.avgStoryViews)}</dd></div>
                    <div><dt className="text-xs text-slate-500">بازدید پست/ریلز</dt><dd className="font-bold text-slate-800">{formatNumber(p.avgPostViews)}</dd></div>
                    <div><dt className="text-xs text-slate-500">استوری فعال</dt><dd className="font-bold text-slate-800">{formatNumber(storyCount)}</dd></div>
                  </dl>

                  <div className="flex flex-wrap gap-1.5">
                    {p.publishTypes.map((t) => (
                      <Badge key={t} tone="info">{typeLabel(t)} · {formatToman(p.prices[t])}</Badge>
                    ))}
                  </div>

                  {p.approval === "rejected" && (
                    <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                      دلیل رد: {p.rejectReason || "ذکر نشده"} — پس از اصلاح، تغییرات را ذخیره کنید تا دوباره بررسی شود.
                    </p>
                  )}

                  <StatsSourceNote />

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil />ویرایش اطلاعات</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleting(p)}><Trash2 />حذف پیج</Button>

                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <PageEditDialog page={editing} onClose={() => setEditing(null)} />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف پیج</DialogTitle>
            <DialogDescription>
              با حذف {deleting ? pageTitle(deleting) : "این پیج"}، استوری‌ها و پیشنهادهای مرتبط آن هم از این مرورگر حذف می‌شوند و یک جای ظرفیت ثبت پیج آزاد می‌شود. این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>انصراف</Button>
            <Button variant="destructive" onClick={() => {
              if (!deleting) return;
              removePage(deleting.id);
              toast({ tone: "info", title: "پیج حذف شد", description: pageTitle(deleting) });
              setDeleting(null);
            }}><Trash2 />حذف پیج</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReadyGate>
  );
}
