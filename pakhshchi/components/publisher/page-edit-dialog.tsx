"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, describe } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/categories";
import { PUBLISH_TYPES } from "@/lib/constants";
import { pageTitle } from "@/components/shared/page-card";
import { useStore } from "@/lib/store";
import { cn, formatNumber, formatToman, parseAmount } from "@/lib/utils";
import { validatePage, type Errors, type PageField, type PageValues } from "@/lib/validation";
import type { CategoryId, InstaPage, PublishType } from "@/types";

const toValues = (p: InstaPage): PageValues => ({
  title: p.title ?? "", handle: p.handle, url: p.url, category: (p.category ?? "") as PageValues["category"],
  city: p.city, bio: p.bio,
  followers: p.followers ? formatNumber(p.followers) : "",
  avgStoryViews: p.avgStoryViews ? formatNumber(p.avgStoryViews) : "",
  avgPostViews: p.avgPostViews ? formatNumber(p.avgPostViews) : "",
  prices: {
    story: p.prices.story ? formatNumber(p.prices.story) : "",
    post: p.prices.post ? formatNumber(p.prices.post) : "",
    reels: p.prices.reels ? formatNumber(p.prices.reels) : "",
  },
  publishTypes: p.publishTypes,
});

/**
 * Owner-side edit. Ownership is enforced again by the store reducer (`updatePage`),
 * so a stale/tampered id cannot patch someone else's page.
 */
