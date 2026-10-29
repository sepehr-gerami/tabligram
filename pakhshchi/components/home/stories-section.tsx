import { StoryRail } from "@/components/shared/story-rail";

/** Home section: active stories from approved pages (real Store data, not a static demo row). */
export function StoriesSection() {
  return (
    <section id="stories" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <StoryRail />
        <p className="text-xs text-slate-500">
          استوری‌ها را صاحبان پیج ثبت می‌کنند و فقط تا ۲۴ ساعت پس از ثبت در اینجا دیده می‌شوند.
        </p>
      </div>
    </section>
  );
}
