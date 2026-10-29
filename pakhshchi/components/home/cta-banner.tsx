import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaBanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-navy-800 p-8 text-white md:flex-row md:items-center md:p-12" style={{ backgroundImage: "radial-gradient(circle at 12% 120%, rgba(214,41,118,.55), transparent 45%), radial-gradient(circle at 95% -20%, rgba(250,126,30,.45), transparent 40%), radial-gradient(circle at 60% 130%, rgba(79,91,213,.5), transparent 45%)" }}>
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">اولین سفارش تبلیغ‌تان را ثبت کنید</h2>
            <p className="leading-8 text-slate-300">فرم کوتاه است و پیش‌نمایش تبلیغ همان لحظه کنار آن دیده می‌شود. صاحب پیج هم می‌تواند پیج خود را برای دریافت سفارش ثبت کند.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/campaigns/new" className={cn(buttonVariants({ size: "lg" }), "bg-white text-navy-900 hover:bg-slate-100")}>ثبت تبلیغ جدید</Link>
            <Link href="/publisher/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/30 bg-transparent text-white hover:bg-white/10")}>ثبت پیج اینستاگرام</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