export function PageEditDialog({ page, onClose }: { page: InstaPage | null; onClose: () => void }) {
  return (
    <Dialog open={page !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">{page && <EditForm key={page.id} page={page} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function EditForm({ page, onDone }: { page: InstaPage; onDone: () => void }) {
  const { updatePage, pages } = useStore();
  const toast = useToast();
  const [values, setValues] = useState<PageValues>(() => toValues(page));
  const [errors, setErrors] = useState<Errors<PageField>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PageValues>(k: K, v: PageValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const setPrice = (t: PublishType, v: string) => {
    const n = parseAmount(v);
    setValues((p) => ({ ...p, prices: { ...p.prices, [t]: n ? formatNumber(n) : "" } }));
    setErrors((e) => (e[`price_${t}`] ? { ...e, [`price_${t}`]: undefined } : e));
  };
  const num = (k: "followers" | "avgStoryViews" | "avgPostViews") => (e: { target: { value: string } }) => {
    const n = parseAmount(e.target.value);
    set(k, n ? formatNumber(n) : "");
  };
  const toggleType = (t: PublishType) => set("publishTypes", values.publishTypes.includes(t) ? values.publishTypes.filter((x) => x !== t) : [...values.publishTypes, t]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validatePage(values);
    const h = values.handle.trim().toLowerCase();
    if (!found.handle && pages.some((p) => p.id !== page.id && p.handle.toLowerCase() === h)) found.handle = "این شناسه قبلاً ثبت شده است.";
    setErrors(found);
    if (Object.keys(found).length) {
      toast({ tone: "error", title: "تغییرات ذخیره نشد", description: "فیلدهای مشخص‌شده را اصلاح کنید." });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    updatePage(page.id, {
      title: values.title.trim() || values.handle.trim(),
      handle: values.handle.trim(), url: values.url.trim(),
      category: (values.category || null) as CategoryId | null,
      city: values.city.trim(), bio: values.bio.trim(),
      followers: parseAmount(values.followers),
      avgStoryViews: parseAmount(values.avgStoryViews),
      avgPostViews: parseAmount(values.avgPostViews),
      prices: { story: parseAmount(values.prices.story), post: parseAmount(values.prices.post), reels: parseAmount(values.prices.reels) },
      publishTypes: values.publishTypes,
    });
    setSaving(false);
    toast({ tone: "success", title: "پیج به‌روزرسانی شد", description: `${pageTitle(page)} دوباره در انتظار تأیید مدیر است.` });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>ویرایش {pageTitle(page)}</DialogTitle>
        <DialogDescription>پس از تغییر اطلاعات، وضعیت پیج به «در انتظار تأیید» برمی‌گردد.</DialogDescription>
      </DialogHeader>

      {page.approval === "approved" && <Alert tone="warning">این پیج تأییدشده است؛ با ذخیرهٔ تغییرات، دوباره برای بررسی ارسال می‌شود.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="e-title" label="نام نمایشی" error={errors.title}>
          <Input {...describe("e-title", errors.title)} value={values.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field id="e-handle" label="آیدی اینستاگرام" required error={errors.handle}>
          <Input {...describe("e-handle", errors.handle)} dir="ltr" className="text-start" value={values.handle} onChange={(e) => set("handle", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="e-url" label="لینک پیج" required error={errors.url}>
            <Input {...describe("e-url", errors.url)} dir="ltr" className="text-start" value={values.url} onChange={(e) => set("url", e.target.value)} />
          </Field>
        </div>
        <Field id="e-category" label="دسته‌بندی" error={errors.category}>
          <Select {...describe("e-category", errors.category)} value={values.category} onChange={(e) => set("category", e.target.value as PageValues["category"])}>
            <option value="">بدون دسته‌بندی</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field id="e-city" label="شهر" error={errors.city}>
          <Input {...describe("e-city", errors.city)} value={values.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="e-bio" label="معرفی پیج" error={errors.bio}>
            <Textarea {...describe("e-bio", errors.bio)} className="min-h-20" value={values.bio} onChange={(e) => set("bio", e.target.value)} />
          </Field>
        </div>
        <Field id="e-followers" label="تعداد فالوئر" required error={errors.followers}>
          <Input {...describe("e-followers", errors.followers)} dir="ltr" className="text-start" inputMode="numeric" value={values.followers} onChange={num("followers")} />
        </Field>
        <Field id="e-story" label="میانگین بازدید استوری" error={errors.avgStoryViews}>
          <Input {...describe("e-story", errors.avgStoryViews)} dir="ltr" className="text-start" inputMode="numeric" value={values.avgStoryViews} onChange={num("avgStoryViews")} />
        </Field>
        <Field id="e-post" label="میانگین بازدید پست/ریلز" error={errors.avgPostViews}>
          <Input {...describe("e-post", errors.avgPostViews)} dir="ltr" className="text-start" inputMode="numeric" value={values.avgPostViews} onChange={num("avgPostViews")} />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">نوع انتشار و تعرفه</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PUBLISH_TYPES.map((t) => {
            const on = values.publishTypes.includes(t.value);
            return (
              <div key={t.value} className={cn("space-y-2 rounded-xl border p-3", on ? "border-brand-600 bg-brand-50/50" : "border-slate-200")}>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                  <input type="checkbox" checked={on} onChange={() => toggleType(t.value)} className="size-4 accent-brand-600" />
                  {t.label}
                </label>
                <Input aria-label={`تعرفهٔ ${t.label}`} dir="ltr" className="h-10 text-start" inputMode="numeric" disabled={!on}
                  value={values.prices[t.value]} onChange={(e) => setPrice(t.value, e.target.value)} />
                {errors[`price_${t.value}`] && <p role="alert" className="text-xs text-red-600">{errors[`price_${t.value}`]}</p>}
                {on && parseAmount(values.prices[t.value]) > 0 && <p className="text-xs text-slate-500">{formatToman(parseAmount(values.prices[t.value]))}</p>}
              </div>
            );
          })}
        </div>
        {errors.publishTypes && <p role="alert" className="text-xs text-red-600">{errors.publishTypes}</p>}
      </fieldset>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>انصراف</Button>
        <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="animate-spin" />در حال ذخیره…</> : <><Save />ذخیرهٔ تغییرات</>}</Button>
      </DialogFooter>
    </form>
  );
}
