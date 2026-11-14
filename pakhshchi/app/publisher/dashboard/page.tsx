import type { Metadata } from "next";
import { Inbox, Layers, LayoutDashboard, PlusCircle, Wallet } from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { AuthRequired } from "@/components/auth/require-auth";
import { PublisherDashboard } from "@/components/publisher/publisher-dashboard";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "پنل صاحبان پیج" };

const NAV = [
  { href: "#summary", label: "خلاصه", icon: LayoutDashboard },
  { href: "#register", label: "ثبت / ویرایش پیج", icon: PlusCircle },
  { href: "#my-pages", label: "پیج‌های من", icon: Layers },
  { href: "#offers", label: "درخواست‌های تبلیغ", icon: Inbox },
  { href: "#payout", label: "اطلاعات پرداخت", icon: Wallet },
];

export default async function PublisherDashboardPage() {
  // کنترل دسترسی سمت سرور: داده‌های پیج و درآمد فقط برای کاربر واردشده رندر می‌شود.
  const user = await getCurrentUser();

  return (
    <PanelShell
      title="پنل صاحبان پیج"
      description="پیج اینستاگرام خود را ثبت کنید، تعرفه‌ها را تعیین کنید و درخواست‌های تبلیغاتی را بپذیرید یا رد کنید."
      notice="پیج‌ها پس از تأیید مدیر در بازار نمایش داده می‌شوند. مبلغ سفارش از کیف پول تبلیغ‌دهنده بلوکه می‌شود و ۱۰٪ کمیسیون پلتفرم از آن کسر می‌گردد."
      nav={NAV}
    >
      {user ? (
        <PublisherDashboard />
      ) : (
        <AuthRequired
          title="برای ورود به پنل صاحب پیج وارد شوید"
          description="ثبت پیج و دریافت پیشنهاد تبلیغ نیازمند حساب واقعی است. وارد شوید یا ثبت‌نام کنید."
        />
      )}
    </PanelShell>
  );
}
