"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { useSession } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { ScrollHeader } from "../ui/scroll-header";

const NAV = [
  { href: "/", label: "صفحهٔ اصلی" },
  { href: "/#how", label: "نحوهٔ کار" },
  { href: "/#pages", label: "پیج‌ها" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, openAuth, logout } = useSession();
  const close = () => setOpen(false);

  return (
    <ScrollHeader>
      <div className="top-0 z-40">
        <Link
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          پرش به محتوای اصلی
        </Link>

        <div dir="ltr" className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <div className="shrink-0">
            <Logo />
          </div>

          <nav aria-label="منوی اصلی" className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-900">
                {n.label}
              </Link>
            ))}
          </nav>

          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "بستن منو" : "باز کردن منو"} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </Button>

          <div dir="rtl" className="ml-auto hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <span className="max-w-40 truncate px-2 text-sm font-semibold text-navy-900" title={user.name}>{user.name}</span>
                <Link href="/wallet" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
                  <Wallet aria-hidden className="size-4" /> کیف پول
                </Link>
                <Link href="/publisher/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>پنل صاحب پیج</Link>
                {user.isAdmin && (
                  <Link href="/admin" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-brand-700")}>
                    <ShieldCheck aria-hidden className="size-4" /> مدیریت
                  </Link>
                )}
                <Link href="/campaigns/new" className={buttonVariants({ size: "sm" })}>ثبت تبلیغ</Link>
                <Button variant="ghost" size="icon" aria-label="خروج از حساب" title="خروج" onClick={() => void logout()}>
                  <LogOut aria-hidden className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => openAuth("login")}>ورود</Button>
                <Button onClick={() => openAuth("register")}>ثبت‌نام</Button>
                <Link href="/campaigns/new" className={buttonVariants({ variant: "navy" })}>ثبت تبلیغ</Link>
              </>
            )}
          </div>
        </div>

        <div
          id="mobile-menu"
          aria-hidden={!open}
          inert={!open}
          className={cn(
            "absolute inset-x-0 top-[66px] z-50 space-y-4 rounded-3xl border-t border-slate-100 bg-white px-4 py-4 shadow-lg lg:hidden",
            "origin-top transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none",
            open ? "visible translate-y-0 scale-y-100 opacity-100" : "invisible -translate-y-2 scale-y-[0.98] opacity-0 pointer-events-none",
          )}
        >
          <nav aria-label="منوی موبایل" className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={close} className="rounded-xl px-3 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50">
                {n.label}
              </Link>
            ))}
            {user && (
              <>
                <Link href="/wallet" onClick={close} className="rounded-xl px-3 py-3 font-medium text-slate-700 hover:bg-slate-50">کیف پول</Link>
                <Link href="/publisher/dashboard" onClick={close} className="rounded-xl px-3 py-3 font-medium text-slate-700 hover:bg-slate-50">پنل صاحب پیج</Link>
                {user.isAdmin && <Link href="/admin" onClick={close} className="rounded-xl px-3 py-3 font-medium text-brand-700 hover:bg-brand-50">پنل مدیریت</Link>}
              </>
            )}
          </nav>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            {user ? (
              <>
                <Link href="/campaigns/new" onClick={close} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}>ثبت تبلیغ جدید</Link>
                <Button variant="outline" className="h-12 w-full" onClick={() => { close(); void logout(); }}>خروج از حساب</Button>
              </>
            ) : (
              <>
                <Button size="lg" className="h-12 w-full" onClick={() => { close(); openAuth("register"); }}>ثبت‌نام و ثبت تبلیغ</Button>
                <p className="text-center text-sm text-slate-500">
                  قبلاً حساب داری؟
                  <button type="button" onClick={() => { close(); openAuth("login"); }} className="ms-1 font-semibold text-navy-900 hover:underline">ورود به حساب</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </ScrollHeader>
  );
}
