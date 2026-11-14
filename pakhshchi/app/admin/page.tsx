import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3, CreditCard, FileImage, Image as ImageIcon, Layers, Megaphone,
  ShieldAlert, Users, Wallet,
} from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "پنل مدیریت" };

const NAV = [
  { href: "#overview", label: "نمای کلی", icon: BarChart3 },
  { href: "#deposits", label: "واریزها", icon: Wallet },
  { href: "#pages", label: "پیج‌ها", icon: Layers },
  { href: "#publishers", label: "کارت‌های پرداخت", icon: CreditCard },
  { href: "#payouts", label: "تسویه‌ها", icon: Wallet },
  { href: "#disputes", label: "اختلاف‌ها", icon: ShieldAlert },
  { href: "#campaigns", label: "کمپین‌ها", icon: Megaphone },
  { href: "#orders", label: "سفارش‌ها", icon: FileImage },
  { href: "/admin/banners", label: "بنرها", icon: ImageIcon },
];

export default async function AdminPage() {
  // کنترل دسترسی سمت سرور: فقط ادمین واقعی (نقش ADMIN در دیتابیس) این صفحه را می‌بیند.
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  return (
    <PanelShell
      title="پنل مدیریت"
      description="بررسی واریزها و پیج‌ها، تأیید کارت صاحبان پیج، تسویهٔ سفارش‌ها و رسیدگی به اختلاف‌ها."
      notice="همهٔ بخش‌های این صفحه به دادهٔ واقعی دیتابیس متصل هستند. عملیات مالی فقط پس از تأیید کارت و پایان مهلت قانونی فعال می‌شود."
      nav={NAV}
    >
      <AdminDashboard />
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Users className="size-5 shrink-0 text-brand-700" />
        <span>مدیریت بنرهای صفحهٔ اصلی از صفحهٔ مستقل <a className="font-bold text-brand-700 underline" href="/admin/banners">مدیریت بنرها</a> انجام می‌شود.</span>
      </div>
    </PanelShell>
  );
}
