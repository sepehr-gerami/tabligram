"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Wallet } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/auth/auth-provider";
import { categoryLabel } from "@/lib/categories";
import { marketPrice, type MarketPage } from "@/lib/market";
import { formatNumber, formatToman } from "@/lib/utils";
import type { PublishType } from "@/types";

interface ApiCampaign {
  id: string;
  title: string;
  status: string;
  publishTypes: string;
  budget: number;
  pageCount: number;
  remainingBudget: number;
}

const TYPE_LABEL: Record<PublishType, string> = { story: "استوری", post: "پست", reels: "ریلز" };

export function OfferDialog({ page, onClose }: { page: MarketPage | null; onClose: () => void }) {
  const { user, openAuth } = useSession();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<ApiCampaign[] | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [publishType, setPublishType] = useState<PublishType | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!page || !user) return;
    let alive = true;
    setCampaigns(null);
    fetch("/api/campaigns", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiCampaign[]) => {
        if (!alive) return;
        const active = (Array.isArray(data) ? data : []).filter((c) => c.status === "APPROVED" || c.status === "RUNNING");
        setCampaigns(active);
        setCampaignId(active[0]?.id ?? "");
      })
      .catch(() => { if (alive) setCampaigns([]); });
    return () => { alive = false; };
  }, [page, user]);

  const campaign = useMemo(() => campaigns?.find((c) => c.id === campaignId) ?? null, [campaigns, campaignId]);
  const types = useMemo(() => {
    if (!page || !campaign) return [] as PublishType[];
    const declared = campaign.publishTypes.split(",").map((s) => s.trim());
    return page.publishTypes.filter((t) => declared.includes(t) && marketPrice(page, t) > 0);
  }, [page, campaign]);

  useEffect(() => {
    if (types.length > 0 && (publishType === "" || !types.includes(publishType))) setPublishType(types[0]);
    if (types.length === 0) setPublishType("");
  }, [types, publishType]);

  if (!page) return null;

  async function submit() {
    if (!campaign || !publishType || !page || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, pageId: page.id, publishType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "ارسال پیشنهاد ناموفق بود.");
        return;
      }
      toast({ tone: "success", title: "پیشنهاد ارسال شد", description: "مبلغ سفارش از موجودی شما بلوکه شد و در انتظار پاسخ صاحب پیج است." });
      onClose();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>ارسال پیشنهاد به این پیج</DialogTitle>
          <DialogDescription>
            <span dir="ltr" className="font-medium text-slate-700">{page.handle}</span> · {page.title} · {categoryLabel(page.category)}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4">
            <Alert tone="info">برای ارسال پیشنهاد و بلوکه‌شدن بودجه، ابتدا وارد حساب خود شوید یا ثبت‌نام کنید.</Alert>
            <div className="flex gap-2">
              <Button onClick={() => openAuth("login")}>ورود</Button>
              <Button variant="outline" onClick={() => openAuth("register")}>ثبت‌نام</Button>
            </div>
          </div>
        ) : campaigns === null ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> در حال دریافت کمپین‌های شما…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState icon={Send} title="کمپین فعالی ندارید" description="ابتدا یک کمپین بسازید و بودجه را از کیف پول تأیید کنید.">
            <Link href="/campaigns/new" className={buttonVariants({ size: "sm" })}>ساخت کمپین</Link>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="warning">{error}</Alert>}
            <Field id="offer-campaign" label="کمپین" required>
              <Select id="offer-campaign" value={campaignId} onValueChange={setCampaignId} placeholder="انتخاب کمپین">
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title} — {formatToman(c.remainingBudget)} باقی‌مانده</option>)}
              </Select>
            </Field>

            {campaign && (
              <div className="rounded-xl bg-mist p-3 text-sm leading-7 text-slate-600">
                بودجهٔ باقی‌مانده: <b className="text-navy-900">{formatToman(campaign.remainingBudget)}</b>
                <span className="mx-2 text-slate-300">|</span>
                حداکثر پیج: <b className="text-navy-900">{formatNumber(campaign.pageCount)}</b>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">نوع انتشار <span className="text-red-600">*</span></p>
              {types.length === 0 ? (
                <Alert tone="warning">این پیج برای هیچ‌کدام از نوع‌های انتشار انتخابی این کمپین تعرفه ندارد.</Alert>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  {types.map((t) => (
                    <button key={t} type="button" onClick={() => setPublishType(t)}
                      className={`rounded-xl border p-3 text-start transition-colors ${publishType === t ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="block text-sm font-bold text-navy-900">{TYPE_LABEL[t]}</span>
                      <span className="mt-1 block text-xs text-slate-500">{formatToman(marketPrice(page, t))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {page.verified && <Badge tone="success">پیج تأییدشده</Badge>}

            <Alert tone="info">
              با ارسال پیشنهاد، مبلغ از موجودی کیف پول شما بلوکه می‌شود. اگر صاحب پیج رد کند، خودکار به کیف پول برمی‌گردد.
            </Alert>

            <DialogFooter>
              <Link href="/wallet" className={buttonVariants({ variant: "outline" })}><Wallet className="size-4" /> کیف پول</Link>
              <Button onClick={() => void submit()} disabled={busy || !campaign || !publishType}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} ارسال پیشنهاد
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
