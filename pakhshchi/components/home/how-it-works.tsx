"use client";

import { MotionConfig, motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

const STEPS = [
  { title: "ثبت سفارش", text: "عنوان تبلیغ، بودجه، نوع انتشار و دستهٔ پیج‌های موردنظر را در یک فرم کوتاه وارد می‌کنید." },
  { title: "انتخاب پیج‌ها", text: "مدیر پلتفرم پیج‌های مناسب را برای سفارش انتخاب می‌کند و صاحب پیج می‌تواند پیشنهاد را بپذیرد یا رد کند." },
  { title: "انتشار و گزارش", text: "پیج‌ها تبلیغ را منتشر می‌کنند و لینک مدرک هر انتشار در سفارش شما ثبت می‌شود." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-white">
      <MotionConfig reducedMotion="user">
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-16">
          <SectionHeading title="چطور کار می‌کند؟" description="سه مرحله از ثبت سفارش تا دریافت گزارش انتشار." />
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} className="relative space-y-3" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.15, duration: 0.55 }}>
                <div className="flex items-center gap-3">
                  <motion.span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white" initial={{ scale: 0.6 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: i * 0.15 }}>
                    {formatNumber(i + 1)}
                  </motion.span>
                  {i < STEPS.length - 1 && (
                    <motion.span aria-hidden className="hidden h-px flex-1 origin-right border-t-2 border-dashed border-brand-200 md:block" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 + 0.3, duration: 0.6 }} />
                  )}
                </div>
                <h3 className="text-lg font-bold text-navy-900">{s.title}</h3>
                <p className="leading-8 text-slate-600">{s.text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </MotionConfig>
    </section>
  );
}
