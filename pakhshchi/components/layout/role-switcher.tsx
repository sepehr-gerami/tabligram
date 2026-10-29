"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PUBLIC_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * Demo-only navigation between the public roles. It is not authentication.
 * The admin role is intentionally absent: the management panel is reached only through
 * server-side authenticated access, never from the public header.
 */
export function RoleSwitcher({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="جابه‌جایی میان نقش‌های نمایشی" title="نقش نمایشی؛ احراز هویت واقعی نیست" className={cn("inline-flex rounded-xl bg-slate-100 p-1", className)}>
      {PUBLIC_ROLES.map(({ id, label, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={id} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-navy-900")}>
            <Icon aria-hidden className="size-4" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
