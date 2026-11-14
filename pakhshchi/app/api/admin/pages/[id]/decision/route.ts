import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth";
import { assertSameOrigin, readJson, withErrors } from "@/lib/api";
import { adminTransition, parseRejectReason, type AdminAction } from "@/lib/page-rules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const ACTIONS: AdminAction[] = ["approve", "reject", "disable", "restore"];

/** تأیید/رد/غیرفعال‌سازی پیج با کنترل گذار وضعیت و ثبت در AuditLog. */
export async function POST(req: Request, { params }: Ctx) {
  return withErrors(async () => {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJson(req, 4_096);
    if (!body) throw new HttpError(400, "درخواست نامعتبر است.");

    const action = body.action;
    if (typeof action !== "string" || !ACTIONS.includes(action as AdminAction)) {
      throw new HttpError(400, "عملیات معتبر نیست.");
    }

    const page = await prisma.instaPage.findUnique({ where: { id }, select: { id: true, status: true, handle: true } });
    if (!page) return NextResponse.json({ error: "پیج پیدا نشد." }, { status: 404 });

    const next = adminTransition(page.status, action as AdminAction);
    if (!next) throw new HttpError(400, "این تغییر وضعیت از وضعیت فعلی مجاز نیست.");

    let reason: string | null = null;
    if (action === "reject") {
      const parsed = parseRejectReason(body.reason);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error, fields: { reason: parsed.error } }, { status: 400 });
      reason = parsed.reason;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.instaPage.updateMany({
        where: { id, status: page.status },
        data: { status: next, rejectReason: reason },
      });
      if (updated.count !== 1) throw new HttpError(409, "وضعیت پیج هم‌زمان تغییر کرده است؛ صفحه را تازه کنید.");
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: `PAGE_${action.toUpperCase()}`,
          entity: "InstaPage",
          entityId: page.id,
          meta: JSON.stringify({ handle: page.handle, from: page.status, to: next, reason }),
        },
      });
      return tx.instaPage.findUnique({ where: { id }, select: { id: true, status: true, rejectReason: true } });
    });

    return NextResponse.json({ page: result, message: "وضعیت پیج به‌روزرسانی شد." });
  });
}
