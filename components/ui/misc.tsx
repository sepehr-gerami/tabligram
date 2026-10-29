import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...p }: ComponentProps<"div">) => (
  <div aria-hidden className={cn("animate-pulse rounded-xl bg-slate-100", className)} {...p} />
);

export function EmptyState({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-mist px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon aria-hidden className="size-6" /></span>
      <p className="mt-1 font-bold text-navy-900">{title}</p>
      {description && <p className="max-w-sm text-sm leading-6 text-slate-500">{description}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

const alertStyle = {
  info: { box: "border-brand-100 bg-brand-50 text-brand-800", Icon: Info },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
};

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof alertStyle; children: ReactNode; className?: string }) {
  const { box, Icon } = alertStyle[tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-6", box, className)}>
      <Icon aria-hidden className="mt-1 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function SectionHeading({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl space-y-3", className)}>
      <h2 className="text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">{title}</h2>
      {description && <p className="leading-8 text-slate-600">{description}</p>}
    </div>
  );
}
