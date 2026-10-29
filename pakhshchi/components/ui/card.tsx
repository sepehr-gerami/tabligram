import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: ComponentProps<"div">) => (
  <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-soft", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: ComponentProps<"h3">) => (
  <h3 className={cn("text-base font-bold text-navy-900", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: ComponentProps<"p">) => (
  <p className={cn("text-sm leading-6 text-slate-500", className)} {...p} />
);
export const CardContent = ({ className, ...p }: ComponentProps<"div">) => (
  <div className={cn("p-5 pt-2", className)} {...p} />
);
