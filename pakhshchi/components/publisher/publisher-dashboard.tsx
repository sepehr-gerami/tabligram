"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BadgeCheck, Check, CheckCircle2, CreditCard, Inbox, Layers, Loader2, Pencil, PlusCircle,
  RefreshCw, Trash2, Upload, Wallet, X, XCircle,
} from "lucide-react";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { orderStatusMeta, pageStatusMeta, payoutStatusMeta } from "@/lib/api-status";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { parsePageInput, type PageErrors } from "@/lib/page-rules";
import { parsePayoutInput, type PayoutErrors } from "@/lib/identity-rules";
import { cn, formatDate, formatNumber, formatToman } from "@/lib/utils";
import type { PublishType } from "@/types";

interface ApiPage {
  id: string;
  handle: string;
  url: string | null;
  title: string;
  category: string;
  city: string | null;
  bio: string | null;
  followers: number;
  avgStoryViews: number;
  avgPostViews: number;
  avgReelsViews: number;
  priceStory: number;
  pricePost: number;
  priceReels: number;
  status: string;
  rejectReason: string | null;
  avatarUrl: string | null;
  createdAt: string;
  verification: { status: string } | null;
}

interface PublisherOrder {
  id: string;
  status: string;
  amount: number;
  commission: number;
  publisherAmount: number;
  publishType: string;
  createdAt: string;
  respondByAt: string | null;
  publishDeadlineAt: string | null;
  proofSubmittedAt: string | null;
  closedReason: string | null;
  campaign: { id: string; title: string; description: string; business: string | null; link: string | null; mediaUrl: string | null };
  page: { id: string; title: string; handle: string; avatarUrl: string | null };
  hold: { status: string; amount: number; commission: number; publisherAmount: number } | null;
  revealed: boolean;
  orderNumber: string;
}

interface Earnings {
  gross: number;
  commission: number;
  pending: number;
  paid: number;
  payoutStatus: string;
  cardLast4: string | null;
  payoutRejectReason: string | null;
}

interface PayoutProfile {
  firstName: string | null;
  lastName: string | null;
  cardLast4: string | null;
  payoutStatus: string;
  payoutRejectReason: string | null;
}

interface PageFormState {
  handle: string;
  title: string;
  url: string;
  category: string;
  city: string;
  bio: string;
  followers: string;
  avgStoryViews: string;
  avgPostViews: string;
  avgReelsViews: string;
  priceStory: string;
  pricePost: string;
  priceReels: string;
}

const EMPTY_PAGE: PageFormState = {
  handle: "", title: "", url: "", category: "", city: "", bio: "",
  followers: "", avgStoryViews: "", avgPostViews: "", avgReelsViews: "",
  priceStory: "", pricePost: "", priceReels: "",
};

const TYPE_LABEL: Record<PublishType, string> = { story: "استوری", post: "پست", reels: "ریلز" };
const TYPES: PublishType[] = ["story", "post", "reels"];

const pageToForm = (p: ApiPage): PageFormState => ({
  handle: p.handle,
  title: p.title,
  url: p.url ?? "",
  category: p.category,
  city: p.city ?? "",
  bio: p.bio ?? "",
  followers: String(p.followers),
  avgStoryViews: p.avgStoryViews ? String(p.avgStoryViews) : "",
  avgPostViews: p.avgPostViews ? String(p.avgPostViews) : "",
  avgReelsViews: p.avgReelsViews ? String(p.avgReelsViews) : "",
  priceStory: p.priceStory ? String(p.priceStory) : "",
  pricePost: p.pricePost ? String(p.pricePost) : "",
  priceReels: p.priceReels ? String(p.priceReels) : "",
});

const typesOf = (p: ApiPage): PublishType[] => {
  const list: PublishType[] = [];
  if (p.priceStory > 0) list.push("story");
  if (p.pricePost > 0) list.push("post");
  if (p.priceReels > 0) list.push("reels");
  return list;
};

