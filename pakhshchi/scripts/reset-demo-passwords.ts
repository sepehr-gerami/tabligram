import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const accounts = [
    { mobile: "09120000000", password: "Admin@12345" },
    { mobile: "09121111111", password: "Demo@12345" },
    { mobile: "09122222222", password: "Demo@12345" },
  ];
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const result = await prisma.user.updateMany({ where: { mobile: account.mobile }, data: { passwordHash } });
    console.log(`${account.mobile}: ${result.count} updated`);
  }
  await prisma.$disconnect();
}

void main();
