"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Eye, ImageIcon, SearchX, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, SectionHeading, Skeleton } from "@/components/ui/misc";
import { StoryRing } from "@/components/ui/story-ring";
import { CategoryFilter } from "@/components/shared/category-filter";
import { OfferDialog } from "@/components/shared/offer-dialog";
import { CATEGORIES, categoryIcon, categoryLabel } from "@/lib/categories";
import { typeLabel } from "@/lib/constants";
import { marketMinPrice, marketPrice, type MarketPage } from "@/lib/market";
import { isSafeLink } from "@/lib/banner-rules";
import { cn, formatNumber, formatToman } from "@/lib/utils";
import type { CategoryId } from "@/types";

interface PublicBanner {
  id: string;
  title: string;
  description: string | null;
  link: string;
  desktopImage: string | null;
  mobileImage: string | null;
}

function PagesTopBanner() {
  const [banner, setBanner] = useState<PublicBanner | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/banners?placement=PAGES_TOP", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: PublicBanner[]) => { if (alive) setBanner(Array.isArray(rows) && rows.length > 0 ? rows[0] : null); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  if (!banner) return null;

  const image = banner.desktopImage ?? banner.mobileImage;
  const body = (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:flex-row sm:items-center">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- self-hosted banner file
        <img src={image} alt={banner.title} className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-64" />
      ) : (
        <div className="grid h-24 w-full place-items-center rounded-xl bg-brand-50 text-brand-600 sm:w-64"><ImageIcon className="size-7" /></div>
      )}
      <div className="min-w-0 flex-1 space-y-1 sm:pe-3">
        <p className="text-xs font-medium text-brand-700">تبلیغ ویژه</p>
        <p className="font-bold text-navy-900">{banner.title}</p>
        {banner.description && <p className="line-clamp-2 text-sm leading-6 text-slate-500">{banner.description}</p>}
      </div>
    </div>
  );

  if (!isSafeLink(banner.link)) return body;
  if (/^https?:\/\//i.test(banner.link)) {
    return <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block transition-transform hover:-translate-y-0.5">{body}</a>;
  }
  return <Link href={banner.link} className="block transition-transform hover:-translate-y-0.5">{body}</Link>;
}

function MarketCard({ page, onOffer }: { page: MarketPage; onOffer: (p: MarketPage) => void }) {
  const Icon = categoryIcon(page.category);
  const min = marketMinPrice(page);
  return (
    <Card className="flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <StoryRing size={54}>
          {page.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element -- uploaded avatar served by our API
            ? <img src={page.avatarUrl} alt="" className="size-full rounded-full object-cover" />
            : <Icon aria-hidden className="size-6" />}
        </StoryRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold text-navy-900">{page.title}</h3>
            {page.verified && <BadgeCheck aria-label="پیج تأییدشده" className="size-4 shrink-0 text-emerald-600" />}
          </div>
          <p dir="ltr" className="truncate text-start text-xs text-slate-500">{page.handle}</p>
          <p className="mt-1 text-xs text-slate-500">{categoryLabel(page.category)}{page.city ? ` · ${page.city}` : ""}</p>
        </div>
      </div>

      {page.bio && <p className="line-clamp-2 text-sm leading-6 text-slate-600">{page.bio}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Users aria-hidden className="size-3.5" />{formatNumber(page.followers)} فالوئر</span>
        {page.avgStoryViews > 0 && <span className="inline-flex items-center gap-1"><Eye aria-hidden className="size-3.5" />{formatNumber(page.avgStoryViews)} بازدید استوری</span>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {page.publishTypes.map((t) => (
          <Badge key={t} tone="info">{typeLabel(t)}: {formatToman(marketPrice(page, t))}</Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] text-slate-500">شروع از</p>
          <p className="font-extrabold text-navy-900">{formatToman(min)}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => onOffer(page)}><Send aria-hidden className="size-4" /> ارسال پیشنهاد</Button>
      </div>
    </Card>
  );
}

/**
 * دایرکتوری واقعی پیج‌ها از /api/market/pages (فقط APPROVED و دارای تعرفه).
 * بنر PAGES_TOP بالای همین بخش نمایش داده می‌شود.
 */
export function MarketPages() {
  const [pages, setPages] = useState<MarketPage[] | null>(null);
  const [error, setError] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [offerPage, setOfferPage] = useState<MarketPage | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/market/pages", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "خطا در دریافت پیج‌ها");
        return data as MarketPage[];
      })
      .then((data) => { if (alive) setPages(Array.isArray(data) ? data : []); })
      .catch((e: Error) => { if (alive) { setPages([]); setError(e.message); } });
    return () => { alive = false; };
  }, []);

  const list = useMemo(() => (cat === "all" || !pages ? pages ?? [] : pages.filter((p) => p.category === cat)), [pages, cat]);
  const chips: { value: CategoryId | "all"; label: string }[] = [{ value: "all", label: "همه" }, ...CATEGORIES];

  return (
    <section id="pages" className="scroll-mt-20 bg-mist">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-16">
        <PagesTopBanner />

        <SectionHeading
          title="پیج‌های تبلیغاتی"
          description="فقط پیج‌های تأییدشده با تعرفهٔ مشخص نمایش داده می‌شوند. با ارسال پیشنهاد، مبلغ از کیف پول شما بلوکه می‌شود و پس از تأیید نشر آزاد می‌گردد."
        />

        <CategoryFilter categories={chips} value={cat} onChange={(value) => setCat(value as CategoryId | "all")} />

        <p aria-live="polite" className="text-sm text-slate-500">
          {pages === null ? "در حال بارگذاری…" : `${formatNumber(list.length)} پیج در این دسته`}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {pages === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={SearchX} title="پیجی در این دسته نیست" description="دستهٔ دیگری را انتخاب کنید یا سراغ دستهٔ «همه» بروید.">
            <button type="button" onClick={() => setCat("all")} className={cn(buttonVariants({ variant: "outline" }))}>نمایش همهٔ پیج‌ها</button>
          </EmptyState>
        ) : (
          <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((p) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                  <MarketCard page={p} onOffer={setOfferPage} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        <div className="flex justify-center">
          <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "navy", size: "lg" }))}>ثبت کمپین و انتخاب خودکار پیج‌ها</Link>
        </div>
      </div>

      <OfferDialog page={offerPage} onClose={() => setOfferPage(null)} />
    </section>
  );
}
