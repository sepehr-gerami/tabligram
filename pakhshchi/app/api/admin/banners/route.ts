import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, badRequest, readJson, withErrors } from "@/lib/api";
import { parseBannerInput } from "@/lib/banner-rules";

export const runtime = "nodejs";

/** فهرست همهٔ بنرها (فعال، غیرفعال و زمان‌بندی‌شده) فقط برای مدیر. */
export async function GET() {
  return withErrors(async () => {
    await requireAdmin();
    const rows = await prisma.banner.findMany({
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  });
}

/** ساخت بنر جدید. تصویرها قبلاً با /api/admin/uploads آپلود شده‌اند و اینجا فقط آدرسشان می‌آید. */
export async function POST(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const body = await readJson(req);
    if (!body) return badRequest("درخواست نامعتبر است.");

    const parsed = parseBannerInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: Object.values(parsed.errors)[0], fields: parsed.errors }, { status: 400 });
    }

    const banner = await prisma.$transaction(async (tx) => {
      const created = await tx.banner.create({ data: { ...parsed.data, createdById: admin.id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "BANNER_CREATE",
          entity: "Banner",
          entityId: created.id,
          meta: JSON.stringify({ title: created.title, placement: created.placement }),
        },
      });
      return created;
    });
    return NextResponse.json(banner, { status: 201 });
  });
}