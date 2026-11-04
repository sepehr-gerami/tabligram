"use client";

import { useEffect, useState } from "react";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState<Record<string, string>>({}); // برای ذخیره شماره پیگیری هر ردیف
  const [error, setError] = useState("");

  const fetchPayouts = () => {
    setLoading(true);
    fetch("/api/admin/payouts")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPayouts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("خطا در دریافت اطلاعات");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handlePay = async (holdId: string) => {
    const reference = refs[holdId];
    if (!reference) return alert("لطفاً شماره پیگیری را وارد کنید.");

    if (!confirm("آیا از ثبت این پرداخت مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/admin/payouts/${holdId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutReference: reference }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "خطا در ثبت پرداخت");
      
      alert("پرداخت با موفقیت ثبت شد.");
      fetchPayouts(); // لیست رو رفرش میکنیم
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-10 text-center">در حال بارگذاری...</div>;
  if (error) return <div className="p-10 text-red-500 text-center">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 mt-10" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">مدیریت پرداخت‌ها</h1>
      
      {payouts.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center">هیچ پرداختی در انتظار نیست.</p>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => (
            <div key={p.holdId} className="border rounded-lg p-4 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              <div className="flex-1">
                <h3 className="font-bold text-lg">{p.campaignTitle} <span className="text-sm font-normal text-gray-500">(پیج: {p.pageTitle})</span></h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-gray-700">
                  <p><strong>مبلغ:</strong> {p.amount.toLocaleString()} تومان</p>
                  <p><strong>صاحب پیج:</strong> {p.publisherName}</p>
                  <p><strong>شماره کارت:</strong> <span className="font-mono text-blue-600">{p.cardNumber}</span></p>
                  <p><strong>نام صاحب کارت:</strong> {p.cardHolderName}</p>
                  <p><strong>وضعیت احراز هویت:</strong> {p.payoutStatus === "VERIFIED" ? "✅ تایید شده" : "❌ تایید نشده"}</p>
                  <p><strong>زمان مجاز پرداخت:</strong> {new Date(p.payoutDueAt).toLocaleString("fa-IR")}</p>
                </div>
                
                {!p.isTimeReached && (
                  <p className="text-red-500 text-xs mt-2 font-bold bg-red-50 p-1 rounded w-fit">
                    ⚠️ هنوز زمان قانونی پرداخت (72 ساعت) نرسیده است.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <input
                  type="text"
                  placeholder="شماره پیگیری بانکی"
                  className="border p-2 rounded text-sm"
                  value={refs[p.holdId] || ""}
                  onChange={(e) => setRefs({ ...refs, [p.holdId]: e.target.value })}
                  disabled={!p.isTimeReached || p.payoutStatus !== "VERIFIED"}
                />
                <button
                  onClick={() => handlePay(p.holdId)}
                  disabled={!p.isTimeReached || p.payoutStatus !== "VERIFIED"}
                  className={`px-4 py-2 rounded text-white font-bold text-sm ${
                    (!p.isTimeReached || p.payoutStatus !== "VERIFIED") 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  ثبت پرداخت
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}