"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ExternalLink, FileImage,
  Link2, Loader2, ShieldAlert, Upload, Wallet, XCircle,
} from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { closedReasonLabel, holdStatusMeta, orderStatusMeta } from "@/lib/api-status";
import { categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { cn, formatDate, formatNumber, formatToman } from "@/lib/utils";
import type { PublishType } from "@/types";

interface Proof {
  kind: string;
  proofUrl: string;
  caption: string | null;
  createdAt?: string;
}

interface OrderDetail {
  id: string;
  viewer: "ADVERTISER" | "OWNER" | "ADMIN";
  status: string;
  amount: number;
  commission: number;
  publisherAmount: number;
  publishType: string;
  createdAt: string;
  respondByAt: string | null;
  publishDeadlineAt: string | null;
  proofSubmittedAt: string | null;
  advertiserConfirmedAt: string | null;
  closedReason: string | null;
  revealed: boolean;
  orderNumber: string;
  campaign: { id: string; title: string; description: string; business: string | null; link: string | null; mediaUrl: string | null };
  page: { id: string; title: string; handle: string; category: string; avatarUrl: string | null };
  hold: { status: string; amount: number; commission: number; publisherAmount: number; payoutDueAt: string | null } | null;
  proofs: Proof[];
  pageStats?: { followers: number; avgStoryViews: number; avgPostViews: number; avgReelsViews: number };
}

const fmt = (d: string | null | undefined) => (d ? formatDate(d) : "—");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-navy-900">{children}</span>
    </div>
  );
}

