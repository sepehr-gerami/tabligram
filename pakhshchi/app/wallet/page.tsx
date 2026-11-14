import type { Metadata } from "next";
import { AuthRequired } from "@/components/auth/require-auth";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "کیف پول" };

export default async function WalletPage() {
  const user = await getCurrentUser();
  return (
    <div className="bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <div className="mb-6 max-w-2xl space-y-2">
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">کیف پول</h1>
          <p className="leading-8 text-slate-600">واریز کارت‌به‌کارت، موجودی قابل استفاده و بلوکه‌های سفارش‌های تبلیغاتی.</p>
        </div>
        {user ? (
          <WalletPanel />
        ) : (
          <AuthRequired
            title="برای مشاهدهٔ کیف پول وارد شوید"
            description="موجودی، واریزها و بلوکه‌های مالی فقط برای صاحب حساب قابل مشاهده است."
          />
        )}
      </div>
    </div>
  );
}
