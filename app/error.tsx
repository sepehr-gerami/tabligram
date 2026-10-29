"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={AlertTriangle} title="مشکلی در نمایش این صفحه پیش آمد" description="دوباره تلاش کنید. اگر مشکل ادامه داشت، از «بازنشانی داده‌های نمونه» در پایین صفحه استفاده کنید.">
        <Button onClick={reset}>تلاش دوباره</Button>
      </EmptyState>
    </div>
  );
}
