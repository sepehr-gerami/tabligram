"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { BANNER_LIMITS, isSafeLink, type BannerPlacementValue } from "@/lib/banner-rules";
import { formatDate, formatNumber } from "@/lib/utils";

type Placement = BannerPlacementValue;

interface BannerRow {
  id: string;
  title: string;
  description: string | null;
  link: string;
  desktopImage: string | null;
  mobileImage: string | null;
  placement: Placement;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  link: string;
  placement: Placement;
  sortOrder: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  desktopImage: string | null;
  mobileImage: string | null;
}

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "HERO", label: "اسلایدر صفحهٔ اصلی" },
  { value: "SIDEBAR", label: "ستون کناری" },
  { value: "FOOTER", label: "فوتر" },
  { value: "PAGES_TOP", label: "بالای فهرست پیج‌ها" },
];

const EMPTY: FormState = {
  title: "",
  description: "",
  link: "",
  placement: "HERO",
  sortOrder: "0",
  isActive: true,
  startsAt: "",
  endsAt: "",
  desktopImage: null,
  mobileImage: null,
};

const placementLabel = (value: Placement) => PLACEMENTS.find((p) => p.value === value)?.label ?? value;

const errorText = (error: unknown) => (error instanceof Error ? error.message : "خطای نامشخص");

