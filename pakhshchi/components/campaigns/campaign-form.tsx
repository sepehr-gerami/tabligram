"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, describe } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CampaignPreview } from "@/components/campaigns/campaign-preview";
import { OrderSuccess } from "@/components/campaigns/order-success";
import { PageCard } from "@/components/shared/page-card";
import { PageDetailDialog } from "@/components/shared/page-detail-dialog";
import { advertiserPages, pagePrice } from "@/lib/pages";
import { ACCEPTED_MEDIA, CATEGORIES, MAX_FILE_MB, PUBLISH_TYPES, typeLabel } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { cn, formatBytes, formatNumber, formatToman, makeId, parseAmount, toLatinDigits } from "@/lib/utils";
import { validateCampaign, validateMedia, type CampaignField, type CampaignValues, type Errors } from "@/lib/validation";
import type { CategoryId, InstaPage, PublishType } from "@/types";

/** Narrows the optional selects after validation; the submit guard has already rejected empty values. */
const isPublishType = (v: CampaignValues["publishType"]): v is PublishType => v !== "";
const isCategory = (v: CampaignValues["category"]): v is CategoryId => v !== "";

const EMPTY: CampaignValues = { title: "", business: "", description: "", link: "", budget: "", count: "", publishType: "", category: "", region: "", notes: "" };
const FIELD_ORDER: CampaignField[] = ["title", "business", "description", "link", "media", "budget", "count", "publishType", "category", "notes"];

