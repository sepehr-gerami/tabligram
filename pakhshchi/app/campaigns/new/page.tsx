import type { Metadata } from "next";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { MyOrders } from "@/components/campaigns/my-orders";

export const metadata: Metadata = { title: "ثبت تبلیغ جدید" };

export default function NewCampaignPage() {
  return (
    <div className="bg-mist">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:py-12">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">ثبت تبلیغ جدید</h1>
          <p className="leading-8 text-slate-600">اطلاعات تبلیغ را وارد کنید؛ پیش‌نمایش آن همان لحظه کنار فرم دیده می‌شود.</p>
        </div>
        <CampaignForm />
        <MyOrders />
      </div>
    </div>
  );
}
