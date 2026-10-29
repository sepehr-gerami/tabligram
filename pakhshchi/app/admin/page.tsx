import type { Metadata } from "next";
import { BarChart3, Clock, Layers, Megaphone } from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { Section } from "@/components/shared/section";
import { AdminStats } from "@/components/admin/admin-stats";
import { StatusChart } from "@/components/admin/status-chart";
import { CampaignTable } from "@/components/admin/campaign-table";
import { PagesTable } from "@/components/admin/pages-table";
import { RecentOrders } from "@/components/admin/recent-orders";

export const metadata: Metadata = { title: "پنل مدیریت" };

const NAV = [
  { href: "#overview", label: "نمای کلی", icon: BarChart3 },
  { href: "#campaigns", label: "کمپین‌ها", icon: Megaphone },
  { href: "#pages", label: "پیج‌ها", icon: Layers },
  { href: "#recent", label: "سفارش‌های اخیر", icon: Clock },
];

export default function AdminPage() {
  return (
    <PanelShell title="پنل مدیریت" description="سفارش‌ها را بررسی کنید، پیج‌های مناسب را انتخاب کنید و وضعیت انتشار را دنبال کنید."
      notice="این پنل فقط نمونهٔ فرانت‌اند است؛ سیستم امنیتی یا کنترل دسترسی واقعی ندارد و هر کسی با باز کردن آدرس آن را می‌بیند." nav={NAV}>
      <Section id="overview" title="نمای کلی">
        <div className="space-y-4"><AdminStats /><StatusChart /></div>
      </Section>
      <Section id="campaigns" title="کمپین‌ها" description="برای انتخاب پیج، ثبت مدرک انتشار و تغییر وضعیت، جزئیات کمپین را باز کنید."><CampaignTable /></Section>
      <Section id="pages" title="پیج‌های ثبت‌شده" description="پیج‌های ثبت‌شده در پنل صاحبان پیج اینجا برای تأیید یا رد دیده می‌شوند."><PagesTable /></Section>
      <Section id="recent" title="سفارش‌های اخیر"><RecentOrders /></Section>
    </PanelShell>
  );
}
