"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { AuthDialog, type AuthMode } from "@/components/layout/auth-dialog";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "صفحهٔ اصلی" },
  { href: "/#how", label: "نحوهٔ کار" },
  { href: "/#pages", label: "پیج‌ها" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthMode | null>(null);
  const openAuth = (m: AuthMode) => { setOpen(false); setAuth(m); };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">پرش به محتوای اصلی</a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="منوی اصلی" className="ms-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900">{n.label}</Link>
          ))}
        </nav>
        <div className="ms-auto hidden items-center gap-2 lg:flex">
          <RoleSwitcher />
          <Button variant="ghost" onClick={() => openAuth("login")}>ورود</Button>
          <Button onClick={() => openAuth("register")}>ثبت‌نام</Button>
        </div>
        <Button variant="ghost" size="icon" className="ms-auto lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "بستن منو" : "باز کردن منو"} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div id="mobile-menu" className="space-y-4 border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
          <nav aria-label="منوی موبایل" className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium text-slate-700 hover:bg-slate-50">{n.label}</Link>
            ))}
          </nav>
          <div>
            <p className="mb-1.5 text-xs text-slate-500">نقش نمایشی (احراز هویت واقعی نیست؛ پنل مدیریت از این منو در دسترس نیست)</p>
            <RoleSwitcher className="flex w-full" onNavigate={() => setOpen(false)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => openAuth("login")}>ورود</Button>
            <Button size="lg" onClick={() => openAuth("register")}>ثبت‌نام</Button>
          </div>
          <Link href="/campaigns/new" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "navy", size: "lg" }), "w-full")}>ثبت تبلیغ جدید</Link>
        </div>
      )}
      <AuthDialog mode={auth} onClose={() => setAuth(null)} />
    </header>
  );
}
