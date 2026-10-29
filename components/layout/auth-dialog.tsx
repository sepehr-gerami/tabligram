"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, describe } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ROLES, type RoleId } from "@/lib/roles";
import { validateAuth, type Errors } from "@/lib/validation";

export type AuthMode = "login" | "register";

export function AuthDialog({ mode, onClose }: { mode: AuthMode | null; onClose: () => void }) {
  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{mode && <AuthForm key={mode} mode={mode} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function AuthForm({ mode, onDone }: { mode: AuthMode; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ name: "", mobile: "" });
  const [role, setRole] = useState<RoleId>("advertiser");
  const [errors, setErrors] = useState<Errors<"name" | "mobile">>({});
  const isRegister = mode === "register";

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateAuth(values, isRegister);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.name ? "name" : "mobile")?.focus();
      return;
    }
    const target = ROLES.find((r) => r.id === role)!;
    toast({ tone: "success", title: "وارد پنل نمایشی شدید", description: `نقش: ${target.label}. این ورود فقط نمایشی است.` });
    onDone();
    router.push(target.href);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isRegister ? "ثبت‌نام در پخش‌چی" : "ورود به پخش‌چی"}</DialogTitle>
        <DialogDescription>نقش خود را انتخاب کنید تا به پنل مربوط به آن بروید.</DialogDescription>
      </DialogHeader>
      <Alert tone="warning">این نسخه نمایشی است: حساب واقعی ساخته نمی‌شود و رمز یا کد تأییدی ارسال نمی‌شود.</Alert>
      {isRegister && (
        <Field id="name" label="نام و نام خانوادگی" required error={errors.name}>
          <Input {...describe("name", errors.name)} autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </Field>
      )}
      <Field id="mobile" label="شمارهٔ موبایل" required error={errors.mobile}>
        <Input {...describe("mobile", errors.mobile)} dir="ltr" className="text-end" type="tel" inputMode="numeric" autoComplete="tel" placeholder="09121234567" value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-800">نقش نمایشی</legend>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(({ id, label, icon: Icon }) => (
            <label key={id} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100">
              <input type="radio" name="role" value={id} checked={role === id} onChange={() => setRole(id)} className="sr-only" />
              <Icon aria-hidden className="size-5" />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="w-full">{isRegister ? "ساخت حساب نمایشی" : "ورود به پنل"}</Button>
    </form>
  );
}
