import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const publisher = await prisma.user.findUnique({
    where: { mobile: "09122222222" },
    select: {
      id: true,
      name: true,
      mobile: true,
      pages: {
        select: {
          id: true, handle: true, title: true, category: true, status: true,
          priceStory: true, pricePost: true, priceReels: true, followers: true,
        },
      },
      publisherProfile: {
        select: { payoutStatus: true, firstName: true, lastName: true, cardLast4: true },
      },
    },
  });
  const advertiser = await prisma.user.findUnique({
    where: { mobile: "09121111111" },
    select: { id: true, name: true, mobile: true },
  });
  console.log(JSON.stringify({ publisher, advertiser }, null, 2));
  await prisma.$disconnect();
}

void main();
