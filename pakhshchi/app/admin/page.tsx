import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Clock, Layers, Megaphone, Wallet, ArrowLeft } from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { AdminStats } from "@/components/admin/admin-stats";
import { StatusChart } from "@/components/admin/status-chart";
import { CampaignTable } from "@/components/admin/campaign-table";
import { PagesTable } from "@/components/admin/pages-table";
import { RecentOrders } from "@/components/admin/recent-orders";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "پنل مدیریت" };

const NAV = [
  { href: "#overview", label: "نمای کلی", icon: BarChart3 },
  { href: "#campaigns", label: "کمپین‌ها", icon: Megaphone },
  { href: "#pages", label: "پیج‌ها", icon: Layers },
  { href: "#recent", label: "سفارش‌های اخیر", icon: Clock },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  return (
    <PanelShell 
      title="پنل مدیریت" 
      description="به مرکز فرماندهی تبلیگرام خوش آمدید. تمام وضعیت‌های مالی، کمپین‌ها و پیج‌ها را از اینجا کنترل کنید."
      notice="دسترسی به این صفحه فقط برای مدیر مجاز است. سیستم به صورت زنده در حال پایش تراکنش‌ها و سفارش‌هاست."
      nav={NAV}
    >
      <div className="space-y-10 pb-20" dir="rtl">
        
        {/* بخش ۱: نمای کلی و آمار */}
        <section id="overview" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">نمای کلی سیستم</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              آخرین بروزرسانی: همین الان
            </span>
          </div>
          {/* کارت‌های آمار با گرید ریسپانسیو */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <AdminStats />
          </div>
          
          {/* بخش پرداخت‌ها (بسیار مهم) */}
          <div className="mt-6 bg-gradient-to-l from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">مدیریت پرداخت‌های صاحبان پیج</h3>
                <p className="text-sm text-gray-600 mt-1">سفارش‌هایی که آماده تسویه حساب هستند را بررسی و واریز کنید.</p>
              </div>
            </div>
            <Link 
              href="/admin/payouts" 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md w-full md:w-auto justify-center"
            >
              ورود به بخش پرداخت‌ها
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <div className="mt-6 bg-white border rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold text-gray-800 mb-6">وضعیت سفارش‌ها</h3>
             <StatusChart />
          </div>
        </section>

        {/* بخش ۲: کمپین‌ها */}
        <section id="campaigns" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">کمپین‌ها</h2>
          </div>
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <CampaignTable />
          </div>
        </section>

        {/* بخش ۳: پیج‌ها */}
        <section id="pages" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">پیج‌های ثبت‌شده</h2>
            <p className="text-sm text-gray-500">جهت تأیید یا رد، پیج‌های جدید را بررسی کنید.</p>
          </div>
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <PagesTable />
          </div>
        </section>

        {/* بخش ۴: سفارش‌های اخیر */}
        <section id="recent" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">سفارش‌های اخیر</h2>
          </div>
          <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <RecentOrders />
          </div>
        </section>

      </div>
    </PanelShell>
  );
}