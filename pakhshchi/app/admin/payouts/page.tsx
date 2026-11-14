import { redirect } from "next/navigation";

/**
 * صفحهٔ قدیمی پرداخت‌ها حذف شده است؛ تسویه‌ها اکنون بخشی از داشبورد مدیریت است.
 * این مسیر برای لینک‌های قدیمی نگه داشته شده و مستقیم به همان بخش می‌رود.
 */
export default function AdminPayoutsPage() {
  redirect("/admin#payouts");
}
