import { BarChart3, Clock, SlidersHorizontal, Target } from "lucide-react";
import { SectionHeading } from "@/components/ui/misc";

const ITEMS = [
  { icon: Clock, title: "صرفه‌جویی در زمان", text: "به‌جای هماهنگی جداگانه با هر پیج، یک سفارش ثبت می‌کنید و بقیهٔ مراحل در پلتفرم انجام می‌شود." },
  { icon: Target, title: "دسترسی به پیج‌های مرتبط", text: "پیج‌ها بر اساس دسته‌بندی، شهر و نوع انتشار انتخاب می‌شوند تا تبلیغ به مخاطب درست برسد." },
  { icon: BarChart3, title: "پیگیری انتشار", text: "وضعیت انتشار هر پیج و لینک مدرک آن را در همان سفارش می‌بینید." },
  { icon: SlidersHorizontal, title: "مدیریت ساده", text: "بودجه، تعداد انتشار و نوع محتوا کنار هم جمع می‌شود و تغییر وضعیت‌ها شفاف است." },
];

export function Benefits() {
  return (
    <section className="bg-mist">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-16">
        <SectionHeading title="چرا تبلیگرام؟" description="هدف این است که ثبت و پیگیری تبلیغ اینستاگرامی از چند گفت‌وگوی پراکنده به یک مسیر روشن تبدیل شود." />
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 border-t border-slate-200 pt-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-soft"><Icon aria-hidden className="size-6" /></span>
              <div>
                <dt className="font-bold text-navy-900">{title}</dt>
                <dd className="mt-1.5 leading-8 text-slate-600">{text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
