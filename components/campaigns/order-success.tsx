"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OrderSuccess({ orderNumber, title, onNew }: { orderNumber: string; title: string; onNew: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="mx-auto max-w-xl space-y-5 p-8 text-center" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 aria-hidden className="size-9" /></span>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-navy-900">سفارش شما ثبت شد</h2>
          <p className="leading-8 text-slate-600">سفارش «{title}» در وضعیت «در انتظار بررسی» قرار گرفت. این یک ثبت نمونه است و پرداختی انجام نشده.</p>
        </div>
        <div className="rounded-xl bg-mist p-4">
          <p className="text-sm text-slate-500">شمارهٔ نمونهٔ سفارش</p>
          <p dir="ltr" className="text-2xl font-extrabold tracking-wide text-brand-700">{orderNumber}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/admin" className={cn(buttonVariants({ size: "lg" }))}>مشاهده در پنل مدیریت (نمونه)</Link>
          <Button variant="outline" size="lg" onClick={onNew}>ثبت سفارش دیگر</Button>
        </div>
      </Card>
    </motion.div>
  );
}
