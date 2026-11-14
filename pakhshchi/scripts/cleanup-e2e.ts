import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const campaigns = await prisma.campaign.findMany({
    where: { title: "کمپین تست سرتاسری جریان پول" },
    select: { id: true, orderNumber: true, orders: { select: { id: true, hold: { select: { id: true } } } } },
  });
  const orderIds = campaigns.flatMap((c) => c.orders.map((o) => o.id));
  const holdIds = campaigns.flatMap((c) => c.orders.map((o) => o.hold?.id).filter((id): id is string => Boolean(id)));

  console.log("E2E campaigns:", campaigns.map((c) => ({ id: c.id, orderNumber: c.orderNumber, orders: c.orders.length })));

  if (holdIds.length) {
    await prisma.auditLog.deleteMany({ where: { action: "HOLD_PAYOUT", entityId: { in: holdIds } } });
    await prisma.hold.deleteMany({ where: { id: { in: holdIds } } });
  }
  if (orderIds.length) {
    await prisma.report.deleteMany({ where: { disputeOrderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  if (campaigns.length) {
    await prisma.campaign.deleteMany({ where: { id: { in: campaigns.map((c) => c.id) } } });
  }

  const deposits = await prisma.deposit.findMany({
    where: { reference: { startsWith: "E2E-" } },
    select: { id: true, amount: true, status: true, reference: true },
  });
  console.log("E2E deposits:", deposits);
  if (deposits.length) {
    const ids = deposits.map((d) => d.id);
    await prisma.auditLog.deleteMany({ where: { entity: "Deposit", entityId: { in: ids } } });
    await prisma.deposit.deleteMany({ where: { id: { in: ids } } });
  }

  const publisher = await prisma.user.findUnique({ where: { mobile: "09122222222" }, select: { id: true } });
  if (publisher) {
    const profile = await prisma.publisherProfile.findUnique({ where: { userId: publisher.id }, select: { id: true } });
    if (profile) {
      await prisma.auditLog.deleteMany({ where: { entity: "PublisherProfile", entityId: profile.id } });
      await prisma.publisherProfile.update({
        where: { id: profile.id },
        data: {
          payoutStatus: "NONE",
          payoutCard: null,
          nationalIdEnc: null,
          cardLast4: null,
          firstName: null,
          lastName: null,
          payoutSubmittedAt: null,
          payoutReviewedAt: null,
          payoutReviewedById: null,
          payoutRejectReason: null,
        },
      });
      console.log("publisher payout profile reset:", profile.id);
    }
  }

  console.log("cleanup done");
  await prisma.$disconnect();
}

void main();
