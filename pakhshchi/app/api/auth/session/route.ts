import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, ok, withErrors } from "@/lib/api";

/** کاربر فعلی (یا null) با پرچم‌های isAdmin / isAdvertiser / isPublisher. */
export async function GET() {
  return withErrors(async () => {
    const user = await getCurrentUser();
    return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
  });
}

/** خروج. */
export async function DELETE(req: Request) {
  return withErrors(async () => {
    assertSameOrigin(req);
    await destroySession();
    return ok({ ok: true });
  });
}
