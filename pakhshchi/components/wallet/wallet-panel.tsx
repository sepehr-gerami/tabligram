"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowDownToLine, CheckCircle2, Clock, Copy, CreditCard, Loader2, RefreshCw, Upload, Wallet, X, XCircle,
} from "lucide-react";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { depositStatusMeta, holdStatusMeta } from "@/lib/api-status";
import { typeLabel } from "@/lib/constants";
import { parseDepositInput, type DepositErrors } from "@/lib/money-rules";
import { PLATFORM_CARD_HOLDER, PLATFORM_CARD_NUMBER, displayCardNumber, isPlatformCardConfigured } from "@/lib/payment-info";
import { cn, formatDate, formatToman } from "@/lib/utils";
import type { PublishType } from "@/types";

interface WalletSummary {
  available: number;
  deposited: number;
  committed: number;
  pendingDeposits: number;
}

interface DepositRow {
  id: string;
  amount: number;
  reference: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface HoldRow {
  id: string;
  amount: number;
  commission: number;
  publisherAmount: number;
  status: string;
  createdAt: string;
  payoutDueAt: string | null;
  order: {
    id: string;
    publishType: string;
    campaign: { title: string; orderNumber: string };
    page: { title: string; handle: string };
  };
}

interface WalletData {
  summary: WalletSummary;
  deposits: DepositRow[];
  holds: HoldRow[];
}

const EMPTY_DEPOSIT = { amount: "", reference: "", note: "" };

function Summary({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint?: string }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-6" /></span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-navy-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function WalletPanel() {
  const toast = useToast();
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(EMPTY_DEPOSIT);
  const [errors, setErrors] = useState<DepositErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "دریافت کیف پول ناموفق بود.");
      setData(body as WalletData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت کیف پول ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadReceipt(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setReceiptError("فقط تصویر PNG، JPEG یا WebP مجاز است.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setReceiptError("حجم تصویر باید حداکثر ۳ مگابایت باشد.");
      return;
    }
    setReceiptError("");
    setUploadingReceipt(true);
    try {
      const res = await fetch("/api/uploads?kind=receipt", { method: "POST", body: file });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.url !== "string") throw new Error(typeof body.error === "string" ? body.error : "آپلود رسید ناموفق بود.");
      setReceiptUrl(body.url);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "آپلود رسید ناموفق بود.");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function submitDeposit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setServerError("");
    const parsed = parseDepositInput(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, receiptUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.fields) setErrors(body.fields as DepositErrors);
        throw new Error(typeof body.error === "string" ? body.error : "ثبت واریز ناموفق بود.");
      }
      toast({
        tone: "success",
        title: "واریز ثبت شد",
        description: "پس از تأیید مدیر، مبلغ به موجودی قابل استفاده اضافه می‌شود.",
      });
      setValues(EMPTY_DEPOSIT);
      setReceiptUrl(null);
      await load();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "ثبت واریز ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(PLATFORM_CARD_NUMBER.replace(/\D/g, ""));
      toast({ tone: "success", title: "شمارهٔ کارت کپی شد" });
    } catch {
      toast({ tone: "info", title: "کپی ممکن نشد", description: "شمارهٔ کارت را دستی یادداشت کنید." });
    }
  }

  if (error && !data) return <Alert tone="warning">{error}</Alert>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">واریز کارت‌به‌کارت پس از تأیید مدیر به موجودی اضافه می‌شود. مبلغ سفارش‌ها تا تأیید نشر بلوکه می‌ماند.</p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} به‌روزرسانی
        </Button>
      </div>

      {error && <Alert tone="warning">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Wallet} label="موجودی آزاد" value={formatToman(data.summary.available)} hint="قابل استفاده برای ثبت تبلیغ" />
        <Summary icon={ArrowDownToLine} label="جمع واریزهای تأییدشده" value={formatToman(data.summary.deposited)} />
        <Summary icon={Clock} label="بلوکه‌شده" value={formatToman(data.summary.committed)} hint="در سفارش‌های در جریان و پرداخت‌شده" />
        <Summary icon={CreditCard} label="واریز در انتظار تأیید" value={formatToman(data.summary.pendingDeposits)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>ثبت واریز جدید</CardTitle>
            <p className="text-sm leading-6 text-slate-500">مبلغ را به کارت زیر واریز کنید، سپس شمارهٔ پیگیری و رسید را ثبت کنید.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPlatformCardConfigured ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                <CreditCard className="size-6 text-brand-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">کارت مقصد ({PLATFORM_CARD_HOLDER || "تبلیگرام"})</p>
                  <p dir="ltr" className="select-all text-lg font-extrabold tracking-wider text-navy-900">{displayCardNumber(PLATFORM_CARD_NUMBER)}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyCard()} className="gap-1.5"><Copy className="size-4" /> کپی</Button>
              </div>
            ) : (
              <Alert tone="warning">شمارهٔ کارت مقصد هنوز توسط مدیر تنظیم نشده است؛ برای واریز با پشتیبانی تماس بگیرید.</Alert>
            )}

            <form onSubmit={submitDeposit} noValidate className="space-y-4">
              {serverError && <Alert tone="warning">{serverError}</Alert>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="deposit-amount" label="مبلغ واریز (تومان)" required error={errors.amount} hint="حداقل ۱۰۰٬۰۰۰ تومان">
                  <Input inputMode="numeric" value={values.amount} onChange={(e) => { setValues((v) => ({ ...v, amount: e.target.value })); setErrors((x) => ({ ...x, amount: undefined })); }} placeholder="5,000,000" />
                </Field>
                <Field id="deposit-reference" label="شمارهٔ پیگیری" required error={errors.reference} hint="۴ تا ۳۰ حرف یا رقم">
                  <Input dir="ltr" className="text-start" value={values.reference} onChange={(e) => { setValues((v) => ({ ...v, reference: e.target.value })); setErrors((x) => ({ ...x, reference: undefined })); }} placeholder="TRX-123456" />
                </Field>
              </div>
              <Field id="deposit-note" label="توضیح" error={errors.note}>
                <Textarea className="min-h-20" value={values.note} onChange={(e) => { setValues((v) => ({ ...v, note: e.target.value })); setErrors((x) => ({ ...x, note: undefined })); }} maxLength={300} />
              </Field>
              <Field id="deposit-receipt" label="تصویر رسید" error={receiptError} hint="اختیاری ولی برای بررسی سریع‌تر مدیر توصیه می‌شود.">
                <input ref={receiptRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadReceipt(e)} />
                <div className="flex flex-wrap items-center gap-3">
                  {receiptUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded receipt served by our API
                    <img src={receiptUrl} alt="رسید" className="h-16 w-16 rounded-lg object-cover" />
                  )}
                  <Button type="button" variant="outline" disabled={uploadingReceipt} onClick={() => receiptRef.current?.click()}>
                    {uploadingReceipt ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {receiptUrl ? "تغییر رسید" : "انتخاب رسید"}
                  </Button>
                  {receiptUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setReceiptUrl(null)}><X className="size-4" /> حذف</Button>}
                </div>
              </Field>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowDownToLine className="size-4" />} ثبت واریز برای تأیید
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>راهنما</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>۱. مبلغ را دقیقاً به کارت مقصد واریز کنید.</p>
            <p>۲. شمارهٔ پیگیری بانکی را بدون فاصله ثبت کنید.</p>
            <p>۳. مدیر رسید را بررسی می‌کند؛ تا آن زمان مبلغ در «در انتظار تأیید» است.</p>
            <p>۴. پس از تأیید می‌توانید کمپین بسازید؛ بودجهٔ هر سفارش بلوکه می‌شود.</p>
            <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>ساخت کمپین</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سابقهٔ واریزها</CardTitle></CardHeader>
        <CardContent>
          {data.deposits.length === 0 ? (
            <EmptyState icon={CreditCard} title="واریزی ثبت نشده است" description="اولین واریز خود را از فرم بالا ثبت کنید." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.deposits.map((d) => {
                const meta = depositStatusMeta(d.status);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy-900">{formatToman(d.amount)}</p>
                      <p dir="ltr" className="text-start text-xs text-slate-500">{d.reference} · {formatDate(d.createdAt)}</p>
                      {d.rejectReason && <p className="text-xs text-red-700">دلیل رد: {d.rejectReason}</p>}
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {d.status === "VERIFIED" && <CheckCircle2 className="size-5 text-emerald-600" />}
                    {d.status === "REJECTED" && <XCircle className="size-5 text-red-600" />}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>بلوکه‌ها و سفارش‌ها</CardTitle></CardHeader>
        <CardContent>
          {data.holds.length === 0 ? (
            <EmptyState icon={Wallet} title="بلوکه‌ای ندارید" description="با ساخت کمپین یا ارسال پیشنهاد، مبلغ سفارش از موجودی بلوکه می‌شود." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.holds.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy-900">{h.order.campaign.title} <span className="text-xs font-normal text-slate-500">({h.order.page.title})</span></p>
                    <p className="text-xs text-slate-500" dir="ltr">{h.order.campaign.orderNumber} · {typeLabel(h.order.publishType as PublishType)}</p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p>بلوکه: {formatToman(h.amount)}</p>
                    <p>کمیسیون: {formatToman(h.commission)} · سهم پیج: {formatToman(h.publisherAmount)}</p>
                  </div>
                  <Badge tone={holdStatusMeta(h.status).tone}>{holdStatusMeta(h.status).label}</Badge>
                  <Link href={`/orders/${h.order.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>جزئیات</Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
