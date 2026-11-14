import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, mobile: true, role: true, status: true, passwordHash: true },
    orderBy: { createdAt: "asc" },
  });
  const candidates = ["Demo@12345", "Admin@12345", "demo1234", "password", "12345678", "Demo@1234"];
  for (const u of users) {
    const matches: string[] = [];
    for (const p of candidates) {
      if (await bcrypt.compare(p, u.passwordHash)) matches.push(p);
    }
    console.log(`${u.mobile} | ${u.name} | ${u.role} | ${u.status} | ${matches.join(",") || "NO_MATCH"}`);
  }
  await prisma.$disconnect();
}

void main();
