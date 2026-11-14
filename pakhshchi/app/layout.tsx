import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "تبلیگرام | یک تبلیغ، چندین پیج اینستاگرام", template: "%s | تبلیگرام" },
  description: "تبلیگرام تبلیغ‌دهنده‌ها را به صاحبان پیج‌های اینستاگرام وصل می‌کند؛ بودجه بلوکه می‌شود و پرداخت پس از تأیید انجام می‌گیرد.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563eb" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col">
        <Providers
          user={
            user
              ? {
                  id: user.id,
                  name: user.name,
                  mobile: user.mobile,
                  isAdmin: user.isAdmin,
                  isAdvertiser: user.isAdvertiser,
                  isPublisher: user.isPublisher,
                }
              : null
          }
        >
          <SiteHeader />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
