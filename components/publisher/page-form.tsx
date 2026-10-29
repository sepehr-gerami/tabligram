"use client";

import { useState, type FormEvent } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, describe } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES, PUBLISH_TYPES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { cn, formatNumber, formatToman, ltr, makeId, normalizeHandle, parseAmount, toLatinDigits } from "@/lib/utils";
import { validatePage, type Errors, type PageField, type PageValues } from "@/lib/validation";
import type { CategoryId, PublishType } from "@/types";

const EMPTY: PageValues = { handle: "", url: "", category: "", city: "", followers: "", price: "", publishTypes: [] };
const ORDER: PageField[] = ["handle", "url", "category", "city", "followers", "price", "publishTypes"];

export function PageForm() {
  const { pages, addPage } = useStore();
  const toast = useToast();
  const [values, setValues] = useState<PageValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<PageField>>({});

  const set = <K extends keyof PageValues>(k: K, v: PageValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const check = (k: PageField) => () => setErrors((e) => ({ ...e, [k]: validatePage(values)[k] }));
  const toggleType = (t: PublishType) => set("publishTypes", values.publishTypes.includes(t) ? values.publishTypes.filter((x) => x !== t) : [...values.publishTypes, t]);
  const money = (k: "followers" | "price") => (e: { target: { value: string } }) => { const n = parseAmount(e.target.value); set(k, n ? formatNumber(n) : ""); };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validatePage(values);
    const handle = normalizeHandle(toLatinDigits(values.handle.trim()));
    if (!found.handle && pages.some((p) => p.handle.toLowerCase() === handle.toLowerCase())) found.handle = "این شناسه قبلاً ثبت شده است.";
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      toast({ tone: "error", title: "ثبت پیج انجام نشد", description: "فیلدهای مشخص‌شده را اصلاح کنید." });
      document.getElementById(first === "publishTypes" ? "publishTypes-story" : first)?.focus();
      return;
    }
    addPage({
      id: makeId("p"), handle, url: values.url.trim(), category: values.category as CategoryId, city: values.city.trim(),
      followers: parseAmount(values.followers), price: parseAmount(values.price), publishTypes: values.publishTypes, approval: "pending", owned: true,
    });
    setValues(EMPTY);
    setErrors({});
    toast({ tone: "success", title: "پیج ثبت شد", description: `${ltr(handle)} در انتظار تأیید مدیر است.` });
  }

  const price = parseAmount(values.price);

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field id="handle" label="شناسهٔ پیج" required error={errors.handle} hint="بدون فاصله؛ مثل my_page">
            <Input {...describe("handle", errors.handle, true)} dir="ltr" className="text-start" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="@username" value={values.handle} onChange={(e) => set("handle", e.target.value)} onBlur={check("handle")} />
          </Field>
          <Field id="url" label="لینک پیج" required error={errors.url}>
            <Input {...describe("url", errors.url)} dir="ltr" className="text-start" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://instagram.com/username" value={values.url} onChange={(e) => set("url", e.target.value)} onBlur={check("url")} />
          </Field>
          <Field id="category" label="دسته‌بندی" required error={errors.category}>
            <Select {...describe("category", errors.category)} value={values.category} onChange={(e) => set("category", e.target.value as PageValues["category"])} onBlur={check("category")}>
              <option value="">انتخاب کنید</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field id="city" label="شهر" required error={errors.city}>
            <Input {...describe("city", errors.city)} autoComplete="address-level2" value={values.city} onChange={(e) => set("city", e.target.value)} onBlur={check("city")} />
          </Field>
          <Field id="followers" label="تعداد فالوئر" required error={errors.followers} hint="عدد نمونه است و تأیید نمی‌شود">
            <Input {...describe("followers", errors.followers, true)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.followers} onChange={money("followers")} onBlur={check("followers")} />
          </Field>
          <Field id="price" label="تعرفهٔ هر انتشار (تومان)" required error={errors.price} hint={price > 0 ? formatToman(price) : "حداقل ۵۰٬۰۰۰ تومان"}>
            <Input {...describe("price", errors.price, true)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.price} onChange={money("price")} onBlur={check("price")} />
          </Field>
          <fieldset className="sm:col-span-2" aria-describedby={errors.publishTypes ? "publishTypes-error" : undefined}>
            <legend className="mb-1.5 text-sm font-medium text-slate-800">نوع انتشار قابل‌قبول<span aria-hidden className="ms-1 text-red-600">*</span></legend>
            <div className="grid grid-cols-3 gap-2">
              {PUBLISH_TYPES.map((t) => (
                <label key={t.value} className={cn("flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100", errors.publishTypes ? "border-red-500" : "border-slate-200 hover:border-slate-300")}>
                  <input id={`publishTypes-${t.value}`} type="checkbox" name="publishTypes" value={t.value} checked={values.publishTypes.includes(t.value)} onChange={() => toggleType(t.value)} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
            {errors.publishTypes && <p id="publishTypes-error" role="alert" className="mt-1.5 text-xs text-red-600">{errors.publishTypes}</p>}
          </fieldset>
          <div className="sm:col-span-2"><Button type="submit" size="lg"><PlusCircle />ثبت پیج</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
