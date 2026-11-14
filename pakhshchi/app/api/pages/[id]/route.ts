import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { hasEffectiveChange, parsePageInput, statusAfterOwnerEdit, type PageData } from "@/lib/page-rules";
import { isSafeImageUrl } from "@/lib/image-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const ID_RE = /^[A-Za-z0-9_-]{10,40}$/;

const notFound = () => NextResponse.json({ error: "پیج پیدا نشد." }, { status: 404 });

/** ویرایش پیج فقط توسط صاحب آن؛ تغییر مؤثر، پیج را دوباره به صف تأیید می‌فرستد. */
export async function PATCH(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    if (!ID_RE.test(id)) return notFound();

    const current = await prisma.instaPage.findFirst({ where: { id, ownerId: user.id } });
    if (!current) return notFound();
    if (current.status === "DISABLED") throw new HttpError(403, "این پیج توسط مدیر غیرفعال شده و قابل ویرایش نیست.");

    const body = await readJson(req, 32_768);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");
    const parsed = parsePageInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (url && !isSafeImageUrl(url)) {
      return NextResponse.json({ error: "لینک پیج معتبر نیست.", fields: { url: "آدرس کامل http/https وارد کنید." } }, { status: 400 });
    }
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (avatarUrl && !isSafeImageUrl(avatarUrl)) {
      return NextResponse.json({ error: "آدرس تصویر معتبر نیست.", fields: { avatarUrl: "آدرس تصویر معتبر نیست." } }, { status: 400 });
    }

    const before: PageData = {
      handle: current.handle, title: current.title, category: current.category as PageData["category"],
      city: current.city ?? "", bio: current.bio ?? "", followers: current.followers,
      avgStoryViews: current.avgStoryViews, avgPostViews: current.avgPostViews, avgReelsViews: current.avgReelsViews,
      priceStory: current.priceStory, pricePost: current.pricePost, priceReels: current.priceReels,
    };
    const changed = hasEffectiveChange(before, parsed.data, {
      avatarChanged: (avatarUrl || null) !== current.avatarUrl || (url || null) !== current.url,
    });
    const decision = statusAfterOwnerEdit(current.status, changed);
    if (!decision.ok) throw new HttpError(400, decision.error);

    try {
      const updated = await prisma.instaPage.update({
        where: { id },
        data: {
          ...parsed.data,
          city: parsed.data.city || null,
          bio: parsed.data.bio || null,
          url: url || null,
          avatarUrl: avatarUrl || null,
          status: decision.status,
          rejectReason: decision.resubmitted ? null : current.rejectReason,
        },
        select: { id: true, handle: true, title: true, status: true, rejectReason: true, updatedAt: true },
      });
      return NextResponse.json({
        page: updated,
        message: decision.resubmitted ? "ذخیره شد؛ پیج دوباره برای تأیید مدیر ارسال شد." : "ذخیره شد.",
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "این آیدی اینستاگرام قبلاً ثبت شده است.", fields: { handle: "این شناسه قبلاً ثبت شده است." } }, { status: 409 });
      }
      throw err;
    }
  });
}

/** حذف پیج فقط وقتی هیچ سفارشی (حتی بسته‌شده) به آن وابسته نباشد. */
export async function DELETE(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    if (!ID_RE.test(id)) return notFound();

    const page = await prisma.instaPage.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
    if (!page) return notFound();

    const orders = await prisma.order.count({ where: { pageId: id } });
    if (orders > 0) {
      throw new HttpError(409, "این پیج سابقهٔ سفارش دارد و برای حفظ سوابق مالی قابل حذف نیست.");
    }

    await prisma.instaPage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
