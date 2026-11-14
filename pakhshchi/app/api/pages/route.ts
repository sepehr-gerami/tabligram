import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, clientIp, readJson, tooManyRequests, withErrors } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { ensurePublisherProfile } from "@/lib/profiles";
import { parsePageInput } from "@/lib/page-rules";
import { isSafeImageUrl } from "@/lib/image-rules";
import type { PageStatus } from "@prisma/client";

export const runtime = "nodejs";

export const MAX_PAGES_PER_OWNER = 5;

/** پیج‌های من (همهٔ وضعیت‌ها) برای پنل صاحب پیج. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const pages = await prisma.instaPage.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, handle: true, url: true, title: true, category: true, city: true, bio: true,
        followers: true, avgStoryViews: true, avgPostViews: true, avgReelsViews: true,
        priceStory: true, pricePost: true, priceReels: true, status: true, rejectReason: true,
        avatarUrl: true, createdAt: true, updatedAt: true,
        verification: { select: { status: true } },
      },
    });
    return NextResponse.json(pages, { headers: { "Cache-Control": "no-store" } });
  });
}

/** ثبت پیج جدید؛ نیازمند ورود. پروفایل ناشر در اولین ثبت ساخته می‌شود. */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const user = await requireUser();
    const limited = hit(`page:create:${user.id}:${clientIp(req)}`, 10, 60 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

    const body = await readJson(req, 32_768);
    if (!body) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });

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

    const owned = await prisma.instaPage.count({ where: { ownerId: user.id } });
    if (owned >= MAX_PAGES_PER_OWNER) {
      return NextResponse.json({ error: `هر حساب حداکثر ${MAX_PAGES_PER_OWNER} پیج می‌تواند ثبت کند.` }, { status: 400 });
    }

    await ensurePublisherProfile(user.id);
    try {
      const page = await prisma.instaPage.create({
        data: {
          ownerId: user.id,
          handle: parsed.data.handle,
          url: url || null,
          title: parsed.data.title,
          category: parsed.data.category,
          city: parsed.data.city || null,
          bio: parsed.data.bio || null,
          followers: parsed.data.followers,
          avgStoryViews: parsed.data.avgStoryViews,
          avgPostViews: parsed.data.avgPostViews,
          avgReelsViews: parsed.data.avgReelsViews,
          priceStory: parsed.data.priceStory,
          pricePost: parsed.data.pricePost,
          priceReels: parsed.data.priceReels,
          avatarUrl: avatarUrl || null,
          status: "PENDING" satisfies PageStatus,
        },
        select: { id: true, handle: true, status: true, createdAt: true },
      });
      return NextResponse.json({ page, message: "پیج ثبت شد و در انتظار تأیید مدیر است." }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "این آیدی اینستاگرام قبلاً ثبت شده است.", fields: { handle: "این شناسه قبلاً ثبت شده است." } }, { status: 409 });
      }
      throw err;
    }
  });
}
