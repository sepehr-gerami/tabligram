"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Ban, Clock, Eye, Film, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, describe } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ReadyGate } from "@/components/shared/ready-gate";
import { ACCEPTED_MEDIA, MAX_FILE_MB, STORY_LIFETIME_HOURS } from "@/lib/constants";
import { ownedPages, storyStatus } from "@/lib/pages";
import { useStore } from "@/lib/store";
import { cn, formatBytes, formatNumber } from "@/lib/utils";
import { validateMedia, validateStory } from "@/lib/validation";
import type { Story } from "@/types";

const STATUS_META = {
  active: { label: "فعال", tone: "success" as const },
  expired: { label: "منقضی‌شده", tone: "neutral" as const },
  disabled: { label: "غیرفعال", tone: "warning" as const },
};

/** Owner-side story management: add (with real preview), enable/disable, delete. */
export function StoryManager() {
  const { pages, stories, addStory, setStoryDisabled, removeStory } = useStore();
  const toast = useToast();
  const mine = ownedPages(pages);
  const [pageId, setPageId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ caption?: string; media?: string }>({});
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Re-evaluate expiry once a minute instead of freezing the status at mount.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const myIds = new Set(mine.map((p) => p.id));
  const list = stories.filter((s) => myIds.has(s.pageId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const targetPage = mine.find((p) => p.id === pageId) ?? mine[0];

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!picked) return;
    const problem = validateMedia(picked);
    setErrors((p) => ({ ...p, media: problem }));
    setFile(problem ? null : picked);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateStory({ caption, media: file });
    if (!targetPage) found.caption = undefined;
    if (!targetPage) {
      toast({ tone: "error", title: "ابتدا یک پیج ثبت کنید", description: "استوری باید به یکی از پیج‌های تأییدشدهٔ شما تعلق داشته باشد." });
      return;
    }
    setErrors((p) => ({ ...p, caption: found.caption }));
    if (Object.values({ ...errors, caption: found.caption }).some(Boolean)) return;

    setSaving(true);
    // Demo only: the object URL lives until the tab is reloaded; nothing is uploaded.
    await new Promise((r) => setTimeout(r, 400));
    addStory({ pageId: targetPage.id, caption, mediaUrl: previewUrl, mediaKind: file ? (file.type.startsWith("video") ? "video" : "image") : null });
    setSaving(false);
    setCaption("");
    setFile(null);
    setErrors({});
    toast({ tone: "success", title: "استوری ثبت شد", description: `${STORY_LIFETIME_HOURS} ساعت در این مرورگر فعال می‌ماند.` });
  }

  return (
    <ReadyGate>
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_16rem]">
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
              <Field id="story-page" label="پیج" required>
                <Select id="story-page" value={targetPage?.id ?? ""} onChange={(e) => setPageId(e.target.value)} disabled={mine.length === 0}>
                  {mine.length === 0 && <option value="">پیجی ندارید</option>}
                  {mine.map((p) => <option key={p.id} value={p.id}>{p.title || p.handle}{p.approval !== "approved" ? " (در انتظار تأیید)" : ""}</option>)}
                </Select>
              </Field>
              <Field id="story-media" label="تصویر یا ویدئو" error={errors.media} hint={`حداکثر ${formatNumber(MAX_FILE_MB)} مگابایت`}>
                <div className="flex items-center gap-2">
                  <input id="story-media" type="file" accept={ACCEPTED_MEDIA.join(",")} onChange={onFile} className="peer sr-only" />
                  <label htmlFor="story-media" className={cn("inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100", errors.media ? "border-red-500" : "border-slate-300")}>
                    {file?.type.startsWith("video") ? <Film aria-hidden className="size-4" /> : <ImageIcon aria-hidden className="size-4" />}
                    {file ? "تغییر فایل" : "انتخاب فایل"}
                  </label>
                  {file && <span dir="ltr" className="truncate text-xs text-slate-500">{file.name} · {formatBytes(file.size)}</span>}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field id="story-caption" label="متن استوری" error={errors.caption} hint="حداکثر ۱۲۰ حرف">
                  <Textarea {...describe("story-caption", errors.caption, true)} className="min-h-20" value={caption} onChange={(e) => { setCaption(e.target.value); setErrors((p) => ({ ...p, caption: undefined })); }} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving || mine.length === 0}>
                  {saving ? <><Loader2 className="animate-spin" />در حال ثبت…</> : <><Plus />ثبت استوری</>}
                </Button>
              </div>
            </form>

            <div aria-label="پیش‌نمایش استوری" className="space-y-2">
              <p className="text-sm font-medium text-slate-800">پیش‌نمایش</p>
              <div className="grid aspect-[9/16] max-h-64 place-items-center overflow-hidden rounded-xl bg-navy-900">
                {previewUrl && file?.type.startsWith("video") && <video src={previewUrl} muted playsInline controls className="size-full object-contain" />}
                {previewUrl && !file?.type.startsWith("video") && (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={previewUrl} alt="پیش‌نمایش استوری" className="size-full object-contain" />
                )}
                {!previewUrl && <p className="px-3 text-center text-xs text-white/70">تصویر یا ویدئو را انتخاب کنید</p>}
              </div>
              {caption && <p className="rounded-lg bg-mist p-2 text-xs leading-5 text-slate-700">{caption}</p>}
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-3 text-sm text-slate-600">
            {formatNumber(list.length)} استوری ثبت‌شده · {formatNumber(list.filter((s) => storyStatus(s, now) === "active").length)} فعال
          </p>
          {list.length === 0 ? (
            <EmptyState icon={ImageIcon} title="هنوز استوری ثبت نکرده‌اید" description="استوری‌های فعال در صفحهٔ اصلی سایت به نمایش درمی‌آیند." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => <StoryRow key={s.id} story={s} pageName={mine.find((p) => p.id === s.pageId)?.title || s.pageId} now={now}
                onToggle={() => { setStoryDisabled(s.id, !s.disabled); toast({ tone: "info", title: s.disabled ? "استوری فعال شد" : "استوری غیرفعال شد" }); }}
                onDelete={() => { removeStory(s.id); toast({ tone: "info", title: "استوری حذف شد" }); }} />)}
            </ul>
          )}
        </div>
      </div>
    </ReadyGate>
  );
}

function StoryRow({ story, pageName, now, onToggle, onDelete }: {
  story: Story; pageName: string; now: number; onToggle: () => void; onDelete: () => void;
}) {
  const status = storyStatus(story, now);
  const meta = STATUS_META[status];
  return (
    <li>
      <Card className="space-y-3 p-3">
        <div className="flex items-start gap-3">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-mist">
            {story.mediaUrl && story.mediaKind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={story.mediaUrl} alt="" className="size-full object-cover" />
            )}
            {story.mediaUrl && story.mediaKind === "video" && <Film aria-hidden className="size-6 text-slate-400" />}
            {!story.mediaUrl && <ImageIcon aria-hidden className="size-6 text-slate-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-navy-900">{pageName}</p>
              <Badge tone={meta.tone} className="ms-auto">{meta.label}</Badge>
            </div>
            {story.caption && <p className="line-clamp-2 text-xs leading-5 text-slate-600">{story.caption}</p>}
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <Clock aria-hidden className="size-3" />
              {status === "expired" ? "پایان نمایش" : "انقضا"}: {new Date(story.expiresAt).toLocaleString("fa-IR")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onToggle} disabled={status === "expired"}>
            {story.disabled ? <><Eye />فعال‌کردن</> : <><Ban />غیرفعال‌کردن</>}
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 />حذف</Button>
        </div>
      </Card>
    </li>
  );
}
