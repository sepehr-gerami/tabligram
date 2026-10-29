import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ResetDemoButton } from "@/components/layout/reset-demo-button";

const COLS = [
  { title: "پخش‌چی", links: [{ href: "/", label: "صفحهٔ اصلی" }, { href: "/#how", label: "نحوهٔ کار" }, { href: "/#pages", label: "پیج‌های تبلیغاتی" }] },
  // Only public panels are linked here. The management panel (/admin) is deliberately not listed:
  // it must be reached through authenticated, server-side access only.
  { title: "پنل‌های نمایشی", links: [{ href: "/campaigns/new", label: "ثبت تبلیغ جدید" }, { href: "/publisher/dashboard", label: "پنل صاحبان پیج" }] },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm leading-7">یک تبلیغ، چندین پیج اینستاگرام. سفارش را یک‌بار ثبت کنید و انتشار را در یک جا دنبال کنید.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="mb-3 font-bold text-white">{c.title}</p>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs leading-6 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>نسخهٔ نمایشی: داده‌ها نمونه‌اند و پرداخت، ورود واقعی یا اتصال به اینستاگرام وجود ندارد.</p>
          <ResetDemoButton />
        </div>
      </div>
    </footer>
  );
}
