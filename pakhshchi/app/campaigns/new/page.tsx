import type { Metadata } from "next";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { MyOrders } from "@/components/campaigns/my-orders";
import { AuthRequired } from "@/components/auth/require-auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ثبت تبلیغ جدید" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialPageId = Array.isArray(params.page) ? params.page[0] : params.page;
  // کنترل دسترسی سمت سرور: بدون سشن معتبر، فرم و داده‌های مالی اصلاً رندر نمی‌شوند.
  const user = await getCurrentUser();

  return (
    <div className="bg-mist">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:py-12">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">ثبت تبلیغ جدید</h1>
          <p className="leading-8 text-slate-600">
            اطلاعات تبلیغ را وارد کنید؛ بودجه از کیف پول تأییدشده بلوکه می‌شود و درخواست‌ها برای پیج‌های واجد شرایط ارسال می‌گردد.
          </p>
        </div>

        {user ? (
          <>
            <CampaignForm initialPageId={initialPageId} />
            <MyOrders />
          </>
        ) : (
          <AuthRequired
            title="برای ثبت تبلیغ وارد شوید"
            description="ثبت کمپین نیازمند حساب واقعی است. پس از ورود، کیف پول را شارژ کنید تا بودجهٔ تبلیغ بلوکه شود."
          />
        )}
      </div>
    </div>
  );
}
