import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, badRequest, readJson, withErrors } from "@/lib/api";
import { checkBannerWindow, parseBannerPatch } from "@/lib/banner-rules";
import { deleteStoredBannerImage } from "@/lib/storage";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{10,40}$/;
type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "بنر پیدا نشد." }, { status: 404 });

/** فایل تصویر فقط وقتی پاک می‌شود که هیچ بنر دیگری از همان آدرس استفاده نکند. */
async function deleteImageIfUnused(url: string | null): Promise<void> {
  if (!url) return;
  const stillUsed = await prisma.banner.count({ where: { OR: [{ desktopImage: url }, { mobileImage: url }] } });
  if (stillUsed === 0) await deleteStoredBannerImage(url).catch(() => undefined);
}

/** ویرایش جزئی بنر: فقط فیلدهای فرستاده‌شده تغییر می‌کنند. */
export async function PATCH(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;
    if (!ID_RE.test(id)) return notFound();

    const body = await readJson(req);
    if (!body) return badRequest("درخواست نامعتبر است.");
    const parsed = parseBannerPatch(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    const current = await prisma.banner.findUnique({ where: { id } });
    if (!current) return notFound();

    // بازهٔ نمایش باید روی مقدار نهایی (ترکیب فرستاده‌شده و ذخیره‌شده) هم درست باشد
    const startsAt = parsed.data.startsAt !== undefined ? parsed.data.startsAt : current.startsAt;
    const endsAt = parsed.data.endsAt !== undefined ? parsed.data.endsAt : current.endsAt;
    const windowError = checkBannerWindow(startsAt, endsAt);
    if (windowError) return NextResponse.json({ error: windowError, fields: { endsAt: windowError } }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.banner.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "BANNER_UPDATE",
          entity: "Banner",
          entityId: id,
          meta: JSON.stringify({ fields: Object.keys(parsed.data) }),
        },
      });
      return row;
    });

    // تصویرهای جایگزین‌شده بعد از ثبت موفق پاک می‌شوند
    if (current.desktopImage && current.desktopImage !== updated.desktopImage) await deleteImageIfUnused(current.desktopImage);
    if (current.mobileImage && current.mobileImage !== updated.mobileImage) await deleteImageIfUnused(current.mobileImage);
    return NextResponse.json(updated);
  });
}

/** حذف بنر و تصویرهایی که دیگر هیچ بنری از آن‌ها استفاده نمی‌کند. */
export async function DELETE(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;
    if (!ID_RE.test(id)) return notFound();

    const current = await prisma.banner.findUnique({ where: { id } });
    if (!current) return notFound();

    await prisma.$transaction(async (tx) => {
      await tx.banner.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "BANNER_DELETE",
          entity: "Banner",
          entityId: id,
          meta: JSON.stringify({ title: current.title, placement: current.placement }),
        },
      });
    });

    await deleteImageIfUnused(current.desktopImage);
    await deleteImageIfUnused(current.mobileImage);
    return NextResponse.json({ ok: true });
  });
}