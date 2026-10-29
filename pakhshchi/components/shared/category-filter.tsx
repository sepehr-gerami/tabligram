"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryFilterItem {
  value: string;
  label: string;
}

interface CategoryFilterProps {
  categories: CategoryFilterItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function CategoryFilter({
  categories,
  value,
  onChange,
  label = "فیلتر دسته‌بندی",
  className,
}: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("relative", className)}
    >
      <div className="flex items-center gap-2.5 overflow-x-auto px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const active = value === category.value;
          const isAll = category.value === "all";

          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(category.value)}
              className={cn(
                "group relative isolate inline-flex h-12 shrink-0 items-center gap-2.5 overflow-hidden rounded-2xl border px-5",
                "text-sm font-semibold",
                "transition-[border-color,background-color,color,box-shadow,transform] duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                "active:scale-[0.97]",
                active
                  ? "border-brand-600 bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-600/25"
                  : "border-slate-200/80 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
              )}
            >
              {active && (
                <motion.span
                  layoutId="category-glow"
                  className="pointer-events-none absolute -right-5 -top-7 -z-10 size-20 rounded-full bg-white/15 blur-2xl"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 32,
                  }}
                />
              )}

              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg transition-colors duration-200",
                  active
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
                )}
              >
                {isAll ? (
                  <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Megaphone size={16} strokeWidth={1.8} aria-hidden="true" />
                )}
              </span>

              <span>{category.label}</span>

              {active && (
                <motion.span
                  layoutId="category-active-dot"
                  className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 30,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
