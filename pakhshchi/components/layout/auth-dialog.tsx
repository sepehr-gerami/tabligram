"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, describe } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { BRAND_FA } from "@/lib/brand";
import {
  MIN_PASSWORD_LENGTH, normalizeMobile, normalizeName, validateLogin, validateRegister,
  type AuthErrors, type AuthField,
} from "@/lib/auth-rules";

export type AuthMode = "login" | "register";

const FIELD_ORDER: AuthField[] = ["name", "mobile", "password"];

export function AuthDialog({ mode, onClose }: { mode: AuthMode | null; onClose: () => void }) {
  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{mode && <AuthForm key={mode} mode={mode} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

/**
 * فرم ورود/ثبت‌نام واقعی (بدون انتخاب نقش).
 * نقش تبلیغ‌کننده یا صاحب پیج از روی کاری که کاربر بعداً می‌کند (ساخت کمپین / ثبت پیج) ساخته می‌شود.
 */
function AuthForm({ mode, onDone }: { mode: AuthMode; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ name: "", mobile: "", password: "" });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const name = normalizeName(values.name);
    const mobile = normalizeMobile(values.mobile);
    const found = isRegister
      ? validateRegister({ name, mobile, password: values.password })
      : validateLogin({ mobile, password: values.password });
    setErrors(found);
    setServerError("");
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, mobile, password: values.password } : { mobile, password: values.password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        name?: string; isAdmin?: boolean; error?: string; fields?: AuthErrors;
      };
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setServerError(typeof data.error === "string" ? data.error : "مشکلی پیش آمد. دوباره تلاش کنید.");
        return;
      }
      toast({
        tone: "success",
        title: isRegister ? "حساب شما ساخته شد" : "وارد شدید",
        description: data.name ? `${data.name} عزیز، خوش آمدید.` : undefined,
      });
      onDone();
      if (data.isAdmin) router.push("/admin");
      router.refresh();
    } catch {
      setServerError("ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isRegister ? `ثبت‌نام در ${BRAND_FA}` : `ورود به ${BRAND_FA}`}</DialogTitle>
        <DialogDescription>
          {isRegister
            ? "با شمارهٔ موبایل حساب بسازید. بعداً هر وقت خواستید می‌توانید کمپین بسازید یا پیج خود را ثبت کنید."
            : "شمارهٔ موبایل و رمز عبور خود را وارد کنید."}
        </DialogDescription>
      </DialogHeader>
      {serverError && <Alert tone="warning">{serverError}</Alert>}
      {isRegister && (
        <Field id="name" label="نام و نام خانوادگی" required error={errors.name}>
          <Input {...describe("name", errors.name)} autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </Field>
      )}
      <Field id="mobile" label="شمارهٔ موبایل" required error={errors.mobile}>
        <Input {...describe("mobile", errors.mobile)} dir="ltr" className="text-end" type="tel" inputMode="numeric" autoComplete="tel" placeholder="09121234567" value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} />
      </Field>
      <Field id="password" label="رمز عبور" required error={errors.password}>
        <Input {...describe("password", errors.password)} dir="ltr" className="text-end" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? `حداقل ${MIN_PASSWORD_LENGTH} کاراکتر` : undefined} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "لطفاً صبر کنید…" : isRegister ? "ساخت حساب" : "ورود"}
      </Button>
    </form>
  );
}
