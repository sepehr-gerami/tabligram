"use client";

import { useState } from "react";
import { CalendarClock, Check, Eye, Inbox, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ReadyGate } from "@/components/shared/ready-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { OFFER_STATUS, typeLabel } from "@/lib/constants";
import { useStore } from "@/components/shared/store";
import { formatDate, formatToman } from "@/lib/utils";
import type { Offer } from "@/types";

export function OfferList() {
  const { offers, campaigns, setOfferStatus } = useStore();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = offers.find((o) => o.id === openId) ?? null;
  const campaign = open?.campaignId ? campaigns.find((c) => c.id === open.campaignId) : undefined;

  function decide(o: Offer, status: "accepted" | "rejected") {
    setOfferStatus(o.id, status);
    toast(status === "accepted"
      ? { tone: "success", title: "پیشنهاد پذیرفته شد", description: o.campaignTitle }
      : { tone: "info", title: "پیشنهاد رد شد", description: o.campaignTitle });
  }

  return (
    <ReadyGate>
      {offers.length === 0 ? (
        <EmptyState icon={Inbox} title="پیشنهادی ندارید" description="وقتی مدیر پیج شما را برای یک کمپین انتخاب کند، پیشنهاد اینجا نمایش داده می‌شود." />
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li key={o.id}>
              <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-bold text-navy-900">{o.campaignTitle}</p>
                  <p className="text-sm text-slate-500">{o.business} · {o.topic}</p>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-bold text-slate-800">{formatToman(o.amount)}</p>
                  <p className="flex items-center gap-1.5"><CalendarClock aria-hidden className="size-3.5" />مهلت: {formatDate(o.deadline)}</p>
                </div>
                <Badge tone="info">{typeLabel(o.publishType)}</Badge>
                <StatusBadge meta={OFFER_STATUS[o.status]} />
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => setOpenId(o.id)}><Eye />مشاهدهٔ جزئیات</Button>
                  {o.status === "new" && (
                    <>
                      <Button variant="success" size="sm" onClick={() => decide(o, "accepted")}><Check />پذیرش پیشنهاد</Button>
                      <Button variant="destructive" size="sm" onClick={() => decide(o, "rejected")}><X />رد پیشنهاد</Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent>
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.campaignTitle}</DialogTitle>
                <DialogDescription>پیشنهاد از طرف {open.business}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-slate-500">مبلغ پیشنهادی</dt><dd className="font-bold text-slate-800">{formatToman(open.amount)}</dd></div>
                <div><dt className="text-slate-500">نوع انتشار</dt><dd className="font-bold text-slate-800">{typeLabel(open.publishType)}</dd></div>
                <div><dt className="text-slate-500">موضوع</dt><dd className="font-bold text-slate-800">{open.topic}</dd></div>
                <div><dt className="text-slate-500">مهلت</dt><dd className="font-bold text-slate-800">{formatDate(open.deadline)}</dd></div>
                <div className="col-span-2"><dt className="text-slate-500">وضعیت</dt><dd className="mt-1"><StatusBadge meta={OFFER_STATUS[open.status]} /></dd></div>
                {campaign && <div className="col-span-2"><dt className="text-slate-500">توضیحات کمپین</dt><dd className="leading-7 text-slate-700">{campaign.description}</dd></div>}
              </dl>
              {open.status === "new" && (
                <DialogFooter>
                  <Button variant="destructive" onClick={() => { decide(open, "rejected"); setOpenId(null); }}><X />رد پیشنهاد</Button>
                  <Button variant="success" onClick={() => { decide(open, "accepted"); setOpenId(null); }}><Check />پذیرش پیشنهاد</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </ReadyGate>
  );
}
