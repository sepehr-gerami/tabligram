"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { AuthDialog, type AuthMode } from "@/components/layout/auth-dialog";
import { cn } from "@/lib/utils";
import { ScrollHeader } from "../ui/scroll-header";

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
<ScrollHeader>
  <header className="top-0 z-40">
<Link
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
>
  پرش به محتوای اصلی
</Link>

    <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
      <nav
        aria-label="منوی اصلی"
        className="ms-4 hidden items-center gap-1 lg:flex"
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* همبرگری در جای قبلی لوگو */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "بستن منو" : "باز کردن منو"}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X /> : <Menu />}
      </Button>

      {/* لوگو در جای قبلی همبرگری */}
      <div className="ms-auto lg:ms-0">
        <Logo />
      </div>

      <div className="ms-auto hidden items-center gap-2 lg:flex">
        <RoleSwitcher />
        <Button variant="ghost" onClick={() => openAuth("login")}>
          ورود
        </Button>
        <Button onClick={() => openAuth("register")}>
          ثبت‌نام
        </Button>
      </div>
    </div>

    {/* سایدبار موبایل */}
    <div
      id="mobile-menu"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "absolute inset-x-0 top-[66px] rounded-3xl z-50 space-y-4 border-t border-slate-100 bg-white px-4 py-4 shadow-lg lg:hidden",
        "origin-top transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none",
        open
          ? "visible translate-y-0 scale-y-100 opacity-100"
          : "invisible -translate-y-2 scale-y-[0.98] opacity-0 pointer-events-none"
      )}
    >
      <nav aria-label="منوی موبایل" className="flex flex-col">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div>
        <p className="mb-1.5 text-xs text-slate-500">
          نقش نمایشی (احراز هویت واقعی نیست؛ پنل مدیریت از این منو در دسترس نیست)
        </p>
        <RoleSwitcher
          className="flex w-full"
          onNavigate={() => setOpen(false)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => openAuth("login")}
        >
          ورود
        </Button>
        <Button size="lg" onClick={() => openAuth("register")}>
          ثبت‌نام
        </Button>
      </div>

      <Link
        href="/campaigns/new"
        onClick={() => setOpen(false)}
        className={cn(
          buttonVariants({ variant: "navy", size: "lg" }),
          "w-full"
        )}
      >
        ثبت تبلیغ جدید
      </Link>
    </div>

    <AuthDialog mode={auth} onClose={() => setAuth(null)} />
  </header>
</ScrollHeader>
  );
}