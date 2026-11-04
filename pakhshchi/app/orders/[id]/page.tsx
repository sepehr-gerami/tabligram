"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function OrderDetailsPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // گرفتن اطلاعات از API ای که ساختیم
    fetch(`/api/orders/${params.id}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;
  if (!data || data.error) return <div className="p-10 text-center text-red-500">خطا در دریافت اطلاعات</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-xl shadow border">
      <h1 className="text-2xl font-bold mb-6">جزئیات سفارش {data.id}</h1>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">اطلاعات کمپین</h2>
          <p><strong>عنوان:</strong> {data.campaign.title}</p>
          <p><strong>توضیحات:</strong> {data.campaign.description}</p>
          
          {/* 👇 اینجا دقیقاً همون کدی است که پرسیدی 👇 */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
            <strong>لینک تبلیغ: </strong>
            {data.isRevealed ? (
              <a href={data.campaign.link} target="_blank" className="underline font-bold text-blue-600">
                {data.campaign.link} (کلیک کنید)
              </a>
            ) : (
              <span className="text-gray-500">⏳ در انتظار پذیرش درخواست. هویت‌ها پس از پذیرش آشکار می‌شوند.</span>
            )}
          </div>
          {/* 👆 پایان کد شرطی 👆 */}

        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">اطلاعات پیج (میزبان)</h2>
          <p><strong>نام پیج:</strong> {data.page.title}</p>
          <p><strong>دسته‌بندی:</strong> {data.page.category}</p>
          <p><strong>آیدی اینستاگرام:</strong> {data.page.handle}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">وضعیت مالی</h2>
          <p><strong>مبلغ بلوکه شده:</strong> {data.amount.toLocaleString()} تومان</p>
          <p><strong>وضعیت فعلی:</strong> {data.status}</p>
        </div>
      </div>
    </div>
  );
}