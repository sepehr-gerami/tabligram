import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: number | string; hint?: string }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon aria-hidden className="size-6" /></span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-navy-900">{typeof value === "number" ? formatNumber(value) : value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}
