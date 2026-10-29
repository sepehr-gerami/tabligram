import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={SearchX} title="این صفحه پیدا نشد" description="آدرس را بررسی کنید یا به صفحهٔ اصلی برگردید.">
        <Link href="/" className={buttonVariants()}>بازگشت به صفحهٔ اصلی</Link>
      </EmptyState>
    </div>
  );
}
