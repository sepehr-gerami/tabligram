"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
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

export function HeroBanners({ className }: { className?: string }) {
  const [banners, setBanners] = useState<PublicBanner[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/banners?placement=HERO", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!alive) return;
        setBanners(Array.isArray(data) ? (data as PublicBanner[]) : []);
      })
      .catch(() => {
        if (alive) setBanners([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!banners || banners.length === 0) return null;

  return (
    <section
      aria-label="تبلیغات ویژه"
      className={cn("mt-8 grid gap-3", banners.length > 1 && "sm:grid-cols-2", className)}
    >
      {banners.map((banner) => {
        const image = banner.desktopImage ?? banner.mobileImage;
        const body = (
          <div className="group relative flex min-h-32 items-end overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur transition-shadow hover:shadow-lift">
            {image && (
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {image && (
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            )}
            <div className={cn("relative z-10 flex items-center gap-3 p-4", image ? "text-white" : "text-navy-900")}>
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  image ? "bg-white/15 text-white backdrop-blur" : "bg-brand-50 text-brand-600",
                )}
              >
                <Megaphone className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{banner.title}</span>
                {banner.description && (
                  <span className={cn("mt-0.5 line-clamp-2 block text-xs leading-5", image ? "text-white/85" : "text-slate-600")}>
                    {banner.description}
                  </span>
                )}
              </span>
            </div>
          </div>
        );

        if (!isSafeLink(banner.link)) return <div key={banner.id}>{body}</div>;

        return banner.link.startsWith("/") ? (
          <Link key={banner.id} href={banner.link} className="block">
            {body}
          </Link>
        ) : (
          <a key={banner.id} href={banner.link} target="_blank" rel="noopener noreferrer" className="block">
            {body}
          </a>
        );
      })}
    </section>
  );
}