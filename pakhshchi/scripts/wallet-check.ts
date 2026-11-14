import { PrismaClient } from "@prisma/client";
import { availableBalance } from "../lib/money-rules";

async function main() {
  const prisma = new PrismaClient();
  const advertiser = await prisma.user.findUnique({ where: { mobile: "09121111111" }, select: { id: true } });
  if (!advertiser) throw new Error("advertiser not found");
  const [deposits, holds] = await Promise.all([
    prisma.deposit.findMany({ where: { userId: advertiser.id, status: "VERIFIED" }, select: { amount: true } }),
    prisma.hold.findMany({ where: { advertiserId: advertiser.id }, select: { amount: true, status: true, orderId: true } }),
  ]);
  console.log(JSON.stringify({
    verifiedDeposits: deposits,
    holds,
    available: availableBalance(deposits.map((d) => d.amount), holds),
  }, null, 2));
  await prisma.$disconnect();
}

void main();
