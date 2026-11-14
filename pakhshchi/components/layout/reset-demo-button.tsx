"use client";

import { RotateCcw } from "lucide-react";
import { useStore } from "@/components/shared/store";
import { useToast } from "@/components/ui/toast";

export function ResetDemoButton() {
  const { reset } = useStore();
  const toast = useToast();
  return (
    <button type="button" onClick={() => { reset(); toast({ tone: "info", title: "داده‌های نمونه بازنشانی شد" }); }}
      className="inline-flex items-center gap-1.5 text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline">
      <RotateCcw aria-hidden className="size-3.5" />بازنشانی داده‌های نمونه
    </button>
  );
}
