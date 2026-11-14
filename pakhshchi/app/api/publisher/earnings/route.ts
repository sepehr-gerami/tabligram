import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrors } from "@/lib/api";
import { publisherEarnings } from "@/lib/wallet";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** خلاصهٔ درآمد صاحب پیج (خالص پس از کمیسیون) و وضعیت کارت پرداخت. */
export async function GET() {
  return withErrors(async () => {
    const user = await requireUser();
    const [earnings, profile] = await Promise.all([
      publisherEarnings(user.id),
      prisma.publisherProfile.findUnique({
        where: { userId: user.id },
        select: { payoutStatus: true, cardLast4: true, payoutRejectReason: true },
      }),
    ]);
    return NextResponse.json(
      { ...earnings, payoutStatus: profile?.payoutStatus ?? "NONE", cardLast4: profile?.cardLast4 ?? null, payoutRejectReason: profile?.payoutRejectReason ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
