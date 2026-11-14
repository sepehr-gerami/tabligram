"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Paperclip, PlusCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, describe } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/categories";
import { ACCEPTED_IMAGES, MAX_AVATAR_MB, MAX_PAGES_PER_OWNER, PUBLISH_TYPES } from "@/lib/constants";
import { DEMO_USER_ID } from "@/lib/identity";
import { ownedPages } from "@/lib/pages";
import { useStore } from "@/components/shared/store";
import { cn, formatNumber, formatToman, makeId, normalizeHandle, parseAmount, toLatinDigits } from "@/lib/utils";
import { validateAvatar, validatePage, type Errors, type PageField, type PageValues } from "@/lib/validation";
import { emptyVerification } from "@/lib/verification";
import type { CategoryId, InstaPage, PublishType } from "@/types";

const EMPTY: PageValues = {
  title: "", handle: "", url: "", category: "", city: "", bio: "",
  followers: "", avgStoryViews: "", avgPostViews: "",
  prices: { story: "", post: "", reels: "" }, publishTypes: [],
};

const ORDER: PageField[] = ["title", "handle", "url", "followers", "avgStoryViews", "avgPostViews", "publishTypes", "price_story", "price_post", "price_reels", "bio"];

export function PageForm() {
  const { pages, addPage } = useStore();
  const toast = useToast();
  const [values, setValues] = useState<PageValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<PageField>>({});
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const mine = ownedPages(pages);
  const atLimit = mine.length >= MAX_PAGES_PER_OWNER;
  const remaining = Math.max(0, MAX_PAGES_PER_OWNER - mine.length);

  useEffect(() => {
    if (!avatar) { setAvatarUrl(null); return; }
    const url = URL.createObjectURL(avatar);
    setAvatarUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const set = <K extends keyof PageValues>(k: K, v: PageValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const setPrice = (t: PublishType, v: string) => {
    const n = parseAmount(v);
    setValues((p) => ({ ...p, prices: { ...p.prices, [t]: n ? formatNumber(n) : "" } }));
    setErrors((e) => (e[`price_${t}`] ? { ...e, [`price_${t}`]: undefined } : e));
  };
  const toggleType = (t: PublishType) => set("publishTypes", values.publishTypes.includes(t) ? values.publishTypes.filter((x) => x !== t) : [...values.publishTypes, t]);
  const num = (k: "followers" | "avgStoryViews" | "avgPostViews") => (e: { target: { value: string } }) => {
    const n = parseAmount(e.target.value);
    set(k, n ? formatNumber(n) : "");
  };
  const check = (k: PageField) => () => setErrors((e) => ({ ...e, [k]: validatePage(values)[k] }));

  const duplicate = useMemo(() => {
    const h = normalizeHandle(toLatinDigits(values.handle.trim())).toLowerCase();
    return values.handle.trim() ? mine.some((p) => p.handle.toLowerCase() === h) : false;
  }, [values.handle, mine]);

  function onAvatar(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!picked) return;
    const problem = validateAvatar(picked);
    setAvatarError(problem);
    setAvatar(problem ? null : picked);
    if (problem) toast({ tone: "error", title: "تصویر پذیرفته نشد", description: problem });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // The cap is re-checked here as well as in the reducer/store action.
    if (atLimit) {
      toast({ tone: "error", title: "ظرفیت ثبت پیج پر شده است", description: `هر حساب حداکثر ${formatNumber(MAX_PAGES_PER_OWNER)} پیج می‌تواند ثبت کند.` });
      return;
    }
    const found = validatePage(values);
    const handle = normalizeHandle(toLatinDigits(values.handle.trim()));
    if (!found.handle && duplicate) found.handle = "این شناسه قبلاً در پیج‌های شما ثبت شده است.";
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first || avatarError) {
      toast({ tone: "error", title: "ثبت پیج انجام نشد", description: first ? "فیلدهای مشخص‌شده را اصلاح کنید." : avatarError });
      const id = first?.startsWith("price_") ? first : first === "publishTypes" ? "publishTypes-story" : first;
      if (id) document.getElementById(id)?.focus();
      return;
    }

    setSubmitting(true);
    // Demo only: persisted in this browser's localStorage, never uploaded anywhere.
    await new Promise((r) => setTimeout(r, 500));
    const page: InstaPage = {
      id: makeId("p"), handle, title: values.title.trim() || handle, url: values.url.trim(),
      category: (values.category || null) as CategoryId | null, city: values.city.trim(), bio: values.bio.trim(),
      followers: parseAmount(values.followers), avgStoryViews: parseAmount(values.avgStoryViews), avgPostViews: parseAmount(values.avgPostViews),
      prices: {
        story: parseAmount(values.prices.story),
        post: parseAmount(values.prices.post),
        reels: parseAmount(values.prices.reels),
      },
      publishTypes: values.publishTypes,
      approval: "pending", rejectReason: "", ownerId: DEMO_USER_ID, createdAt: new Date().toISOString(),
      avatarUrl, owned: true, verification: emptyVerification(), statsSource: "self",
    };
    const ok = addPage(page);
    setSubmitting(false);
    if (!ok) {
      toast({ tone: "error", title: "ثبت پیج انجام نشد", description: "ظرفیت ثبت پیج تکمیل است." });
      return;
    }
    setValues(EMPTY);
    setErrors({});
    setAvatar(null);
    toast({ tone: "success", title: "پیج ثبت شد", description: `${handle} در انتظار تأیید مدیر است.` });
  }

  if (atLimit) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <Badge tone="warning">{formatNumber(mine.length)} از {formatNumber(MAX_PAGES_PER_OWNER)} پیج ثبت‌شده</Badge>
          <p className="font-bold text-navy-900">به سقف ثبت پیج رسیده‌اید</p>
          <p className="text-sm leading-6 text-slate-600">
            هر حساب حداکثر {formatNumber(MAX_PAGES_PER_OWNER)} پیج می‌تواند ثبت کند (پیج‌های در انتظار تأیید هم شمرده می‌شوند).
            برای ثبت پیج جدید، یکی از پیج‌های موجود را حذف کنید.
          </p>
          <Link href="#my-pages" className="text-sm font-medium text-brand-700 hover:underline">مدیریت پیج‌های من</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge tone="info">{formatNumber(mine.length)} از {formatNumber(MAX_PAGES_PER_OWNER)} پیج ثبت‌شده</Badge>
          <span>{formatNumber(remaining)} ظرفیت باقی مانده</span>
        </div>

        <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
          {/* Identity */}
          <Field id="title" label="نام نمایشی پیج" error={errors.title} hint="اگر خالی بماند، شناسهٔ پیج نمایش داده می‌شود.">
            <Input {...describe("title", errors.title, true)} value={values.title} onChange={(e) => set("title", e.target.value)} onBlur={check("title")} />
          </Field>
          <Field id="handle" label="آیدی اینستاگرام" required error={errors.handle ?? (duplicate ? "این شناسه قبلاً ثبت شده است." : undefined)} hint="بدون فاصله؛ مثل my_page">
            <Input {...describe("handle", errors.handle, true)} dir="ltr" className="text-start" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="@username" value={values.handle} onChange={(e) => set("handle", e.target.value)} onBlur={check("handle")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="url" label="لینک پیج اینستاگرام" required error={errors.url}>
              <Input {...describe("url", errors.url)} dir="ltr" className="text-start" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://instagram.com/username" value={values.url} onChange={(e) => set("url", e.target.value)} onBlur={check("url")} />
            </Field>
          </div>

          {/* Profile image */}
          <div className="sm:col-span-2">
            <Field id="avatar" label="تصویر پروفایل" hint={`JPG، PNG یا WebP · حداکثر ${formatNumber(MAX_AVATAR_MB)} مگابایت · فقط پیش‌نمایش در همین نشست`} error={avatarError}>
              <div className="flex flex-wrap items-center gap-3">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={avatarUrl} alt="پیش‌نمایش تصویر پروفایل" className="size-14 rounded-full border border-slate-200 object-cover" />
                )}
                <input id="avatar" name="avatar" type="file" accept={ACCEPTED_IMAGES.join(",")} onChange={onAvatar} className="peer sr-only" />
                <label htmlFor="avatar" className={cn("inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100", avatarError ? "border-red-500" : "border-slate-300")}>
                  <Paperclip aria-hidden className="size-4" />{avatar ? "تغییر تصویر" : "انتخاب تصویر"}
                </label>
                {avatar && (
                  <button type="button" onClick={() => setAvatar(null)} aria-label="حذف تصویر" className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><X className="size-4" /></button>
                )}
              </div>
            </Field>
          </div>

          {/* Classification */}
          <Field id="category" label="دسته‌بندی" error={errors.category}>
            <Select {...describe("category", errors.category)} value={values.category} onChange={(e) => set("category", e.target.value as PageValues["category"])} onBlur={check("category")}>
              <option value="">بدون دسته‌بندی</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field id="city" label="شهر یا محدودهٔ فعالیت" error={errors.city}>
            <Input {...describe("city", errors.city)} autoComplete="address-level2" value={values.city} onChange={(e) => set("city", e.target.value)} onBlur={check("city")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="bio" label="معرفی پیج" error={errors.bio} hint="حداکثر ۳۰۰ حرف؛ مخاطب اصلی و نوع محتوا را بنویسید.">
              <Textarea {...describe("bio", errors.bio, true)} className="min-h-24" value={values.bio} onChange={(e) => set("bio", e.target.value)} onBlur={check("bio")} />
            </Field>
          </div>

          {/* Stats */}
          <Field id="followers" label="تعداد فالوئر" required error={errors.followers}>
            <Input {...describe("followers", errors.followers)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.followers} onChange={num("followers")} onBlur={check("followers")} />
          </Field>
          <Field id="avgStoryViews" label="میانگین بازدید استوری" error={errors.avgStoryViews}>
            <Input {...describe("avgStoryViews", errors.avgStoryViews)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.avgStoryViews} onChange={num("avgStoryViews")} onBlur={check("avgStoryViews")} />
          </Field>
          <Field id="avgPostViews" label="میانگین بازدید پست/ریلز" error={errors.avgPostViews}>
            <Input {...describe("avgPostViews", errors.avgPostViews)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.avgPostViews} onChange={num("avgPostViews")} onBlur={check("avgPostViews")} />
          </Field>

          {/* Publish types & tariffs */}
          <fieldset className="sm:col-span-2" aria-describedby={errors.publishTypes ? "publishTypes-error" : undefined}>
            <legend className="mb-1.5 text-sm font-medium text-slate-800">نوع انتشار و تعرفه (تومان)<span aria-hidden className="ms-1 text-red-600">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PUBLISH_TYPES.map((t) => {
                const on = values.publishTypes.includes(t.value);
                return (
                  <div key={t.value} className={cn("space-y-2 rounded-xl border p-3", on ? "border-brand-600 bg-brand-50/50" : "border-slate-200", errors.publishTypes ? "border-red-500" : "")}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                      <input id={`publishTypes-${t.value}`} type="checkbox" name="publishTypes" value={t.value} checked={on} onChange={() => toggleType(t.value)} className="size-4 accent-brand-600" />
                      {t.label}
                    </label>
                    <Input id={`price_${t.value}`} aria-label={`تعرفهٔ ${t.label}`} aria-invalid={errors[`price_${t.value}`] ? true : undefined}
                      dir="ltr" className="h-10 text-start" inputMode="numeric" autoComplete="off" disabled={!on} placeholder="تعرفه"
                      value={values.prices[t.value]} onChange={(e) => setPrice(t.value, e.target.value)} onBlur={check(`price_${t.value}`)} />
                    {errors[`price_${t.value}`] && <p role="alert" className="text-xs text-red-600">{errors[`price_${t.value}`]}</p>}
                    {on && !errors[`price_${t.value}`] && parseAmount(values.prices[t.value]) > 0 && <p className="text-xs text-slate-500">{formatToman(parseAmount(values.prices[t.value]))} برای هر انتشار</p>}
                  </div>
                );
              })}
            </div>
            {errors.publishTypes && <p id="publishTypes-error" role="alert" className="mt-1.5 text-xs text-red-600">{errors.publishTypes}</p>}
          </fieldset>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" />در حال ثبت…</> : <><PlusCircle />ثبت پیج</>}
            </Button>
            <p className="text-xs text-slate-500">پس از ثبت، پیج در وضعیت «در انتظار تأیید» قرار می‌گیرد و مدیر سایت آن را بررسی می‌کند.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
