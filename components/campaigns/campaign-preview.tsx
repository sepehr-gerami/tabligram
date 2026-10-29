import { Film, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { categoryLabel, typeLabel } from "@/lib/constants";
import { cn, formatToman, parseAmount } from "@/lib/utils";
import type { CampaignValues } from "@/lib/validation";

interface Props { values: CampaignValues; previewUrl: string | null; mediaKind: "image" | "video" | null }

export function CampaignPreview({ values, previewUrl, mediaKind }: Props) {
  const tall = values.publishType === "story" || values.publishType === "reels";
  const budget = parseAmount(values.budget);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <span className="grid size-10 place-items-center rounded-full bg-brand-600 font-bold text-white">{(values.business.trim()[0] ?? "؟")}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy-900">{values.business.trim() || "نام کسب‌وکار"}</p>
          <p className="text-xs text-slate-500">تبلیغ · پیش‌نمایش</p>
        </div>
        {values.publishType && <Badge tone="info" className="ms-auto">{typeLabel(values.publishType)}</Badge>}
      </div>
      <div className={cn("grid place-items-center bg-mist", tall ? "mx-auto aspect-[9/14] max-h-80" : "aspect-square")}>
        {previewUrl && mediaKind === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={previewUrl} alt="پیش‌نمایش تصویر تبلیغ" className="size-full object-cover" />}
        {previewUrl && mediaKind === "video" && <video src={previewUrl} controls muted playsInline className="size-full object-cover" aria-label="پیش‌نمایش ویدئوی تبلیغ" />}
        {!previewUrl && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            {values.publishType === "reels" ? <Film aria-hidden className="size-9" /> : <ImageIcon aria-hidden className="size-9" />}
            <span className="text-xs">تصویر یا ویدئوی شما اینجا دیده می‌شود</span>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className={cn("font-bold", values.title.trim() ? "text-navy-900" : "text-slate-400")}>{values.title.trim() || "عنوان تبلیغ شما"}</p>
          <p className={cn("mt-1 line-clamp-3 text-sm leading-7", values.description.trim() ? "text-slate-600" : "text-slate-400")}>{values.description.trim() || "توضیحات محصول یا خدمات در این بخش نمایش داده می‌شود."}</p>
        </div>
        {values.link.trim() && <p dir="ltr" className="truncate text-start text-xs text-brand-700">{values.link.trim()}</p>}
        <div className="flex flex-wrap gap-1.5">
          {values.category && <Badge>{categoryLabel(values.category)}</Badge>}
          {values.region.trim() && <Badge>{values.region.trim()}</Badge>}
          {budget > 0 && <Badge tone="success">{formatToman(budget)}</Badge>}
        </div>
      </div>
    </Card>
  );
}
