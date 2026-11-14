"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { isSafeLink } from "@/lib/banner-rules";
import { cn } from "@/lib/utils";

interface PublicBanner {
  id: string;
  title: string;
  description: string | null;
  link: string;
  desktopImage: string | null;
  mobileImage: string | null;
  placement: string;
  sortOrder: number;
}

const DURATION = 7000;

function BannerLink({ banner, className, children }: { banner: PublicBanner; className?: string; children: React.ReactNode }) {
  if (!isSafeLink(banner.link)) return <span className={className}>{children}</span>;
  if (/^https?:\/\//i.test(banner.link)) {
    return <a href={banner.link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link href={banner.link} className={className}>{children}</Link>;
}

/**
 * اسلایدر بنرهای واقعی صفحهٔ اصلی از دیتابیس (placement=HERO).
 * اگر هیچ بنر HERO فعالی نباشد، بنرهای PAGES_TOP نمایش داده می‌شوند تا تبلیغ ثبت‌شده بی‌استفاده نماند.
 */
export function HeroBannerCarousel({ className }: { className?: string }) {
  const [banners, setBanners] = useState<PublicBanner[] | null>(null);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const paused = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const heroRes = await fetch("/api/banners?placement=HERO", { cache: "no-store" });
        const hero = heroRes.ok ? ((await heroRes.json()) as PublicBanner[]) : [];
        if (Array.isArray(hero) && hero.length > 0) {
          if (alive) setBanners(hero);
          return;
        }
        const topRes = await fetch("/api/banners?placement=PAGES_TOP", { cache: "no-store" });
        const top = topRes.ok ? ((await topRes.json()) as PublicBanner[]) : [];
        if (alive) setBanners(Array.isArray(top) ? top : []);
      } catch {
        if (alive) setBanners([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const count = banners?.length ?? 0;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + Math.max(count, 1)) % Math.max(count, 1)), [count]);

  useEffect(() => {
    if (reduced || count < 2) return;
    const id = window.setInterval(() => { if (!paused.current) go(1); }, DURATION);
    return () => window.clearInterval(id);
  }, [count, go, reduced]);

  useEffect(() => {
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  if (banners === null) {
    return <div className={cn("h-[30rem] animate-pulse rounded-[2rem] bg-slate-100 md:h-[26rem]", className)} aria-label="در حال بارگذاری بنرها" />;
  }

  if (count === 0) {
    return (
      <section className={cn("relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1b3a78] via-[#2563eb] to-[#60a5fa] p-8 text-white shadow-lift md:p-12", className)}>
        <div aria-hidden className="absolute inset-0 opacity-15 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur"><Megaphone aria-hidden className="size-4" /> تبلیغ در تبلیگرام</p>
            <h2 className="text-2xl font-extrabold leading-snug md:text-3xl">این جایگاه منتظر تبلیغ شماست</h2>
            <p className="max-w-md text-sm leading-7 text-white/85">با ثبت کمپین، تبلیغ شما کنار پیج‌های مرتبط نمایش داده می‌شود.</p>
          </div>
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg" }), "bg-white text-navy-900 hover:bg-white/90")}>ثبت تبلیغ</Link>
        </div>
      </section>
    );
  }

  const banner = banners[Math.min(index, count - 1)];
  const image = banner.desktopImage ?? banner.mobileImage;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="تبلیغات ویژه"
      className={cn("relative h-[30rem] overflow-hidden rounded-[2rem] bg-navy-900 text-white shadow-lift ring-1 ring-black/5 md:h-[26rem]", className)}
      onPointerEnter={() => { paused.current = true; }}
      onPointerLeave={() => { paused.current = false; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(1);
        if (e.key === "ArrowRight") go(-1);
      }}
      tabIndex={0}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
          {image ? (
            // بنر تصویری متن و طرح خودش را دارد؛ overlay متنی روی آن تکرار نمی‌شود.
            <BannerLink banner={banner} className="block size-full">
              <picture>
                {banner.mobileImage && <source media="(max-width: 767px)" srcSet={banner.mobileImage} />}
                {/* eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own API */}
                <img src={image} alt={banner.title} className="size-full object-cover" />
              </picture>
            </BannerLink>
          ) : (
            <>
              <div className="size-full bg-gradient-to-l from-[#6d1a52] via-[#c42b78] to-[#f77737]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent md:bg-gradient-to-l md:from-black/70 md:via-black/15" />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {!image && (
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-3 p-6 pb-16 md:justify-center md:p-12 md:pb-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur"><Megaphone aria-hidden className="size-3.5" /> تبلیغ ویژه</span>
          <h2 className="text-balance text-2xl font-extrabold leading-snug md:text-3xl">{banner.title}</h2>
          {banner.description && <p className="line-clamp-2 max-w-lg text-sm leading-7 text-white/90 md:text-base md:leading-8">{banner.description}</p>}
          <BannerLink banner={banner} className={cn(buttonVariants({ size: "lg" }), "mt-1 w-fit gap-2 bg-white text-navy-900 hover:bg-white/90")}>
            مشاهده جزئیات <ExternalLink aria-hidden className="size-4" />
          </BannerLink>
        </div>
      )}

      {count > 1 && (
        <>
          <div className="absolute bottom-5 start-6 z-10 flex items-center gap-2 md:start-12">
            {banners.map((b, i) => (
              <button key={b.id} type="button" aria-label={`اسلاید ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70")} />
            ))}
          </div>
          <div className="absolute bottom-4 end-5 z-10 flex gap-2 md:end-10">
            <button type="button" aria-label="اسلاید بعدی" onClick={() => go(1)} className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/30"><ChevronLeft aria-hidden className="size-5" /></button>
            <button type="button" aria-label="اسلاید قبلی" onClick={() => go(-1)} className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/30"><ChevronRight aria-hidden className="size-5" /></button>
          </div>
        </>
      )}
    </section>
  );
}
