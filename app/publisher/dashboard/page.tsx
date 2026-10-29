import type { Metadata } from "next";
import { Inbox, Layers, LayoutDashboard, PlusCircle } from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { Section } from "@/components/shared/section";
import { SummaryCards } from "@/components/publisher/summary-cards";
import { PageForm } from "@/components/publisher/page-form";
import { PageList } from "@/components/publisher/page-list";
import { OfferList } from "@/components/publisher/offer-list";

export const metadata: Metadata = { title: "پنل صاحبان پیج" };

const NAV = [
  { href: "#summary", label: "خلاصه", icon: LayoutDashboard },
  { href: "#register", label: "ثبت پیج", icon: PlusCircle },
  { href: "#my-pages", label: "پیج‌های من", icon: Layers },
  { href: "#offers", label: "پیشنهادها", icon: Inbox },
];

export default function PublisherDashboardPage() {
  return (
    <PanelShell title="پنل صاحبان پیج" description="پیج اینستاگرام خود را ثبت کنید و پیشنهادهای تبلیغاتی را بپذیرید یا رد کنید."
      notice="نقش «صاحب پیج» نمایشی است و ورود واقعی وجود ندارد. تعداد فالوئر و مبلغ‌ها نمونه‌اند و تأییدشدهٔ واقعی نیستند." nav={NAV}>
      <Section id="summary" title="خلاصه"><SummaryCards /></Section>
      <Section id="register" title="ثبت پیج اینستاگرام" description="بعد از ثبت، پیج در وضعیت «در انتظار تأیید» قرار می‌گیرد تا مدیر آن را بررسی کند."><PageForm /></Section>
      <Section id="my-pages" title="پیج‌های من"><PageList /></Section>
      <Section id="offers" title="پیشنهادهای تبلیغاتی"><OfferList /></Section>
    </PanelShell>
  );
}