function SummaryCard({ icon: Icon, label, value, hint }: { icon: typeof Layers; label: string; value: string; hint?: string }) {
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

/* ------------------------------------------------------------------ */
/* فرم ثبت/ویرایش پیج                                                  */
/* ------------------------------------------------------------------ */

function PageForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: ApiPage | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<PageFormState>(() => (editing ? pageToForm(editing) : EMPTY_PAGE));
  const [types, setTypes] = useState<PublishType[]>(() => (editing ? typesOf(editing) : ["post"]));
  const [errors, setErrors] = useState<PageErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(editing?.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PageFormState>(key: K, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleType = (t: PublishType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setErrors((prev) => ({ ...prev, publishTypes: undefined }));
  };

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarError("فقط تصویر PNG، JPEG یا WebP مجاز است.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("حجم تصویر باید حداکثر ۳ مگابایت باشد.");
      return;
    }
    setAvatarError("");
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/uploads?kind=avatar", { method: "POST", body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") throw new Error(typeof data.error === "string" ? data.error : "آپلود تصویر ناموفق بود.");
      setAvatarUrl(data.url);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setServerError("");

    const parsed = parsePageInput({
      ...values,
      url: values.url,
      avatarUrl,
      publishTypes: types,
      priceStory: types.includes("story") ? values.priceStory : 0,
      pricePost: types.includes("post") ? values.pricePost : 0,
      priceReels: types.includes("reels") ? values.priceReels : 0,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setServerError("فیلدهای مشخص‌شده را اصلاح کنید.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/pages/${editing.id}` : "/api/pages", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, url: values.url.trim(), avatarUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields as PageErrors);
        throw new Error(typeof data.error === "string" ? data.error : "ثبت پیج ناموفق بود.");
      }
      toast({
        tone: "success",
        title: editing ? "پیج به‌روزرسانی شد" : "پیج ثبت شد",
        description: typeof data.message === "string" ? data.message : "در انتظار تأیید مدیر است.",
      });
      if (!editing) {
        setValues(EMPTY_PAGE);
        setTypes(["post"]);
        setAvatarUrl(null);
      }
      await onSaved();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "ثبت پیج ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? `ویرایش ${editing.title}` : "ثبت پیج اینستاگرام"}</CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          پس از ثبت یا تغییر مؤثر، پیج برای تأیید مدیر ارسال می‌شود. آمار واردشده توسط شما تأیید اینستاگرام نیست.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {serverError && <div className="sm:col-span-2"><Alert tone="warning">{serverError}</Alert></div>}

          <Field id="page-handle" label="آیدی اینستاگرام" required error={errors.handle} hint="مثال: @my_page">
            <Input dir="ltr" className="text-start" value={values.handle} onChange={(e) => set("handle", e.target.value)} placeholder="@username" />
          </Field>
          <Field id="page-title" label="نام نمایشی" error={errors.title} hint="اگر خالی بماند، آیدی نمایش داده می‌شود.">
            <Input value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={50} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="page-url" label="لینک پیج" hint="اختیاری؛ اگر وارد شود باید http یا https باشد.">
              <Input dir="ltr" className="text-start" value={values.url} onChange={(e) => set("url", e.target.value)} placeholder="https://instagram.com/username" />
            </Field>
          </div>

          <Field id="page-category" label="دسته‌بندی" required error={errors.category}>
            <Select id="page-category" value={values.category} onValueChange={(v) => set("category", v)} placeholder="انتخاب دسته‌بندی">
              <option value="">انتخاب دسته‌بندی</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field id="page-city" label="شهر" error={errors.city}>
            <Input value={values.city} onChange={(e) => set("city", e.target.value)} maxLength={40} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="page-bio" label="معرفی پیج" error={errors.bio}>
              <Textarea className="min-h-20" value={values.bio} onChange={(e) => set("bio", e.target.value)} maxLength={300} />
            </Field>
          </div>

          <Field id="page-followers" label="تعداد فالوئر" required error={errors.followers}>
            <Input inputMode="numeric" dir="ltr" className="text-start" value={values.followers} onChange={(e) => set("followers", e.target.value)} />
          </Field>
          <Field id="page-story-views" label="میانگین بازدید استوری" error={errors.avgStoryViews}>
            <Input inputMode="numeric" dir="ltr" className="text-start" value={values.avgStoryViews} onChange={(e) => set("avgStoryViews", e.target.value)} />
          </Field>
          <Field id="page-post-views" label="میانگین بازدید پست" error={errors.avgPostViews}>
            <Input inputMode="numeric" dir="ltr" className="text-start" value={values.avgPostViews} onChange={(e) => set("avgPostViews", e.target.value)} />
          </Field>
          <Field id="page-reels-views" label="میانگین بازدید ریلز" error={errors.avgReelsViews}>
            <Input inputMode="numeric" dir="ltr" className="text-start" value={values.avgReelsViews} onChange={(e) => set("avgReelsViews", e.target.value)} />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-slate-800">نوع انتشار و تعرفه (تومان) <span className="text-red-600">*</span></legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPES.map((t) => {
                const on = types.includes(t);
                const key = (`price${t[0].toUpperCase()}${t.slice(1)}`) as "priceStory" | "pricePost" | "priceReels";
                return (
                  <div key={t} className={cn("space-y-2 rounded-xl border p-3", on ? "border-brand-600 bg-brand-50/50" : "border-slate-200")}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                      <input type="checkbox" checked={on} onChange={() => toggleType(t)} className="size-4 accent-brand-600" />
                      {TYPE_LABEL[t]}
                    </label>
                    <Input
                      aria-label={`تعرفهٔ ${TYPE_LABEL[t]}`}
                      inputMode="numeric"
                      dir="ltr"
                      className="h-10 text-start"
                      disabled={!on}
                      placeholder="حداقل ۵۰٬۰۰۰"
                      value={values[key]}
                      onChange={(e) => set(key, e.target.value)}
                    />
                    {errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}
                  </div>
                );
              })}
            </div>
            {errors.publishTypes && <p className="mt-2 text-xs text-red-600">{errors.publishTypes}</p>}
          </fieldset>

          <div className="sm:col-span-2">
            <Field id="page-avatar" label="تصویر پروفایل" error={avatarError}>
              <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadAvatar(e)} />
              <div className="flex flex-wrap items-center gap-3">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded avatar served by our API
                  <img src={avatarUrl} alt="تصویر پیج" className="size-14 rounded-full border border-slate-200 object-cover" />
                )}
                <Button type="button" variant="outline" disabled={uploadingAvatar} onClick={() => avatarRef.current?.click()}>
                  {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {avatarUrl ? "تغییر تصویر" : "انتخاب تصویر"}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>حذف تصویر</Button>
                )}
              </div>
            </Field>
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              {editing ? "ذخیرهٔ تغییرات" : "ثبت پیج"}
            </Button>
            {editing && <Button type="button" variant="outline" onClick={onCancel}>انصراف</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* داشبورد                                                              */
/* ------------------------------------------------------------------ */

export function PublisherDashboard() {
  const toast = useToast();
  const [pages, setPages] = useState<ApiPage[] | null>(null);
  const [orders, setOrders] = useState<PublisherOrder[] | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ApiPage | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pagesRes, ordersRes, earningsRes, profileRes] = await Promise.all([
        fetch("/api/pages", { cache: "no-store" }),
        fetch("/api/publisher/orders", { cache: "no-store" }),
        fetch("/api/publisher/earnings", { cache: "no-store" }),
        fetch("/api/publisher/payout-profile", { cache: "no-store" }),
      ]);
      const [pagesData, ordersData, earningsData, profileData] = await Promise.all([
        pagesRes.json().catch(() => []),
        ordersRes.json().catch(() => ({ orders: [] })),
        earningsRes.json().catch(() => null),
        profileRes.json().catch(() => null),
      ]);
      if (!pagesRes.ok) throw new Error(pagesData?.error ?? "دریافت پیج‌ها ناموفق بود.");
      if (!ordersRes.ok) throw new Error(ordersData?.error ?? "دریافت سفارش‌ها ناموفق بود.");
      setPages(Array.isArray(pagesData) ? pagesData : []);
      setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
      setEarnings(earningsData && !earningsData.error ? earningsData : null);
      setProfile(profileData && !profileData.error ? profileData : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود.");
      setPages([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(order: PublisherOrder, action: "accept" | "decline") {
    if (busyOrder) return;
    setBusyOrder(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "عملیات ناموفق بود.");
      toast({
        tone: action === "accept" ? "success" : "info",
        title: action === "accept" ? "درخواست پذیرفته شد" : "درخواست رد شد",
        description: typeof data.message === "string" ? data.message : undefined,
      });
      await load();
    } catch (err) {
      toast({ tone: "error", title: "عملیات ناموفق", description: err instanceof Error ? err.message : "دوباره تلاش کنید." });
    } finally {
      setBusyOrder(null);
    }
  }

  async function removePage(page: ApiPage) {
    if (!window.confirm(`پیج ${page.title} حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "حذف پیج ناموفق بود.");
      toast({ tone: "success", title: "پیج حذف شد" });
      await load();
    } catch (err) {
      toast({ tone: "error", title: "حذف ناموفق", description: err instanceof Error ? err.message : "دوباره تلاش کنید." });
    }
  }

  const pageList = pages ?? [];
  const orderList = orders ?? [];
  const requested = orderList.filter((o) => o.status === "REQUESTED");
  const active = orderList.filter((o) => ["ACCEPTED", "PUBLISHED", "CONFIRMED"].includes(o.status));
  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orderList;
    if (orderFilter === "open") return orderList.filter((o) => ["REQUESTED", "ACCEPTED", "PUBLISHED", "CONFIRMED", "DISPUTED"].includes(o.status));
    if (orderFilter === "closed") return orderList.filter((o) => ["PAID_FULL", "DECLINED", "CANCELLED"].includes(o.status));
    return orderList.filter((o) => o.status === orderFilter);
  }, [orderList, orderFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">پیج‌های تأییدشده می‌توانند درخواست تبلیغ بگیرند. پرداخت پس از تأیید نشر و پایان مهلت قانونی انجام می‌شود.</p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} به‌روزرسانی
        </Button>
      </div>

      {error && <Alert tone="warning">{error}</Alert>}

      <section id="summary" className="scroll-mt-24 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Layers} label="پیج‌های من" value={pages === null ? "…" : formatNumber(pageList.length)} hint={`${formatNumber(pageList.filter((p) => p.status === "APPROVED").length)} تأییدشده`} />
          <SummaryCard icon={Inbox} label="درخواست‌های جدید" value={pages === null ? "…" : formatNumber(requested.length)} hint={`${formatNumber(active.length)} سفارش در جریان`} />
          <SummaryCard icon={Wallet} label="درآمد در جریان" value={earnings ? formatToman(earnings.pending) : "…"} hint={earnings ? `کمیسیون: ${formatToman(earnings.commission)}` : undefined} />
          <SummaryCard icon={BadgeCheck} label="پرداخت‌شده" value={earnings ? formatToman(earnings.paid) : "…"} hint={earnings ? `درآمد کل: ${formatToman(earnings.gross)}` : undefined} />
        </div>

        {profile && profile.payoutStatus !== "VERIFIED" && (
          <Alert tone="warning">
            برای دریافت پرداخت، اطلاعات کارت بانکی خود را ثبت کنید و منتظر تأیید مدیر بمانید.
            <a href="#payout" className="ms-1 font-bold underline">ثبت اطلاعات پرداخت</a>
          </Alert>
        )}
      </section>

      <section id="register" className="scroll-mt-24">
        <PageForm
          key={editing?.id ?? "new-page"}
          editing={editing}
          onSaved={async () => { setEditing(null); await load(); }}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section id="my-pages" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-extrabold text-navy-900">پیج‌های من</h2>
        {pages === null ? (
          <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        ) : pageList.length === 0 ? (
          <EmptyState icon={Layers} title="هنوز پیجی ثبت نکرده‌اید" description="اولین پیج خود را از فرم بالا ثبت کنید تا پس از تأیید مدیر در بازار نمایش داده شود." />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {pageList.map((p) => (
              <li key={p.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded avatar served by our API
                      <img src={p.avatarUrl} alt="" className="size-12 rounded-full border border-slate-200 object-cover" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"><Layers className="size-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy-900">{p.title}</p>
                      <p dir="ltr" className="truncate text-start text-xs text-slate-500">{p.handle}</p>
                      <p className="text-xs text-slate-500">{categoryLabel(p.category as never)}{p.city ? ` · ${p.city}` : ""}</p>
                    </div>
                    <Badge tone={pageStatusMeta(p.status).tone}>{pageStatusMeta(p.status).label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">فالوئر</p><p className="font-bold">{formatNumber(p.followers)}</p></div>
                    <div><p className="text-xs text-slate-500">بازدید استوری</p><p className="font-bold">{formatNumber(p.avgStoryViews)}</p></div>
                    <div><p className="text-xs text-slate-500">بازدید پست</p><p className="font-bold">{formatNumber(p.avgPostViews)}</p></div>
                    <div><p className="text-xs text-slate-500">بازدید ریلز</p><p className="font-bold">{formatNumber(p.avgReelsViews)}</p></div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {typesOf(p).map((t) => (
                      <Badge key={t} tone="info">{TYPE_LABEL[t]} · {formatToman(t === "story" ? p.priceStory : t === "post" ? p.pricePost : p.priceReels)}</Badge>
                    ))}
                  </div>

                  {p.status === "REJECTED" && p.rejectReason && (
                    <p className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">دلیل رد: {p.rejectReason}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(p); document.getElementById("register")?.scrollIntoView({ behavior: "smooth" }); }}>
                      <Pencil className="size-4" /> ویرایش
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void removePage(p)}>
                      <Trash2 className="size-4" /> حذف
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="offers" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-navy-900">درخواست‌های تبلیغ</h2>
            <p className="text-sm text-slate-500">تا پذیرش، نام کسب‌وکار و لینک تبلیغ‌دهنده مخفی است. با پذیرش، اطلاعات تماس آشکار می‌شود.</p>
          </div>
          <div className="w-48">
            <Select id="order-filter" value={orderFilter} onValueChange={setOrderFilter} placeholder="همهٔ سفارش‌ها">
              <option value="all">همهٔ سفارش‌ها</option>
              <option value="open">در جریان</option>
              <option value="closed">بسته‌شده</option>
              <option value="REQUESTED">در انتظار پاسخ</option>
              <option value="ACCEPTED">پذیرفته‌شده</option>
              <option value="PUBLISHED">منتظر تأیید</option>
              <option value="PAID_FULL">پرداخت‌شده</option>
            </Select>
          </div>
        </div>

        {orders === null ? (
          <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState icon={Inbox} title="سفارشی در این وضعیت نیست" description="وقتی تبلیغ‌دهنده‌ای پیشنهاد بفرستد یا کمپینی به پیج شما برسد، اینجا نمایش داده می‌شود." />
        ) : (
          <ul className="space-y-3">
            {filteredOrders.map((o) => (
              <li key={o.id}>
                <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-navy-900">{o.campaign.title}</p>
                    <p className="text-sm text-slate-500">
                      {o.page.title} · {TYPE_LABEL[o.publishType as PublishType] ?? o.publishType} · {formatDate(o.createdAt)}
                    </p>
                    <p dir="ltr" className="text-xs text-slate-400">{o.orderNumber}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-bold text-navy-900">{formatToman(o.publisherAmount)} <span className="text-xs font-normal text-slate-500">خالص شما</span></p>
                    <p className="text-xs text-slate-500">مبلغ سفارش {formatToman(o.amount)} · کمیسیون {formatToman(o.commission)}</p>
                  </div>
                  <Badge tone={orderStatusMeta(o.status).tone}>{orderStatusMeta(o.status).label}</Badge>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/orders/${o.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>جزئیات</Link>
                    {o.status === "REQUESTED" && (
                      <>
                        <Button size="sm" variant="success" disabled={busyOrder === o.id} onClick={() => void decide(o, "accept")}>
                          {busyOrder === o.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} پذیرش
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyOrder === o.id} onClick={() => void decide(o, "decline")}>
                          <X className="size-4" /> رد
                        </Button>
                      </>
                    )}
                    {o.status === "ACCEPTED" && (
                      <Link href={`/orders/${o.id}`} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}><CheckCircle2 className="size-4" /> ثبت مدرک انتشار</Link>
                    )}
                    {o.status === "PUBLISHED" && <span className="text-xs text-slate-500">منتظر تأیید تبلیغ‌دهنده</span>}
                    {o.status === "PAID_FULL" && <Badge tone="success">تسویه شد</Badge>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PayoutSection profile={profile} onSaved={load} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* اطلاعات پرداخت                                                       */
/* ------------------------------------------------------------------ */

function PayoutSection({ profile, onSaved }: { profile: PayoutProfile | null; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ firstName: "", lastName: "", nationalId: "", cardNumber: "" });
  const [errors, setErrors] = useState<PayoutErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setValues((v) => ({ ...v, firstName: profile.firstName ?? "", lastName: profile.lastName ?? "" }));
    }
  }, [profile]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = parsePayoutInput(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setServerError("");
    setBusy(true);
    try {
      const res = await fetch("/api/publisher/payout-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields as PayoutErrors);
        throw new Error(typeof data.error === "string" ? data.error : "ثبت اطلاعات پرداخت ناموفق بود.");
      }
      toast({ tone: "success", title: "اطلاعات پرداخت ثبت شد", description: "در انتظار تأیید مدیر است." });
      setOpen(false);
      setValues((v) => ({ ...v, nationalId: "", cardNumber: "" }));
      await onSaved();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "ثبت اطلاعات پرداخت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  const meta = payoutStatusMeta(profile?.payoutStatus);
  return (
    <section id="payout" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">اطلاعات پرداخت</h2>
          <p className="text-sm text-slate-500">شمارهٔ کارت باید به نام خودتان باشد. شمارهٔ کارت رمزگذاری می‌شود و فقط چهار رقم آخر نمایش داده می‌شود.</p>
        </div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)} className="gap-1.5">
          <CreditCard className="size-4" /> {profile?.payoutStatus === "VERIFIED" ? "ویرایش اطلاعات" : "ثبت اطلاعات پرداخت"}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {profile?.cardLast4 && <span dir="ltr" className="font-mono text-slate-700">**** **** **** {profile.cardLast4}</span>}
          {profile?.payoutRejectReason && <span className="text-red-700">دلیل رد: {profile.payoutRejectReason}</span>}
        </div>

        {open && (
          <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
            {serverError && <div className="sm:col-span-2"><Alert tone="warning">{serverError}</Alert></div>}
            <Field id="payout-first" label="نام" required error={errors.firstName}>
              <Input value={values.firstName} onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))} maxLength={40} />
            </Field>
            <Field id="payout-last" label="نام خانوادگی" required error={errors.lastName}>
              <Input value={values.lastName} onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))} maxLength={40} />
            </Field>
            <Field id="payout-national" label="کد ملی" required error={errors.nationalId}>
              <Input inputMode="numeric" dir="ltr" className="text-start" value={values.nationalId} onChange={(e) => setValues((v) => ({ ...v, nationalId: e.target.value }))} maxLength={10} />
            </Field>
            <Field id="payout-card" label="شمارهٔ کارت" required error={errors.cardNumber}>
              <Input inputMode="numeric" dir="ltr" className="text-start" value={values.cardNumber} onChange={(e) => setValues((v) => ({ ...v, cardNumber: e.target.value }))} maxLength={19} placeholder="6037-9975-1234-5678" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} ثبت برای بررسی مدیر
              </Button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}
