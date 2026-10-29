import Link from "next/link";
import type { ReactNode } from "react";
import { Home, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { PanelNavLink } from "@/components/layout/PanelNavLink";

export interface PanelNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface PanelShellProps {
  title: string;
  description: string;
  notice: string;
  nav: PanelNavItem[];
  children: ReactNode;
}

export function PanelShell({
  title,
  description,
  notice,
  nav,
  children,
}: PanelShellProps) {
  return (
    <div className="bg-mist">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:py-10">
        {/* ناوبری پنل؛ در موبایل افقی و در دسکتاپ عمودی */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:w-64 lg:shrink-0 lg:self-start">
          <nav
            aria-label={`منوی ${title}`}
            className="relative rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-3 lg:shadow-soft"
          >
            <p className="mb-1 hidden px-2 pt-1 text-xs font-bold text-slate-400 lg:block">
              فضای کاری
            </p>

            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {nav.map(({ href, label, icon: Icon }) => (
                <li key={href} className="shrink-0">
                  <PanelNavLink href={href} label={label}>
                    <Icon className="size-4" strokeWidth={2} />
                  </PanelNavLink>
                </li>
              ))}

              <li className="hidden border-t border-slate-100 pt-3 lg:mt-2 lg:block">
                <Link
                  href="/"
                  className="group flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-slate-200">
                    <Home className="size-4" aria-hidden="true" />
                  </span>
                  بازگشت به صفحه اصلی
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* محتوای اصلی پنل */}
        <main className="min-w-0 flex-1 space-y-8">
          <header className="space-y-3">
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
              {title}
            </h1>

            <p className="leading-7 text-slate-600">{description}</p>

            <Alert tone="info">{notice}</Alert>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}