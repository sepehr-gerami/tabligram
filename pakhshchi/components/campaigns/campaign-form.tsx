"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Loader2, Send, Wallet, X } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, describe } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/auth/auth-provider";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { CAMPAIGN_LIMITS, parseCampaignInput, type CampaignErrors } from "@/lib/campaign-rules";
import { typeLabel } from "@/lib/constants";
import { cn, formatBytes, formatNumber, formatToman, parseAmount } from "@/lib/utils";
import type { PublishType } from "@/types";

interface WalletInfo { available: number; deposited: number; committed: number; pendingDeposits: number }

const INITIAL = {
  title: "", business: "", description: "", link: "", budget: "", pageCount: "1",
  category: "", city: "", notes: "",
};

const TYPES: { value: PublishType; label: string }[] = [
  { value: "story", label: "استوری" },
  { value: "post", label: "پست" },
  { value: "reels", label: "ریلز" },
];

const MAX_UPLOAD = 3 * 1024 * 1024;

export function CampaignForm({ initialPageId }: { initialPageId?: string }) {
  const { user, openAuth } = useSession();
  const toast = useToast();
  const [values, setValues] = useState(INITIAL);
  const [types, setTypes] = useState<PublishType[]>(["post"]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [errors, setErrors] = useState<CampaignErrors & { pageCount?: string }>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; created: number; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setWallet(null); return; }
    let alive = true;
    fetch("/api/wallet", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { summary?: WalletInfo } | null) => { if (alive) setWallet(data?.summary ?? null); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [user]);

  const budget = parseAmount(values.budget);
  const notEnough = wallet !== null && budget > 0 && wallet.available < budget;

  function set<K extends keyof typeof INITIAL>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleType(t: PublishType) {
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    setErrors((e) => ({ ...e, publishTypes: undefined }));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMediaError("فقط تصویر PNG، JPEG یا WebP مجاز است.");
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setMediaError(`حجم تصویر باید کمتر از ${formatBytes(MAX_UPLOAD)} باشد.`);
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/uploads?kind=creative", { method: "POST", body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "آپلود ناموفق بود.");
      setMediaUrl(data.url as string);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "آپلود ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!user) { openAuth("login"); return; }

    const pageCount = Number(values.pageCount);
    const parsed = parseCampaignInput({
      ...values,
      budget: values.budget,
      publishTypes: types,
      category: values.category || null,
      mediaUrl,
    });
    const nextErrors: CampaignErrors & { pageCount?: string } = parsed.ok ? {} : parsed.errors;
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 100) {
      nextErrors.pageCount = "تعداد پیج باید بین ۱ تا ۱۰۰ باشد.";
    }
    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length > 0) return;

    if (!parsed.ok) return;
    if (wallet !== null && wallet.available < parsed.data.budget) {
      setServerError("موجودی آزاد کیف پول برای این بودجه کافی نیست. ابتدا واریز کنید و منتظر تأیید مدیر بمانید.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          pageCount,
          targetPageId: initialPageId ?? undefined,
          targetPublishType: initialPageId ? types[0] : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) openAuth("login");
        setServerError(typeof data.error === "string" ? data.error : "ثبت کمپین ناموفق بود.");
        if (data.fields) setErrors(data.fields as CampaignErrors);
        return;
      }
      setDone({
        orderNumber: data.campaign?.orderNumber ?? "—",
        created: data.dispatch?.created ?? 0,
        message: typeof data.message === "string" ? data.message : "کمپین ثبت شد.",
      });
      setValues(INITIAL);
      setTypes(["post"]);
      setMediaUrl(null);
      const walletRes = await fetch("/api/wallet", { cache: "no-store" });
      if (walletRes.ok) {
        const w = await walletRes.json();
        setWallet(w.summary ?? null);
      }
      toast({ tone: "success", title: "کمپین ثبت شد", description: "درخواست‌ها به صاحبان پیج ارسال شد." });
    } catch {
      setServerError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl space-y-5 p-8 text-center" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-9" /></span>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-navy-900">کمپین ثبت شد</h2>
          <p className="leading-8 text-slate-600">{done.message}</p>
        </div>
        <div className="rounded-xl bg-mist p-4">
          <p className="text-sm text-slate-500">شمارهٔ کمپین</p>
          <p dir="ltr" className="text-2xl font-extrabold tracking-wide text-brand-700">{done.orderNumber}</p>
          <p className="mt-2 text-sm text-slate-600">{formatNumber(done.created)} درخواست ارسال شد.</p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/wallet" className={buttonVariants({ variant: "outline" })}><Wallet className="size-4" /> کیف پول و بلوکه‌ها</Link>
          <Button onClick={() => setDone(null)}>ثبت کمپین دیگر</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات تبلیغ</CardTitle>
          <p className="text-sm leading-6 text-slate-500">نام کسب‌وکار و لینک شما تا پذیرش درخواست برای صاحب پیج مخفی می‌ماند.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="space-y-4">
            {serverError && <Alert tone="warning">{serverError}</Alert>}
            {notEnough && (
              <Alert tone="warning">
                موجودی آزاد شما {formatToman(wallet?.available ?? 0)} است و برای این بودجه کافی نیست.{" "}
                <Link href="/wallet" className="font-bold underline">شارژ کیف پول</Link>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="عنوان تبلیغ" required error={errors.title}>
                <Input {...describe("title", errors.title)} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="مثلاً کلکسیون پاییزه" maxLength={CAMPAIGN_LIMITS.maxTitle} />
              </Field>
              <Field id="business" label="نام کسب‌وکار" required error={errors.business}>
                <Input {...describe("business", errors.business)} value={values.business} onChange={(e) => set("business", e.target.value)} placeholder="مثلاً مزون آرمان" maxLength={CAMPAIGN_LIMITS.maxBusiness} />
              </Field>
            </div>

            <Field id="description" label="توضیحات تبلیغ" required error={errors.description} hint="در متن تبلیغ شماره تماس یا آیدی ننویسید؛ هویت پس از پذیرش آشکار می‌شود.">
              <Textarea {...describe("description", errors.description, true)} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="محصول یا خدمت، مخاطب و نکته‌های مهم…" maxLength={CAMPAIGN_LIMITS.maxDescription} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="link" label="لینک مقصد" required error={errors.link} hint="آدرس سایت یا آیدی اینستاگرام مقصد.">
                <Input {...describe("link", errors.link, true)} dir="ltr" className="text-start" value={values.link} onChange={(e) => set("link", e.target.value)} placeholder="https://example.com" />
              </Field>
              <Field id="budget" label="بودجهٔ کل (تومان)" required error={errors.budget} hint={`حداقل ${formatToman(CAMPAIGN_LIMITS.minBudget)}`}>
                <Input {...describe("budget", errors.budget, true)} inputMode="numeric" value={values.budget} onChange={(e) => set("budget", e.target.value)} placeholder="5,000,000" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pageCount" label="حداکثر تعداد پیج" required error={errors.pageCount}>
                <Input {...describe("pageCount", errors.pageCount)} inputMode="numeric" value={values.pageCount} onChange={(e) => set("pageCount", e.target.value)} />
              </Field>
              <Field id="category" label="دسته‌بندی" error={errors.category} hint="خالی بگذارید تا همهٔ دسته‌ها پیشنهاد بگیرند.">
                <Select id="category" value={values.category} onValueChange={(v) => set("category", v)} placeholder="همهٔ دسته‌ها">
                  <option value="">همهٔ دسته‌ها</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
            </div>

            <Field id="publishTypes" label="نوع انتشار" required error={errors.publishTypes}>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => toggleType(t.value)} aria-pressed={types.includes(t.value)}
                    className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                      types.includes(t.value) ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="شهر" error={errors.city}>
                <Input {...describe("city", errors.city)} value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="تهران" maxLength={CAMPAIGN_LIMITS.maxCity} />
              </Field>
              <Field id="mediaUrl" label="تصویر تبلیغ" error={mediaError || errors.mediaUrl} hint="حداکثر ۳ مگابایت؛ PNG/JPEG/WebP.">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void onFile(e)} />
                {mediaUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local upload preview */}
                    <img src={mediaUrl} alt="پیش‌نمایش تبلیغ" className="size-14 rounded-lg object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setMediaUrl(null)}><X className="size-4" /> حذف</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {uploading ? "در حال آپلود…" : "انتخاب تصویر"}
                  </Button>
                )}
              </Field>
            </div>

            <Field id="notes" label="یادداشت برای صاحب پیج" error={errors.notes}>
              <Textarea {...describe("notes", errors.notes)} value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder="زمان دلخواه انتشار یا نکته‌های اجرایی…" maxLength={CAMPAIGN_LIMITS.maxNotes} className="min-h-20" />
            </Field>

            {initialPageId && (
              <Alert tone="info">پیجی که از بازار انتخاب کرده‌اید در اولویت توزیع قرار می‌گیرد؛ در صورت نبود شرایط، پیج‌های واجد شرایط دیگر انتخاب می‌شوند.</Alert>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" size="lg" disabled={busy} className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} ثبت کمپین و بلوکه‌کردن بودجه
              </Button>
              <span className="text-xs leading-5 text-slate-500">۱۰٪ کمیسیون پلتفرم از مبلغ هر انتشار کسر می‌شود.</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-brand-600 font-bold text-white">{(values.business.trim()[0] ?? "؟")}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-900">{values.business.trim() || "نام کسب‌وکار"}</p>
              <p className="text-xs text-slate-500">پیش‌نمایش تبلیغ</p>
            </div>
            {types[0] && <Badge tone="info" className="ms-auto">{typeLabel(types[0])}</Badge>}
          </div>
          <div className="grid aspect-square place-items-center bg-mist">
            {mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local upload preview
              <img src={mediaUrl} alt="پیش‌نمایش" className="size-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400"><ImagePlus className="size-9" /><span className="text-xs">تصویر شما اینجا دیده می‌شود</span></div>
            )}
          </div>
          <div className="space-y-2 p-4">
            <p className={cn("font-bold", values.title.trim() ? "text-navy-900" : "text-slate-400")}>{values.title.trim() || "عنوان تبلیغ شما"}</p>
            <p className="line-clamp-3 text-sm leading-7 text-slate-600">{values.description.trim() || "توضیحات محصول یا خدمت…"}</p>
            <div className="flex flex-wrap gap-1.5">
              {values.category && <Badge>{categoryLabel(values.category as never)}</Badge>}
              {values.city && <Badge>{values.city}</Badge>}
              {budget > 0 && <Badge tone="success">{formatToman(budget)}</Badge>}
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900"><Wallet className="size-4 text-brand-600" /> کیف پول شما</p>
          {!user ? (
            <div className="space-y-2 text-sm text-slate-600">
              <p>برای ثبت تبلیغ باید وارد حساب شوید.</p>
              <Button size="sm" onClick={() => openAuth("login")}>ورود / ثبت‌نام</Button>
            </div>
          ) : wallet === null ? (
            <p className="text-sm text-slate-500">در حال دریافت موجودی…</p>
          ) : (
            <>
              <div className="flex justify-between text-sm"><span className="text-slate-500">موجودی آزاد</span><b className="text-navy-900">{formatToman(wallet.available)}</b></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">بلوکه‌شده</span><span>{formatToman(wallet.committed)}</span></div>
              {wallet.pendingDeposits > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">واریز در انتظار تأیید</span><span className="text-amber-700">{formatToman(wallet.pendingDeposits)}</span></div>}
              <Link href="/wallet" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>مدیریت کیف پول</Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
