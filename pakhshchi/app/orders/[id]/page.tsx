import type { Metadata } from "next";
import { AuthRequired } from "@/components/auth/require-auth";
import { OrderDetailPanel } from "@/components/orders/order-detail";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "جزئیات سفارش" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  return (
    <div className="bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
        {user ? (
          <OrderDetailPanel orderId={id} />
        ) : (
          <AuthRequired
            title="برای مشاهدهٔ سفارش وارد شوید"
            description="جزئیات سفارش، وضعیت مالی و اقدام‌های مربوط به آن فقط برای دو طرف سفارش و مدیر قابل مشاهده است."
          />
        )}
      </div>
    </div>
  );
}
