"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck, Check, CreditCard, FileImage, Layers, Loader2, Megaphone, RefreshCw,
  ShieldAlert, Users, Wallet, X,
} from "lucide-react";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/shared/stat-card";
import { useToast } from "@/components/ui/toast";
import {
  campaignStatusMeta, depositStatusMeta, holdStatusMeta, orderStatusMeta,
  pageStatusMeta, payoutStatusMeta,
} from "@/lib/api-status";
import { categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { cn, formatDate, formatNumber, formatToman } from "@/lib/utils";
import type { PublishType } from "@/types";

/* ------------------------------ types ------------------------------ */

interface Overview {
  users: number;
  advertisers: number;
  publishers: number;
  pages: { pending: number; approved: number };
  campaigns: { total: number; running: number; completed: number };
  deposits: { pendingCount: number; verifiedAmount: number };
  orders: { requested: number; published: number; completed: number };
  holds: {
    held: { count: number; amount: number };
    payoutDue: { count: number; amount: number };
    paidOut: { count: number; amount: number; commission: number; publisherAmount: number };
    refunded: { count: number; amount: number };
    disputed: number;
  };
  pendingPayoutProfiles: number;
}

interface AdminDeposit {
  id: string; amount: number; reference: string; receiptUrl: string | null; note: string | null;
  status: string; rejectReason: string | null; createdAt: string;
  user: { id: string; name: string; mobile: string };
}

interface AdminPage {
  id: string; handle: string; title: string; category: string; city: string | null;
  followers: number; priceStory: number; pricePost: number; priceReels: number;
  status: string; rejectReason: string | null; createdAt: string;
  owner: { id: string; name: string; mobile: string };
  verification: { status: string; method: string } | null;
}

interface AdminPublisher {
  id: string; userId: string; firstName: string | null; lastName: string | null;
  cardLast4: string | null; payoutStatus: string; payoutRejectReason: string | null;
  payoutSubmittedAt: string | null; payoutReviewedAt: string | null;
  user: { name: string; mobile: string };
}

interface AdminPayout {
  holdId: string; amount: number; commission: number; publisherAmount: number;
  holdStatus: string; payoutDueAt: string | null; timeReached: boolean; disputeNote: string | null;
  order: { id: string; status: string; publishType: string; proofSubmittedAt: string | null; advertiserConfirmedAt: string | null };
  campaign: { title: string; orderNumber: string; advertiserId: string };
  page: { id: string; title: string; handle: string };
  publisher: {
    id: string; name: string | null; mobile: string | null; cardHolderName: string | null;
    cardNumber: string | null; cardLast4: string | null; payoutStatus: string; payoutRejectReason: string | null;
  };
}

interface AdminDispute {
  id: string; amount: number; commission: number; publisherAmount: number;
  status: string; disputeNote: string | null; updatedAt: string;
  order: {
    id: string; status: string; amount: number; publishType: string;
    campaign: { id: string; title: string; business: string; orderNumber: string; advertiser: { id: string; name: string; mobile: string } };
    page: { id: string; title: string; handle: string; owner: { id: string; name: string; mobile: string } };
    proofs: { kind: string; proofUrl: string; caption: string | null }[];
    disputes: { id: string; subject: string; body: string; status: string; createdAt: string }[];
  };
}

interface AdminCampaign {
  id: string; orderNumber: string; title: string; business: string; budget: number;
  pageCount: number; status: string; createdAt: string;
  advertiser: { id: string; name: string; mobile: string };
  orderCount: number; blocked: number; remainingBudget: number; commission: number;
}

interface AdminOrder {
  id: string; status: string; amount: number; publishType: string; createdAt: string;
  campaign: { id: string; title: string; business: string; orderNumber: string; advertiser: { name: string; mobile: string } };
  page: { id: string; title: string; handle: string; owner: { name: string; mobile: string } };
  hold: { status: string; amount: number; commission: number; publisherAmount: number } | null;
}

interface AllData {
  overview: Overview;
  deposits: AdminDeposit[];
  pages: AdminPage[];
  publishers: AdminPublisher[];
  payouts: AdminPayout[];
  disputes: AdminDispute[];
  campaigns: AdminCampaign[];
  orders: AdminOrder[];
}

/* ------------------------------ helpers ------------------------------ */

const FILTER = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">{title}</h2>
        {description && <p className="text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------ dashboard ------------------------------ */

export function AdminDashboard() {
  const toast = useToast();
  const [data, setData] = useState<AllData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [refs, setRefs] = useState<Record<string, string>>({});

  const [depositFilter, setDepositFilter] = useState("PENDING");
  const [pageFilter, setPageFilter] = useState("PENDING");
  const [publisherFilter, setPublisherFilter] = useState("PENDING");
  const [orderFilter, setOrderFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const get = async (url: string) => {
        const res = await fetch(url, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body && typeof body.error === "string" ? body.error : "دریافت اطلاعات ناموفق بود.");
        return body;
      };
      const [overview, deposits, pages, publishers, payouts, disputes, campaigns, orders] = await Promise.all([
        get("/api/admin/overview"),
        get("/api/admin/deposits?status=all"),
        get("/api/admin/pages"),
        get("/api/admin/publishers?status=all"),
        get("/api/admin/payouts"),
        get("/api/admin/disputes"),
        get("/api/admin/campaigns"),
        get("/api/admin/orders"),
      ]);
      setData({
        overview: overview as Overview,
        deposits: Array.isArray(deposits) ? deposits : [],
        pages: Array.isArray(pages) ? pages : [],
        publishers: Array.isArray(publishers) ? publishers : [],
        payouts: Array.isArray(payouts) ? payouts : [],
        disputes: Array.isArray(disputes) ? disputes : [],
        campaigns: Array.isArray(campaigns) ? campaigns : [],
        orders: Array.isArray(orders) ? orders : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(url: string, body: Record<string, unknown>, successTitle: string, key = "action") {
    if (busy) return false;
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof result.error === "string" ? result.error : "عملیات ناموفق بود.");
      toast({ tone: "success", title: successTitle, description: typeof result.message === "string" ? result.message : undefined });
      await load();
      return true;
    } catch (err) {
      toast({ tone: "error", title: "عملیات ناموفق", description: err instanceof Error ? err.message : "دوباره تلاش کنید." });
      return false;
    } finally {
      setBusy("");
    }
  }

  const askReason = (message: string, min = 5) => {
    const value = window.prompt(message);
    if (value === null) return null;
    const reason = value.trim();
    if (reason.length < min) {
      toast({ tone: "error", title: "دلیل نامعتبر", description: `حداقل ${min} حرف وارد کنید.` });
      return null;
    }
    return reason;
  };

  if (error && !data) return <Alert tone="warning">{error}</Alert>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

  const pendingDeposits = data.deposits.filter((d) => d.status === "PENDING");
  const pendingPages = data.pages.filter((p) => p.status === "PENDING");
  const pendingPublishers = data.publishers.filter((p) => p.payoutStatus === "PENDING");
  const visibleDeposits = depositFilter === "all" ? data.deposits : data.deposits.filter((d) => d.status === depositFilter);
  const visiblePages = pageFilter === "all" ? data.pages : data.pages.filter((p) => p.status === pageFilter);
  const visiblePublishers = publisherFilter === "all" ? data.publishers : data.publishers.filter((p) => p.payoutStatus === publisherFilter);
  const visibleOrders = orderFilter === "all" ? data.orders : data.orders.filter((o) => o.status === orderFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">بررسی واریزها، پیج‌ها، کارت‌های پرداخت، تسویه‌ها و اختلاف‌ها از همین صفحه انجام می‌شود.</p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} به‌روزرسانی
        </Button>
      </div>

      {error && <Alert tone="warning">{error}</Alert>}

      <Section id="overview" title="نمای کلی" description="آمار لحظه‌ای پلتفرم، گردش مالی و کارهای در انتظار بررسی.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="کاربران" value={data.overview.users} hint={`${formatNumber(data.overview.publishers)} صاحب پیج · ${formatNumber(data.overview.advertisers)} تبلیغ‌دهنده`} />
          <StatCard icon={Megaphone} label="کمپین‌ها" value={data.overview.campaigns.total} hint={`${formatNumber(data.overview.campaigns.running)} در حال اجرا · ${formatNumber(data.overview.campaigns.completed)} تکمیل‌شده`} />
          <StatCard icon={Layers} label="پیج‌های تأییدشده" value={data.overview.pages.approved} hint={`${formatNumber(data.overview.pages.pending)} در انتظار تأیید`} />
          <StatCard icon={Wallet} label="واریزهای تأییدشده" value={formatToman(data.overview.deposits.verifiedAmount)} hint={`${formatNumber(data.overview.deposits.pendingCount)} واریز در انتظار`} />
          <StatCard icon={ShieldAlert} label="بلوکه‌های فعال" value={formatToman(data.overview.holds.held.amount)} hint={`${formatNumber(data.overview.holds.held.count)} سفارش`} />
          <StatCard icon={CreditCard} label="آمادهٔ پرداخت" value={formatToman(data.overview.holds.payoutDue.amount)} hint={`${formatNumber(data.overview.holds.payoutDue.count)} مورد`} />
          <StatCard icon={BadgeCheck} label="کمیسیون پلتفرم" value={formatToman(data.overview.holds.paidOut.commission)} hint={`از ${formatNumber(data.overview.holds.paidOut.count)} پرداخت انجام‌شده`} />
          <StatCard icon={Wallet} label="پرداخت‌شده به پیج‌ها" value={formatToman(data.overview.holds.paidOut.publisherAmount)} hint={`${formatNumber(data.overview.pendingPayoutProfiles)} کارت در انتظار تأیید`} />
        </div>
      </Section>

      <Section id="deposits" title="واریزها" description="فقط واریز تأییدشده به موجودی کیف پول اضافه می‌شود. رسید و شمارهٔ پیگیری را بررسی کنید.">
        <div className="flex flex-wrap items-center gap-2">
          <select className={FILTER} value={depositFilter} onChange={(e) => setDepositFilter(e.target.value)} aria-label="فیلتر وضعیت واریز">
            <option value="PENDING">در انتظار تأیید ({formatNumber(pendingDeposits.length)})</option>
            <option value="VERIFIED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
            <option value="all">همه</option>
          </select>
        </div>
        {visibleDeposits.length === 0 ? (
          <EmptyState icon={Wallet} title="واریزی در این وضعیت نیست" description="با تغییر فیلتر موارد دیگر را ببینید." />
        ) : (
          <ul className="space-y-3">
            {visibleDeposits.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-navy-900">{d.user.name} <span className="text-xs font-normal text-slate-500">({d.user.mobile})</span></p>
                    <p dir="ltr" className="text-start text-xs text-slate-500">{d.reference} · {formatDate(d.createdAt)}</p>
                    {d.note && <p className="text-xs text-slate-500">{d.note}</p>}
                    {d.rejectReason && <p className="text-xs text-red-700">دلیل رد: {d.rejectReason}</p>}
                  </div>
                  <p className="font-extrabold text-navy-900">{formatToman(d.amount)}</p>
                  <Badge tone={depositStatusMeta(d.status).tone}>{depositStatusMeta(d.status).label}</Badge>
                  {d.receiptUrl && (
                    <a href={d.receiptUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                      <FileImage className="size-4" /> رسید
                    </a>
                  )}
                  {d.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" disabled={!!busy} onClick={() => void action(`/api/admin/deposits/${d.id}/decision`, { action: "verify" }, "واریز تأیید شد")}>
                        <Check className="size-4" /> تأیید
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!busy}
                        onClick={() => {
                          const reason = askReason("دلیل رد واریز را بنویسید:");
                          if (reason) void action(`/api/admin/deposits/${d.id}/decision`, { action: "reject", reason }, "واریز رد شد");
                        }}
                      >
                        <X className="size-4" /> رد
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="pages" title="پیج‌ها" description="پیج‌های تأییدشده در بازار نمایش داده می‌شوند. رد کردن نیازمند دلیل است.">
        <div className="flex flex-wrap items-center gap-2">
          <select className={FILTER} value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} aria-label="فیلتر وضعیت پیج">
            <option value="PENDING">در انتظار تأیید ({formatNumber(pendingPages.length)})</option>
            <option value="APPROVED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
            <option value="DISABLED">غیرفعال</option>
            <option value="all">همه</option>
          </select>
        </div>
        {visiblePages.length === 0 ? (
          <EmptyState icon={Layers} title="پیجی در این وضعیت نیست" />
        ) : (
          <ul className="space-y-3">
            {visiblePages.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-navy-900">{p.title} <span dir="ltr" className="text-xs font-normal text-slate-500">{p.handle}</span></p>
                    <p className="text-xs text-slate-500">{categoryLabel(p.category as never)}{p.city ? ` · ${p.city}` : ""} · {formatNumber(p.followers)} فالوئر</p>
                    <p className="text-xs text-slate-500">مالک: {p.owner.name} ({p.owner.mobile})</p>
                    {p.rejectReason && <p className="text-xs text-red-700">دلیل رد: {p.rejectReason}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                    {p.priceStory > 0 && <Badge tone="info">استوری {formatToman(p.priceStory)}</Badge>}
                    {p.pricePost > 0 && <Badge tone="info">پست {formatToman(p.pricePost)}</Badge>}
                    {p.priceReels > 0 && <Badge tone="info">ریلز {formatToman(p.priceReels)}</Badge>}
                  </div>
                  <Badge tone={pageStatusMeta(p.status).tone}>{pageStatusMeta(p.status).label}</Badge>
                  <div className="flex flex-wrap gap-2">
                    {p.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="success" disabled={!!busy} onClick={() => void action(`/api/admin/pages/${p.id}/decision`, { action: "approve" }, "پیج تأیید شد")}><Check className="size-4" /> تأیید</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!busy}
                          onClick={() => {
                            const reason = askReason("دلیل رد پیج را بنویسید:");
                            if (reason) void action(`/api/admin/pages/${p.id}/decision`, { action: "reject", reason }, "پیج رد شد");
                          }}
                        >
                          <X className="size-4" /> رد
                        </Button>
                      </>
                    )}
                    {p.status === "APPROVED" && (
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void action(`/api/admin/pages/${p.id}/decision`, { action: "disable" }, "پیج غیرفعال شد")}>غیرفعال‌سازی</Button>
                    )}
                    {p.status === "DISABLED" && (
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void action(`/api/admin/pages/${p.id}/decision`, { action: "restore" }, "پیج فعال شد")}>فعال‌سازی</Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="publishers" title="کارت‌های پرداخت صاحبان پیج" description="پیش از پرداخت، کارت و نام صاحب پیج باید تأیید شود. کد ملی بعد از تصمیم حذف می‌شود.">
        <div className="flex flex-wrap items-center gap-2">
          <select className={FILTER} value={publisherFilter} onChange={(e) => setPublisherFilter(e.target.value)} aria-label="فیلتر وضعیت کارت">
            <option value="PENDING">در انتظار تأیید ({formatNumber(pendingPublishers.length)})</option>
            <option value="VERIFIED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
            <option value="NONE">ثبت‌نشده</option>
            <option value="all">همه</option>
          </select>
        </div>
        {visiblePublishers.length === 0 ? (
          <EmptyState icon={CreditCard} title="پرونده‌ای در این وضعیت نیست" />
        ) : (
          <ul className="space-y-3">
            {visiblePublishers.map((p) => (
              <li key={p.id}>
                <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-bold text-navy-900">{p.firstName ?? ""} {p.lastName ?? ""} <span className="text-xs font-normal text-slate-500">({p.user.name} · {p.user.mobile})</span></p>
                    <p dir="ltr" className="text-start text-xs text-slate-500">کارت: **** **** **** {p.cardLast4 ?? "----"}</p>
                    {p.payoutSubmittedAt && <p className="text-xs text-slate-500">ثبت: {formatDate(p.payoutSubmittedAt)}</p>}
                    {p.payoutRejectReason && <p className="text-xs text-red-700">دلیل رد: {p.payoutRejectReason}</p>}
                  </div>
                  <Badge tone={payoutStatusMeta(p.payoutStatus).tone}>{payoutStatusMeta(p.payoutStatus).label}</Badge>
                  {p.payoutStatus === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" disabled={!!busy} onClick={() => void action(`/api/admin/publishers/${p.id}/decision`, { action: "approve" }, "کارت تأیید شد")}><Check className="size-4" /> تأیید</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!busy}
                        onClick={() => {
                          const reason = askReason("دلیل رد کارت را بنویسید:");
                          if (reason) void action(`/api/admin/publishers/${p.id}/decision`, { action: "reject", reason }, "کارت رد شد");
                        }}
                      >
                        <X className="size-4" /> رد
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="payouts" title="تسویه با صاحبان پیج" description="فقط پس از پایان مهلت قانونی، تأیید کارت و ثبت شمارهٔ پیگیری امکان‌پذیر است. کمیسیون ۱۰٪ از قبل کسر شده است.">
        {data.payouts.length === 0 ? (
          <EmptyState icon={CreditCard} title="پرداختی در صف نیست" description="وقتی تبلیغ‌دهنده نشر را تأیید کند و مهلت قانونی تمام شود، اینجا ظاهر می‌شود." />
        ) : (
          <ul className="space-y-3">
            {data.payouts.map((p) => {
              const eligible = p.holdStatus === "PAYOUT_DUE" && p.timeReached && p.publisher.payoutStatus === "VERIFIED" && !!p.publisher.cardNumber;
              return (
                <li key={p.holdId}>
                  <Card className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="font-bold text-navy-900">{p.campaign.title} <span className="text-xs font-normal text-slate-500">({p.page.title})</span></p>
                        <p dir="ltr" className="text-start text-xs text-slate-500">{p.campaign.orderNumber} · {typeLabel(p.order.publishType as PublishType)}</p>
                        <p className="text-xs text-slate-500">صاحب پیج: {p.publisher.name ?? "—"} · {p.publisher.mobile ?? ""}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>کل: {formatToman(p.amount)}</p>
                        <p>کمیسیون: {formatToman(p.commission)} · خالص: <b className="text-navy-900">{formatToman(p.publisherAmount)}</b></p>
                      </div>
                      <Badge tone={holdStatusMeta(p.holdStatus).tone}>{holdStatusMeta(p.holdStatus).label}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-mist p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">کارت مقصد</p>
                        <p dir="ltr" className="font-mono font-bold text-navy-900">{p.publisher.cardNumber ?? `**** **** **** ${p.publisher.cardLast4 ?? "----"}`}</p>
                        <p className="text-xs text-slate-500">{p.publisher.cardHolderName || "نام صاحب کارت ثبت نشده"} · وضعیت: {payoutStatusMeta(p.publisher.payoutStatus).label}</p>
                      </div>
                      {p.holdStatus === "DISPUTED" ? (
                        <Badge tone="danger">اختلاف؛ در بخش اختلاف‌ها تصمیم بگیرید</Badge>
                      ) : (
                        <>
                          <Input
                            aria-label="شمارهٔ پیگیری پرداخت"
                            dir="ltr"
                            className="h-11 w-48 text-start"
                            placeholder="شمارهٔ پیگیری"
                            value={refs[p.holdId] ?? ""}
                            onChange={(e) => setRefs((r) => ({ ...r, [p.holdId]: e.target.value }))}
                            disabled={!eligible}
                          />
                          <Button
                            size="sm"
                            disabled={!eligible || !!busy}
                            onClick={() => {
                              const ref = (refs[p.holdId] ?? "").trim();
                              if (!ref) {
                                toast({ tone: "error", title: "شمارهٔ پیگیری لازم است" });
                                return;
                              }
                              if (!window.confirm(`پرداخت ${formatToman(p.publisherAmount)} به ${p.publisher.cardHolderName ?? "صاحب پیج"} ثبت شود؟`)) return;
                              void action(`/api/admin/payouts/${p.holdId}/pay`, { payoutReference: ref }, "پرداخت ثبت شد");
                            }}
                          >
                            <CreditCard className="size-4" /> ثبت پرداخت
                          </Button>
                        </>
                      )}
                    </div>

                    {!p.timeReached && p.holdStatus === "PAYOUT_DUE" && (
                      <p className="text-xs text-amber-700">هنوز مهلت قانونی پرداخت نرسیده است{p.payoutDueAt ? ` (${formatDate(p.payoutDueAt)})` : ""}.</p>
                    )}
                    {p.publisher.payoutStatus !== "VERIFIED" && (
                      <p className="text-xs text-red-700">کارت صاحب پیج تأیید نشده است؛ ابتدا در بخش «کارت‌های پرداخت» تأیید کنید.</p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="disputes" title="اختلاف‌ها" description="پول تا تصمیم مدیر منجمد است. بازگشت به تبلیغ‌دهنده یا پرداخت به صاحب پیج.">
        {data.disputes.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="اختلافی ثبت نشده" description="اختلاف‌های جدید پس از ثبت توسط طرفین اینجا نمایش داده می‌شوند." />
        ) : (
          <ul className="space-y-3">
            {data.disputes.map((d) => (
              <li key={d.id}>
                <Card className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="font-bold text-navy-900">{d.order.campaign.title} <span className="text-xs font-normal text-slate-500">({d.order.page.title})</span></p>
                      <p dir="ltr" className="text-start text-xs text-slate-500">{d.order.campaign.orderNumber} · {typeLabel(d.order.publishType as PublishType)}</p>
                      <p className="text-xs text-slate-500">تبلیغ‌دهنده: {d.order.campaign.advertiser.name} · صاحب پیج: {d.order.page.owner.name}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p>کل: {formatToman(d.amount)}</p>
                      <p>کمیسیون: {formatToman(d.commission)} · خالص: {formatToman(d.publisherAmount)}</p>
                    </div>
                    <Badge tone="danger">منجمد</Badge>
                  </div>
                  {d.disputeNote && <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{d.disputeNote}</p>}
                  {d.order.disputes.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-medium text-slate-800">{r.subject}</p>
                      <p className="leading-7 text-slate-600">{r.body}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                    </div>
                  ))}
                  {d.order.proofs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {d.order.proofs.map((p, i) => (
                        <a key={i} href={p.proofUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                          <FileImage className="size-4" /> {p.kind === "POST_LINK" ? "لینک پست" : "اسکرین‌شات آمار"}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!!busy}
                      onClick={() => {
                        const resolution = askReason("توضیح تصمیم برای بازگشت مبلغ به تبلیغ‌دهنده:");
                        if (resolution) void action(`/api/admin/disputes/${d.id}/decision`, { action: "refund", resolution }, "مبلغ به تبلیغ‌دهنده برگشت");
                      }}
                    >
                      بازگشت مبلغ به تبلیغ‌دهنده
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      disabled={!!busy || !d.order.proofs.length}
                      onClick={() => {
                        const resolution = askReason("توضیح تصمیم برای پرداخت به صاحب پیج:");
                        if (resolution) void action(`/api/admin/disputes/${d.id}/decision`, { action: "pay", resolution }, "سفارش به صف پرداخت رفت");
                      }}
                    >
                      پرداخت به صاحب پیج
                    </Button>
                    {!d.order.proofs.length && <span className="self-center text-xs text-slate-500">بدون مدرک انتشار، پرداخت مجاز نیست.</span>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="campaigns" title="کمپین‌ها" description="همهٔ کمپین‌ها با بودجه، مبلغ بلوکه و کمیسیون محاسبه‌شده.">
        {data.campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="کمپینی ثبت نشده" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-mist text-start text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-start">کمپین</th>
                  <th className="p-3 text-start">تبلیغ‌دهنده</th>
                  <th className="p-3 text-start">بودجه</th>
                  <th className="p-3 text-start">بلوکه</th>
                  <th className="p-3 text-start">سفارش</th>
                  <th className="p-3 text-start">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3">
                      <p className="font-bold text-navy-900">{c.title}</p>
                      <p dir="ltr" className="text-xs text-slate-500">{c.orderNumber} · {formatDate(c.createdAt)}</p>
                    </td>
                    <td className="p-3">{c.advertiser.name}<p className="text-xs text-slate-500">{c.advertiser.mobile}</p></td>
                    <td className="p-3">{formatToman(c.budget)}</td>
                    <td className="p-3">{formatToman(c.blocked)}<p className="text-xs text-slate-500">کمیسیون: {formatToman(c.commission)}</p></td>
                    <td className="p-3">{formatNumber(c.orderCount)}<p className="text-xs text-slate-500">باقی‌مانده: {formatToman(c.remainingBudget)}</p></td>
                    <td className="p-3"><Badge tone={campaignStatusMeta(c.status).tone}>{campaignStatusMeta(c.status).label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="orders" title="سفارش‌ها" description="وضعیت انتشار، بلوکه و کمیسیون هر سفارش. برای دیدن مدرک و جزئیات، سفارش را باز کنید.">
        <select className={FILTER} value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} aria-label="فیلتر وضعیت سفارش">
          <option value="all">همهٔ سفارش‌ها ({formatNumber(data.orders.length)})</option>
          <option value="REQUESTED">در انتظار پاسخ</option>
          <option value="ACCEPTED">پذیرفته‌شده</option>
          <option value="PUBLISHED">منتشرشده</option>
          <option value="CONFIRMED">تأییدشده</option>
          <option value="PAID_FULL">پرداخت‌شده</option>
          <option value="DISPUTED">اختلاف</option>
          <option value="DECLINED">ردشده</option>
          <option value="CANCELLED">لغوشده</option>
        </select>
        {visibleOrders.length === 0 ? (
          <EmptyState icon={FileImage} title="سفارشی در این وضعیت نیست" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[50rem] text-sm">
              <thead className="bg-mist text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-start">سفارش</th>
                  <th className="p-3 text-start">پیج</th>
                  <th className="p-3 text-start">مبلغ</th>
                  <th className="p-3 text-start">بلوکه</th>
                  <th className="p-3 text-start">وضعیت</th>
                  <th className="p-3 text-start" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-3">
                      <p className="font-bold text-navy-900">{o.campaign.title}</p>
                      <p dir="ltr" className="text-xs text-slate-500">{o.campaign.orderNumber} · {typeLabel(o.publishType as PublishType)}</p>
                    </td>
                    <td className="p-3">{o.page.title}<p className="text-xs text-slate-500">{o.page.owner.name}</p></td>
                    <td className="p-3">{formatToman(o.amount)}</td>
                    <td className="p-3">{o.hold ? <><Badge tone={holdStatusMeta(o.hold.status).tone}>{holdStatusMeta(o.hold.status).label}</Badge><p className="mt-1 text-xs text-slate-500">کمیسیون {formatToman(o.hold.commission)}</p></> : "—"}</td>
                    <td className="p-3"><Badge tone={orderStatusMeta(o.status).tone}>{orderStatusMeta(o.status).label}</Badge></td>
                    <td className="p-3"><Link href={`/orders/${o.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>جزئیات</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
