import type { Metadata } from "next";
import { ImagePlus, Inbox, Layers, LayoutDashboard, PlusCircle } from "lucide-react";
import { PanelShell } from "@/components/layout/panel-shell";
import { Section } from "@/components/shared/section";
import { SummaryCards } from "@/components/publisher/summary-cards";
import { PageForm } from "@/components/publisher/page-form";
import { PageList } from "@/components/publisher/page-list";
import { OfferList } from "@/components/publisher/offer-list";
import { StoryManager } from "@/components/publisher/story-manager";

export const metadata: Metadata = { title: "پنل صاحبان پیج" };

const NAV = [
  { href: "#summary", label: "خلاصه", icon: LayoutDashboard },
  { href: "#register", label: "ثبت پیج", icon: PlusCircle },
  { href: "#my-pages", label: "پیج‌های من", icon: Layers },
  { href: "#stories", label: "استوری‌ها", icon: ImagePlus },
  { href: "#offers", label: "پیشنهادها", icon: Inbox },
];

export default function PublisherDashboardPage() {
  return (
    <PanelShell title="پنل صاحبان پیج" description="پیج اینستاگرام خود را ثبت کنید و پیشنهادهای تبلیغاتی را بپذیرید یا رد کنید."
      notice="نقش «صاحب پیج» نمایشی است و ورود واقعی وجود ندارد. داده‌ها فقط در همین مرورگر ذخیره می‌شوند و آمار واردشده توسط صاحب پیج تأیید اینستاگرام نیست." nav={NAV}>
      <Section id="summary" title="خلاصه"><SummaryCards /></Section>
      <Section id="register" title="ثبت پیج اینستاگرام" description="بعد از ثبت، پیج در وضعیت «در انتظار تأیید» قرار می‌گیرد تا مدیر آن را بررسی کند. هر حساب حداکثر ۵ پیج می‌تواند ثبت کند."><PageForm /></Section>
      <Section id="my-pages" title="پیج‌های من"><PageList /></Section>
      <Section id="stories" title="مدیریت استوری‌ها" description="استوری به یکی از پیج‌های شما تعلق دارد و ۲۴ ساعت پس از ثبت منقضی می‌شود."><StoryManager /></Section>
      <Section id="offers" title="پیشنهادهای تبلیغاتی"><OfferList /></Section>
    </PanelShell>
  );
}
