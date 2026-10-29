"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelNavLinkProps {
  href: string;
  label: string;
  children: ReactNode;
}

export function PanelNavLink({
  href,
  label,
  children,
}: PanelNavLinkProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // مسیر فعلی و زیرمسیرهای آن را فعال تشخیص می‌دهیم.
  const isActive =
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative isolate flex h-[54px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl border px-3.5 sm:px-4",
        "text-sm font-semibold outline-none",
        "transition-[border-color,background-color,box-shadow,color] duration-300",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        isActive
          ? "border-brand-500/20 bg-gradient-to-l from-brand-600 via-brand-600 to-blue-700 text-white shadow-[0_8px_24px_-10px_rgba(37,99,235,0.65)]"
          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200/80 hover:bg-white hover:text-slate-950 hover:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.2)]"
      )}
    >
      {/* نور ملایم در پس‌زمینه آیتم فعال */}
      {isActive && (
        <motion.span
          layoutId="panel-nav-background"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 350, damping: 32 }
          }
        >
          <span className="absolute -right-8 -top-12 size-28 rounded-full bg-white/15 blur-2xl" />
          <span className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5" />
        </motion.span>
      )}

      {/* نشانگر عمودی صفحه فعال */}
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0,
          scaleY: isActive ? 1 : 0.5,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 30 }
        }
        className="absolute right-0 top-3 bottom-3 w-[3px] origin-center rounded-l-full bg-white"
      />

      {/* کادر آیکون */}
      <motion.span
        initial={false}
        animate={{
          scale: isActive ? 1 : 1,
          rotate: 0,
        }}
        whileHover={
          reduceMotion ? undefined : { scale: 1.06, rotate: -3 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 20 }
        }
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl",
          "transition-[background-color,color,box-shadow] duration-300",
          isActive
            ? "bg-white/15 text-white shadow-inner ring-1 ring-inset ring-white/15"
            : "bg-slate-100/80 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
        )}
      >
        <span className="relative z-10 [&_svg]:size-[18px] [&_svg]:shrink-0">
          {children}
        </span>
      </motion.span>

      {/* عنوان لینک */}
      <span className="relative min-w-0 flex-1 truncate">{label}</span>

      {/* نشانگر کوچک صفحه فعال */}
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        {isActive ? (
          <motion.span
            layoutId="panel-nav-status"
            initial={false}
            className="size-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 450, damping: 30 }
            }
          />
        ) : (
          <span className="size-1 rounded-full bg-slate-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        )}
      </span>
    </Link>
  );
}