export function CampaignForm() {
  const { addCampaign, pages } = useStore();
  const toast = useToast();
  const [values, setValues] = useState<CampaignValues>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<CampaignField>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; title: string } | null>(null);
  // Preview-only selection: the advertiser sees the tariff of the picked page, but no offer is created here.
  const [picked, setPicked] = useState<InstaPage | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = <K extends keyof CampaignValues>(k: K, v: CampaignValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const check = (k: CampaignField) => () => setErrors((e) => ({ ...e, [k]: validateCampaign(values, file)[k] }));

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!picked) return;
    const problem = validateMedia(picked);
    setErrors((p) => ({ ...p, media: problem }));
    setFile(problem ? null : picked);
    if (problem) toast({ tone: "error", title: "فایل پذیرفته نشد", description: problem });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateCampaign(values, file);
    setErrors(found);
    const first = FIELD_ORDER.find((k) => found[k]);
    if (first) {
      toast({ tone: "error", title: "فرم نیاز به اصلاح دارد", description: "فیلدهای مشخص‌شده را بررسی کنید." });
      document.getElementById(first === "publishType" ? "publishType-story" : first)?.focus();
      return;
    }
    // The validation above already rejects empty values; this keeps the narrowing explicit for TypeScript.
    if (!isPublishType(values.publishType) || !isCategory(values.category)) return;
    const publishType = values.publishType;
    const category = values.category;
    setSubmitting(true);
    // Demo only: no network request is made, and the uploaded file is never stored.
    await new Promise((r) => setTimeout(r, 700));
    const orderNumber = `PK-${Math.floor(100000 + Math.random() * 900000)}`;
    addCampaign({
      id: makeId("c"), orderNumber, title: values.title.trim(), business: values.business.trim(), description: values.description.trim(),
      link: toLatinDigits(values.link.trim()), mediaName: file?.name ?? null, mediaKind: file?.type.startsWith("video") ? "video" : "image",
      budget: parseAmount(values.budget), count: Number(toLatinDigits(values.count)), publishType,
      category, region: values.region.trim(), notes: values.notes.trim(), status: "pending",
      createdAt: new Date().toISOString(), mine: true, assignments: [], selectedPageId: picked?.id ?? null,
    });
    setSubmitting(false);
    setDone({ orderNumber, title: values.title.trim() });
    toast({ tone: "success", title: "سفارش ثبت شد", description: `شمارهٔ نمونه: ${orderNumber}` });
  }

  function startOver() { setValues(EMPTY); setFile(null); setErrors({}); setDone(null); setPicked(null); }

  /** Picking a page (optionally with a publish type) only pre-fills the form; the order is placed on submit. */
  function choosePage(page: InstaPage | null, type?: PublishType) {
    setPicked(page);
    if (!page) return;
    setValues((p) => ({
      ...p,
      category: page.category ?? p.category,
      region: p.region || page.city,
      publishType: type ?? p.publishType,
    }));
    setErrors((e) => ({ ...e, category: undefined, publishType: undefined }));
  }

  if (done) return <OrderSuccess orderNumber={done.orderNumber} title={done.title} onNew={startOver} />;

  const budget = parseAmount(values.budget);
  const count = Number(toLatinDigits(values.count));
  const perPublish = budget > 0 && Number.isInteger(count) && count > 0 ? Math.round(budget / count) : 0;
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>اطلاعات تبلیغ</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="title" label="عنوان تبلیغ یا نام محصول" required error={errors.title}>
              <Input {...describe("title", errors.title)} value={values.title} onChange={(e) => set("title", e.target.value)} onBlur={check("title")} />
            </Field>
            <Field id="business" label="نام کسب‌وکار" required error={errors.business}>
              <Input {...describe("business", errors.business)} autoComplete="organization" value={values.business} onChange={(e) => set("business", e.target.value)} onBlur={check("business")} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="description" label="توضیحات محصول یا خدمات" required error={errors.description}>
                <Textarea {...describe("description", errors.description)} value={values.description} onChange={(e) => set("description", e.target.value)} onBlur={check("description")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="link" label="لینک پیج اینستاگرام یا سایت" required hint="نمونه: https://example.com یا @username" error={errors.link}>
                <Input {...describe("link", errors.link, true)} dir="ltr" className="text-start" inputMode="url" autoComplete="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://" value={values.link} onChange={(e) => set("link", e.target.value)} onBlur={check("link")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>تصویر یا ویدئوی تبلیغ</CardTitle></CardHeader>
          <CardContent>
            <Field id="media" label="فایل تبلیغ" required hint={`JPG، PNG، WebP یا MP4 · حداکثر ${formatNumber(MAX_FILE_MB)} مگابایت`} error={errors.media}>
              <div className="flex flex-wrap items-center gap-3">
                <input id="media" name="media" type="file" accept={ACCEPTED_MEDIA.join(",")} onChange={onFile} className="peer sr-only" aria-invalid={errors.media ? true : undefined} aria-describedby={errors.media ? "media-error" : "media-hint"} />
                <label htmlFor="media" className={cn("inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100", errors.media ? "border-red-500" : "border-slate-300")}>
                  <Paperclip aria-hidden className="size-4" />{file ? "تغییر فایل" : "انتخاب تصویر یا ویدئو"}
                </label>
                {file && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm text-slate-700">
                    <span dir="ltr" className="max-w-40 truncate">{file.name}</span>
                    <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
                    <button type="button" onClick={() => setFile(null)} aria-label="حذف فایل" className="grid size-7 place-items-center rounded-md text-slate-500 hover:bg-white"><X className="size-4" /></button>
                  </span>
                )}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>بودجه و نوع انتشار</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="budget" label="بودجهٔ کل (تومان)" required error={errors.budget} hint={budget > 0 ? formatToman(budget) : "حداقل ۵۰۰٬۰۰۰ تومان"}>
              <Input {...describe("budget", errors.budget, true)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.budget}
                onChange={(e) => { const n = parseAmount(e.target.value); set("budget", n ? formatNumber(n) : ""); }} onBlur={check("budget")} />
            </Field>
            <Field id="count" label="تعداد انتشار موردنیاز" required error={errors.count} hint={perPublish ? `میانگین هر انتشار: ${formatToman(perPublish)}` : "عددی بین ۱ تا ۱۰۰"}>
              <Input {...describe("count", errors.count, true)} dir="ltr" className="text-start" inputMode="numeric" autoComplete="off" value={values.count} onChange={(e) => set("count", e.target.value)} onBlur={check("count")} />
            </Field>
            <fieldset className="sm:col-span-2" aria-describedby={errors.publishType ? "publishType-error" : undefined}>
              <legend className="mb-1.5 text-sm font-medium text-slate-800">نوع انتشار<span aria-hidden className="ms-1 text-red-600">*</span></legend>
              <div className="grid grid-cols-3 gap-2">
                {PUBLISH_TYPES.map((t) => (
                  <label key={t.value} className={cn("flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100", errors.publishType ? "border-red-500" : "border-slate-200 hover:border-slate-300")}>
                    <input id={`publishType-${t.value}`} type="radio" name="publishType" value={t.value} checked={values.publishType === t.value} onChange={() => set("publishType", t.value)} className="sr-only" />
                    {t.label}
                  </label>
                ))}
              </div>
              {errors.publishType && <p id="publishType-error" role="alert" className="mt-1.5 text-xs text-red-600">{errors.publishType}</p>}
            </fieldset>
            <Field id="category" label="دسته‌بندی پیج‌های موردنظر" required error={errors.category}>
              <Select {...describe("category", errors.category)} value={values.category} onChange={(e) => set("category", e.target.value as CampaignValues["category"])} onBlur={check("category")}>
                <option value="">انتخاب کنید</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field id="region" label="محدودهٔ جغرافیایی" hint="مثلاً تهران یا کل کشور">
              <Input {...describe("region", undefined, true)} value={values.region} onChange={(e) => set("region", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="notes" label="توضیحات تکمیلی" error={errors.notes}>
                <Textarea {...describe("notes", errors.notes)} className="min-h-24" value={values.notes} onChange={(e) => set("notes", e.target.value)} onBlur={check("notes")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <PagePicker pages={pages} picked={picked} onPick={choosePage} />

        {errorCount > 0 && <Alert tone="warning"><span role="alert">{formatNumber(errorCount)} مورد نیاز به اصلاح دارد. فیلدهای قرمز را بررسی کنید.</span></Alert>}
        <Alert tone="info">پرداخت واقعی انجام نمی‌شود؛ ثبت سفارش فقط یک نمونهٔ آزمایشی در همین مرورگر ذخیره می‌کند.</Alert>
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin" />در حال ثبت…</> : <><Send className="-scale-x-100" />ثبت سفارش</>}
        </Button>
      </div>

      <aside aria-label="پیش‌نمایش تبلیغ" className="space-y-3 lg:sticky lg:top-24">
        <h2 className="text-base font-bold text-navy-900">پیش‌نمایش تبلیغ</h2>
        <CampaignPreview values={values} previewUrl={previewUrl} mediaKind={file ? (file.type.startsWith("video") ? "video" : "image") : null} pickedPage={picked} />
      </aside>
    </form>
  );
}

/**
 * Optional step: pick one approved page to see its tariff next to the preview.
 * The selection is saved on the campaign as `selectedPageId` (preview only); the
 * admin still assigns the actual pages.
 */
function PagePicker({ pages, picked, onPick }: {
  pages: InstaPage[];
  picked: InstaPage | null;
  /** `null` clears the selection (and the pre-filled category/region are left as they are). */
  onPick: (page: InstaPage | null, type?: PublishType) => void;
}) {
  const list = advertiserPages(pages);
  const [open, setOpen] = useState<InstaPage | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>انتخاب پیج پیشنهادی (اختیاری)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-slate-600">
          می‌توانید یکی از پیج‌های تأییدشده را انتخاب کنید تا تعرفهٔ آن را ببینید. انتخاب پیج فقط پیشنهاد شماست و تخصیص نهایی پیج‌ها را مدیر انجام می‌دهد.
        </p>

        {picked ? (
          <div className="space-y-3">
            <PageCard page={picked} />
            <div className="flex flex-wrap items-center gap-2">
              {picked.publishTypes.map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => onPick(picked, t)}>
                  {`${typeLabel(t)} · ${formatToman(pagePrice(picked, t))}`}
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => onPick(null)}>حذف انتخاب</Button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <Alert tone="info">در حال حاضر پیج تأییدشده‌ای برای نمایش نیست. ثبت سفارش با تنظیمات دسته‌بندی هم ممکن است.</Alert>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.slice(0, 4).map((p) => (
              <li key={p.id} className="h-full">
                <PageCard page={p} onSelect={() => setOpen(p)} actionLabel="مشاهده و انتخاب این پیج" />
              </li>
            ))}
            {list.length > 4 && (
              <li className="sm:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(list[4])}>
                  دیدن {formatNumber(list.length - 4)} پیج دیگر
                </Button>
              </li>
            )}
          </ul>
        )}
      </CardContent>

      <PageDetailDialog page={open} onClose={() => setOpen(null)} onSelect={(page, type) => { onPick(page, type); setOpen(null); }} />
    </Card>
  );
}