export function BannersManager() {
  const toast = useToast();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktopImage" | "mobileImage" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/banners", { cache: "no-store" });
      const data = (await res.json()) as BannerRow[] | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "دریافت فهرست بنرها ناموفق بود.");
      setBanners(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, key: "desktopImage" | "mobileImage") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ tone: "error", title: "فایل پذیرفته نشد", description: "فقط تصویر PNG، JPG یا WebP مجاز است." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ tone: "error", title: "فایل پذیرفته نشد", description: "حجم تصویر باید حداکثر ۳ مگابایت باشد." });
      return;
    }

    setUploading(key);
    try {
      const res = await fetch("/api/admin/uploads?kind=banner", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "آپلود تصویر ناموفق بود.");
      update(key, data.url);
      toast({ tone: "success", title: "تصویر آپلود شد" });
    } catch (error) {
      toast({ tone: "error", title: "آپلود ناموفق", description: errorText(error) });
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const title = form.title.trim();
    const link = form.link.trim();
    const sortOrder = Number(form.sortOrder || 0);

    if (title.length < BANNER_LIMITS.minTitle || title.length > BANNER_LIMITS.maxTitle) {
      nextErrors.title = `عنوان باید بین ${BANNER_LIMITS.minTitle} تا ${BANNER_LIMITS.maxTitle} حرف باشد.`;
    }
    if (!isSafeLink(link)) {
      nextErrors.link = "لینک باید آدرس کامل https یا مسیر داخلی سایت (مثل /campaigns/new) باشد.";
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > BANNER_LIMITS.maxSortOrder) {
      nextErrors.sortOrder = `ترتیب باید عددی بین ۰ تا ${BANNER_LIMITS.maxSortOrder} باشد.`;
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt).getTime() <= new Date(form.startsAt).getTime()) {
      nextErrors.endsAt = "زمان پایان باید بعد از زمان شروع باشد.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast({ tone: "error", title: "فرم نیاز به اصلاح دارد", description: "فیلدهای مشخص‌شده را بررسی کنید." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: form.description.trim(),
          link,
          placement: form.placement,
          sortOrder,
          isActive: form.isActive,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          desktopImage: form.desktopImage,
          mobileImage: form.mobileImage,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        throw new Error(data.error ?? "ثبت بنر ناموفق بود.");
      }

      toast({ tone: "success", title: "بنر ثبت شد", description: "در صورت فعال بودن، در جایگاه انتخاب‌شده نمایش داده می‌شود." });
      setForm(EMPTY);
      setFieldErrors({});
      await load();
    } catch (error) {
      toast({ tone: "error", title: "ثبت بنر ناموفق", description: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(banner: BannerRow) {
    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      const data = (await res.json().catch(() => ({}))) as BannerRow | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "تغییر وضعیت بنر ناموفق بود.");
      setBanners((prev) => prev.map((row) => (row.id === banner.id ? { ...row, ...data } : row)));
      toast({ tone: "success", title: !banner.isActive ? "بنر فعال شد" : "بنر غیرفعال شد" });
    } catch (error) {
      toast({ tone: "error", title: "تغییر وضعیت ناموفق", description: errorText(error) });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(banner: BannerRow) {
    if (!window.confirm(`بنر «${banner.title}» حذف شود؟`)) return;
    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "حذف بنر ناموفق بود.");
      setBanners((prev) => prev.filter((row) => row.id !== banner.id));
      toast({ tone: "success", title: "بنر حذف شد" });
    } catch (error) {
      toast({ tone: "error", title: "حذف ناموفق", description: errorText(error) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4 text-brand-600" />
            ثبت بنر جدید
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field id="banner-title" label="عنوان بنر" required error={fieldErrors.title}>
              <Input
                id="banner-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="مثلاً تخفیف ویژهٔ نوروز"
                aria-invalid={fieldErrors.title ? true : undefined}
              />
            </Field>

            <Field id="banner-placement" label="جایگاه نمایش" required error={fieldErrors.placement}>
              <Select
                id="banner-placement"
                value={form.placement}
                onChange={(e) => update("placement", e.target.value as Placement)}
              >
                {PLACEMENTS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Field
                id="banner-link"
                label="لینک مقصد"
                required
                hint="مسیر داخلی مثل /campaigns/new یا آدرس کامل https://example.com"
                error={fieldErrors.link}
              >
                <Input
                  id="banner-link"
                  dir="ltr"
                  className="text-start"
                  value={form.link}
                  onChange={(e) => update("link", e.target.value)}
                  placeholder="/campaigns/new"
                  aria-invalid={fieldErrors.link ? true : undefined}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field id="banner-description" label="توضیح کوتاه" error={fieldErrors.description}>
                <Textarea
                  id="banner-description"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="min-h-20"
                  placeholder="یک جملهٔ کوتاه برای زیر عنوان بنر"
                  aria-invalid={fieldErrors.description ? true : undefined}
                />
              </Field>
            </div>

            <Field id="banner-sort" label="ترتیب نمایش" hint="عدد کمتر، بالاتر نمایش داده می‌شود." error={fieldErrors.sortOrder}>
              <Input
                id="banner-sort"
                dir="ltr"
                className="text-start"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => update("sortOrder", e.target.value)}
                aria-invalid={fieldErrors.sortOrder ? true : undefined}
              />
            </Field>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update("isActive", e.target.checked)}
                  className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                بنر فعال باشد
              </label>
            </div>

            <Field id="banner-starts" label="زمان شروع نمایش" error={fieldErrors.startsAt}>
              <Input
                id="banner-starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => update("startsAt", e.target.value)}
              />
            </Field>

            <Field id="banner-ends" label="زمان پایان نمایش" error={fieldErrors.endsAt}>
              <Input
                id="banner-ends"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => update("endsAt", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              {(["desktopImage", "mobileImage"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    {key === "desktopImage" ? "تصویر دسکتاپ" : "تصویر موبایل"}
                    <span className="ms-1.5 text-xs font-normal text-slate-400">(اختیاری)</span>
                  </p>
                  {form[key] ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200">
                      <img src={form[key] ?? ""} alt="" className="h-28 w-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute end-2 top-2"
                        onClick={() => update(key, null)}
                      >
                        <Trash2 />
                        حذف
                      </Button>
                    </div>
                  ) : (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploading !== null}
                        onChange={(e) => void uploadImage(e, key)}
                      />
                      {uploading === key ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                      {uploading === key ? "در حال آپلود…" : "انتخاب تصویر"}
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={saving || uploading !== null}>
                {saving ? <><Loader2 className="animate-spin" />در حال ثبت…</> : <><Plus />ثبت بنر</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4 text-brand-600" />
            بنرهای ثبت‌شده
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : loadError ? (
            <Alert tone="warning">{loadError}</Alert>
          ) : banners.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="هنوز بنری ثبت نشده"
              description="از فرم بالا اولین بنر را بسازید تا در جایگاه انتخاب‌شده نمایش داده شود."
            />
          ) : (
            banners.map((banner) => (
              <article key={banner.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-40">
                  {banner.desktopImage || banner.mobileImage ? (
                    <img
                      src={banner.desktopImage ?? banner.mobileImage ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-400">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-navy-900">{banner.title}</h3>
                    <Badge tone={banner.isActive ? "success" : "neutral"}>{banner.isActive ? "فعال" : "غیرفعال"}</Badge>
                    <Badge tone="info">{placementLabel(banner.placement)}</Badge>
                    <span className="text-xs text-slate-400">ترتیب: {formatNumber(banner.sortOrder)}</span>
                  </div>
                  <p dir="ltr" className="mt-1 truncate text-start text-xs text-slate-500">{banner.link}</p>
                  {banner.description && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{banner.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {banner.startsAt ? `شروع: ${formatDate(banner.startsAt)}` : "بدون زمان شروع"}
                    {" · "}
                    {banner.endsAt ? `پایان: ${formatDate(banner.endsAt)}` : "بدون پایان"}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === banner.id}
                    onClick={() => void toggle(banner)}
                  >
                    {banner.isActive ? <EyeOff /> : <Eye />}
                    {banner.isActive ? "غیرفعال" : "فعال"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busyId === banner.id}
                    onClick={() => void remove(banner)}
                  >
                    <Trash2 />
                    حذف
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}