import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  BarChart3, CreditCard, Image as ImageIcon, Layers, Megaphone,
  ShieldAlert, Wallet,
} from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { BannersManager } from "@/components/admin/banners-manager";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "مدیریت بنرها" };

const NAV = [
  { href: "/admin#overview", label: "نمای کلی", icon: BarChart3 },
  { href: "/admin#deposits", label: "واریزها", icon: Wallet },
  { href: "/admin#pages", label: "پیج‌ها", icon: Layers },
  { href: "/admin#publishers", label: "کارت‌های پرداخت", icon: CreditCard },
  { href: "/admin#disputes", label: "اختلاف‌ها", icon: ShieldAlert },
  { href: "/admin#campaigns", label: "کمپین‌ها", icon: Megaphone },
  { href: "/admin/banners", label: "بنرها", icon: ImageIcon },
];

export default async function AdminBannersPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  return (
    <PanelShell
      title="مدیریت بنرها"
      description="بنرهای صفحهٔ اصلی و جایگاه‌های دیگر سایت را از اینجا ثبت، فعال یا حذف کنید."
      notice="فقط بنرهای فعال و در بازهٔ زمانی، به بازدیدکنندگان نمایش داده می‌شوند."
      nav={NAV}
    >
      <BannersManager />
    </PanelShell>
  );
}