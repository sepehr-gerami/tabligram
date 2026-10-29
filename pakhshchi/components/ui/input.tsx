import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-100 disabled:bg-slate-50";

export const Input = ({ className, ...p }: ComponentProps<"input">) => (
  <input className={cn(base, "h-12", className)} {...p} />
);

export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => (
  <textarea className={cn(base, "min-h-28 resize-y py-3 leading-7", className)} {...p} />
);

export function Select({ className, children, ...p }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(base, "h-12 appearance-none ps-10", className)} {...p}>{children}</select>
      <ChevronDown aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
