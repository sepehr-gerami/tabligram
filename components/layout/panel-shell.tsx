import Link from "next/link";
import type { ReactNode } from "react";
import { Home, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/misc";

export interface PanelNavItem { href: string; label: string; icon: LucideIcon }

export function PanelShell({ title, description, notice, nav, children }: { title: string; description: string; notice: string; nav: PanelNavItem[]; children: ReactNode }) {
  return (
    <div className="bg-mist">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:w-60 lg:shrink-0 lg:self-start">
          <nav aria-label={`منوی ${title}`} className="rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-3 lg:shadow-soft">
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {nav.map(({ href, label, icon: Icon }) => (
                <li key={href} className="shrink-0">
                  <a href={href} className="flex h-11 items-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 lg:border-transparent lg:bg-transparent">
                    <Icon aria-hidden className="size-4" />{label}
                  </a>
                </li>
              ))}
              <li className="hidden border-t border-slate-100 pt-2 lg:mt-2 lg:block">
                <Link href="/" className="flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm text-slate-500 hover:bg-slate-50"><Home aria-hidden className="size-4" />بازگشت به صفحهٔ اصلی</Link>
              </li>
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 flex-1 space-y-8">
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
            <p className="leading-7 text-slate-600">{description}</p>
            <Alert tone="info">{notice}</Alert>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
