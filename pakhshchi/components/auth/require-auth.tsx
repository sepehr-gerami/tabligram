"use client";

import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/auth-provider";

/** جایگزین محتوای صفحه‌های نیازمند ورود؛ دکمه، دیالوگ ورود سراسری را باز می‌کند. */
export function AuthRequired({ title, description }: { title: string; description: string }) {
  const { openAuth } = useSession();
  return (
    <div className="bg-mist">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="space-y-5 p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <LockKeyhole aria-hidden className="size-7" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
            <p className="leading-7 text-slate-600">{description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => openAuth("login")}>ورود به حساب</Button>
            <Button size="lg" variant="outline" onClick={() => openAuth("register")}>ثبت‌نام</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