export function OrderDetailPanel({ orderId }: { orderId: string }) {
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [postLink, setPostLink] = useState("");
  const [statsImage, setStatsImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "دریافت سفارش ناموفق بود.");
      setOrder(data as OrderDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت سفارش ناموفق بود.");
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "accept" | "decline" | "cancel" | "confirm") {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const url = action === "accept" || action === "decline" ? `/api/orders/${orderId}/respond` : `/api/orders/${orderId}/${action}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "accept" || action === "decline" ? JSON.stringify({ action }) : "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "عملیات ناموفق بود.");
      toast({ tone: "success", title: "انجام شد", description: typeof data.message === "string" ? data.message : "وضعیت سفارش به‌روزرسانی شد." });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "عملیات ناموفق بود.";
      setError(message);
      toast({ tone: "error", title: "عملیات ناموفق", description: message });
    } finally {
      setBusy("");
    }
  }

  async function uploadStats(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFormError("فقط تصویر PNG، JPEG یا WebP مجاز است.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFormError("حجم تصویر باید حداکثر ۳ مگابایت باشد.");
      return;
    }
    setFormError("");
    setUploading(true);
    try {
      const res = await fetch("/api/uploads?kind=proof", { method: "POST", body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") throw new Error(typeof data.error === "string" ? data.error : "آپلود تصویر ناموفق بود.");
      setStatsImage(data.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function submitProof() {
    if (busy) return;
    setFormError("");
    if (!postLink.trim() || !/^https?:\/\//i.test(postLink.trim())) {
      setFormError("لینک پست منتشرشده را کامل و با https وارد کنید.");
      return;
    }
    if (!statsImage) {
      setFormError("اسکرین‌شات آمار انتشار را آپلود کنید.");
      return;
    }
    setBusy("proof");
    try {
      const res = await fetch(`/api/orders/${orderId}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postLink: postLink.trim(), statsImage, caption: caption.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "ثبت مدرک ناموفق بود.");
      toast({ tone: "success", title: "مدرک ثبت شد", description: "مدرک برای تبلیغ‌دهنده ارسال شد." });
      setProofOpen(false);
      setPostLink("");
      setStatsImage(null);
      setCaption("");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "ثبت مدرک ناموفق بود.";
      setFormError(message);
    } finally {
      setBusy("");
    }
  }

  async function submitDispute() {
    if (busy) return;
    setFormError("");
    const reason = disputeReason.trim();
    if (reason.length < 10 || reason.length > 1000) {
      setFormError("دلیل اختلاف باید بین ۱۰ تا ۱۰۰۰ حرف باشد.");
      return;
    }
    setBusy("dispute");
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "ثبت اختلاف ناموفق بود.");
      toast({ tone: "info", title: "اختلاف ثبت شد", description: "مبلغ تا تصمیم مدیر منجمد می‌ماند." });
      setDisputeOpen(false);
      setDisputeReason("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "ثبت اختلاف ناموفق بود.");
    } finally {
      setBusy("");
    }
  }

  if (error && !order) {
    return <Alert tone="warning">{error}</Alert>;
  }
  if (!order) {
    return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  }

  const status = orderStatusMeta(order.status);
  const isOwner = order.viewer === "OWNER";
  const isAdvertiser = order.viewer === "ADVERTISER";
  const canDispute = ["ACCEPTED", "PUBLISHED", "CONFIRMED"].includes(order.status);
  const businessHidden = !order.revealed;

  return (
    <div className="space-y-5">
      {error && <Alert tone="warning">{error}</Alert>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-navy-900">سفارش {order.campaign.title}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
            {order.hold && <Badge tone={holdStatusMeta(order.hold.status).tone}>{holdStatusMeta(order.hold.status).label}</Badge>}
          </div>
          <p className="text-sm text-slate-500">
            شمارهٔ سفارش: <span dir="ltr" className="font-medium text-slate-700">{order.orderNumber}</span>
            {" · "}{typeLabel(order.publishType as PublishType)}{" · "}{formatToman(order.amount)}
          </p>
        </div>
        <Link href={isOwner ? "/publisher/dashboard#offers" : "/campaigns/new#my-orders"} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <ArrowRight className="size-4" /> بازگشت به فهرست
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات سفارش</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Row label="عنوان کمپین">{order.campaign.title}</Row>
              <Row label="پیج">{order.page.title} <span dir="ltr" className="text-xs text-slate-500">({order.page.handle})</span></Row>
              <Row label="دسته‌بندی">{categoryLabel(order.page.category as never)}</Row>
              <Row label="نوع انتشار">{typeLabel(order.publishType as PublishType)}</Row>
              <Row label="تاریخ ثبت">{fmt(order.createdAt)}</Row>
              {order.respondByAt && <Row label="مهلت پاسخ پیج">{fmt(order.respondByAt)}</Row>}
              {order.publishDeadlineAt && <Row label="مهلت انتشار">{fmt(order.publishDeadlineAt)}</Row>}
              {order.closedReason && <Row label="علت بسته‌شدن">{closedReasonLabel(order.closedReason)}</Row>}
              <div className="pt-2">
                <p className="mb-1 text-sm font-bold text-navy-900">توضیحات تبلیغ</p>
                <p className="whitespace-pre-line text-sm leading-7 text-slate-600">{order.campaign.description}</p>
              </div>
              {order.campaign.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded creative served by our own API
                <img src={order.campaign.mediaUrl} alt="تصویر تبلیغ" className="mt-3 max-h-72 w-full rounded-xl object-cover" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-brand-600" /> هویت طرفین</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {businessHidden ? (
                <Alert tone="info">
                  نام کسب‌وکار و لینک تبلیغ‌دهنده تا زمانی که درخواست را بپذیرید مخفی است. پس از پذیرش، اطلاعات تماس برای هماهنگی نمایش داده می‌شود.
                </Alert>
              ) : (
                <div className="space-y-1">
                  <Row label="کسب‌وکار">{order.campaign.business ?? "—"}</Row>
                  <Row label="لینک مقصد">
                    {order.campaign.link ? (
                      <a href={order.campaign.link} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                        {order.campaign.link} <ExternalLink className="size-3.5" />
                      </a>
                    ) : "—"}
                  </Row>
                </div>
              )}
              {order.pageStats && (
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-mist p-2 text-center"><p className="text-xs text-slate-500">فالوئر</p><p className="font-bold">{formatNumber(order.pageStats.followers)}</p></div>
                  <div className="rounded-xl bg-mist p-2 text-center"><p className="text-xs text-slate-500">بازدید استوری</p><p className="font-bold">{formatNumber(order.pageStats.avgStoryViews)}</p></div>
                  <div className="rounded-xl bg-mist p-2 text-center"><p className="text-xs text-slate-500">بازدید پست</p><p className="font-bold">{formatNumber(order.pageStats.avgPostViews)}</p></div>
                  <div className="rounded-xl bg-mist p-2 text-center"><p className="text-xs text-slate-500">بازدید ریلز</p><p className="font-bold">{formatNumber(order.pageStats.avgReelsViews)}</p></div>
                </div>
              )}
            </CardContent>
          </Card>

          {order.proofs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileImage className="size-4 text-brand-600" /> مدرک انتشار</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.proofs.map((p, i) => (
                  <div key={`${p.kind}-${i}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">{p.kind === "POST_LINK" ? "لینک پست" : "اسکرین‌شات آمار"}</p>
                    {p.kind === "POST_LINK" ? (
                      <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 break-all text-sm text-brand-700 hover:underline">
                        <Link2 className="size-4 shrink-0" /> {p.proofUrl}
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded proof served by our own API
                      <img src={p.proofUrl} alt="اسکرین‌شات آمار" className="max-h-80 rounded-lg object-contain" />
                    )}
                    {p.caption && <p className="mt-2 text-sm text-slate-600">{p.caption}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isOwner && order.status === "ACCEPTED" && (
            <Card>
              <CardHeader><CardTitle>ثبت مدرک انتشار</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!proofOpen ? (
                  <Button onClick={() => setProofOpen(true)} className="gap-1.5"><Upload className="size-4" /> ثبت لینک و اسکرین‌شات آمار</Button>
                ) : (
                  <div className="space-y-3">
                    {formError && <Alert tone="warning">{formError}</Alert>}
                    <Field id="postLink" label="لینک پست منتشرشده" required>
                      <Input dir="ltr" className="text-start" value={postLink} onChange={(e) => setPostLink(e.target.value)} placeholder="https://instagram.com/p/..." />
                    </Field>
                    <Field id="statsImage" label="اسکرین‌شات آمار" required hint="حداکثر ۳ مگابایت؛ PNG/JPEG/WebP.">
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadStats(e)} />
                      <div className="flex flex-wrap items-center gap-3">
                        {statsImage && (
                          // eslint-disable-next-line @next/next/no-img-element -- local upload preview
                          <img src={statsImage} alt="پیش‌نمایش آمار" className="h-16 w-16 rounded-lg object-cover" />
                        )}
                        <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {statsImage ? "تغییر تصویر" : "انتخاب تصویر"}
                        </Button>
                      </div>
                    </Field>
                    <Field id="proofCaption" label="توضیح">
                      <Textarea className="min-h-20" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} />
                    </Field>
                    <div className="flex gap-2">
                      <Button onClick={() => void submitProof()} disabled={busy === "proof"}>
                        {busy === "proof" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} ثبت مدرک
                      </Button>
                      <Button variant="outline" onClick={() => { setProofOpen(false); setFormError(""); }}>انصراف</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canDispute && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" /> ثبت اختلاف</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {!disputeOpen ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-7 text-slate-600">اگر انتشار انجام نشده یا مغایر توافق است، اختلاف ثبت کنید؛ مبلغ تا تصمیم مدیر منجمد می‌ماند.</p>
                    <Button variant="outline" onClick={() => setDisputeOpen(true)}>ثبت اختلاف</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formError && <Alert tone="warning">{formError}</Alert>}
                    <Field id="disputeReason" label="دلیل اختلاف" required hint="بین ۱۰ تا ۱۰۰۰ حرف.">
                      <Textarea className="min-h-28" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} maxLength={1000} />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => void submitDispute()} disabled={busy === "dispute"}>
                        {busy === "dispute" ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />} ارسال اختلاف
                      </Button>
                      <Button variant="outline" onClick={() => { setDisputeOpen(false); setFormError(""); }}>انصراف</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-brand-600" /> وضعیت مالی</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Row label="مبلغ سفارش">{formatToman(order.amount)}</Row>
              <Row label="کمیسیون پلتفرم (۱۰٪)">{formatToman(order.commission)}</Row>
              <Row label="سهم صاحب پیج">{formatToman(order.publisherAmount)}</Row>
              {order.hold && (
                <>
                  <Row label="وضعیت بلوکه"><Badge tone={holdStatusMeta(order.hold.status).tone}>{holdStatusMeta(order.hold.status).label}</Badge></Row>
                  {order.hold.payoutDueAt && <Row label="زمان مجاز پرداخت">{fmt(order.hold.payoutDueAt)}</Row>}
                </>
              )}
              <p className="pt-2 text-xs leading-6 text-slate-500">
                مبلغ در کیف پول تبلیغ‌دهنده بلوکه شده است و پس از تأیید نشر و پایان مهلت قانونی به صاحب پیج پرداخت می‌شود.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {isOwner && order.status === "REQUESTED" && (
              <>
                <Button className="w-full" variant="success" disabled={!!busy} onClick={() => void act("accept")}>
                  {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} پذیرش درخواست
                </Button>
                <Button className="w-full" variant="destructive" disabled={!!busy} onClick={() => void act("decline")}>
                  {busy === "decline" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} رد درخواست
                </Button>
              </>
            )}
            {isAdvertiser && order.status === "REQUESTED" && (
              <Button className="w-full" variant="destructive" disabled={!!busy} onClick={() => void act("cancel")}>
                {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} لغو درخواست
              </Button>
            )}
            {isAdvertiser && order.status === "PUBLISHED" && (
              <Button className="w-full" variant="success" disabled={!!busy} onClick={() => void act("confirm")}>
                {busy === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} تأیید نشر
              </Button>
            )}
            {isAdvertiser && order.status === "CONFIRMED" && (
              <Alert tone="success">شما نشر را تأیید کرده‌اید. پرداخت پس از پایان مهلت قانونی انجام می‌شود.</Alert>
            )}
            {order.status === "PAID_FULL" && <Alert tone="success">این سفارش تسویه شده است.</Alert>}
            {order.status === "DISPUTED" && <Alert tone="warning">این سفارش در وضعیت اختلاف است و منتظر تصمیم مدیر می‌باشد.</Alert>}
            <div className="flex items-center gap-2 rounded-xl bg-mist p-3 text-xs leading-6 text-slate-500">
              <CalendarClock className="size-4 shrink-0" /> همهٔ زمان‌ها بر اساس وقت محلی نمایش داده می‌شوند.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
