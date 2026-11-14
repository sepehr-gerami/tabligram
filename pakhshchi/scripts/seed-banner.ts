import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const desktopImage = "/api/files/banners/310584586f00806d41002c6f95900f60.png";
  const mobileImage = "/api/files/banners/bf86bbd687c6b2eec18698aa86af4a85.png";
  const existing = await prisma.banner.findFirst({ where: { desktopImage } });
  if (existing) {
    const updated = await prisma.banner.update({
      where: { id: existing.id },
      data: { mobileImage, isActive: true, placement: "HERO" },
    });
    console.log("updated banner:", updated.id);
  } else {
    const banner = await prisma.banner.create({
      data: {
        title: "تخفیف ویژه",
        description: "اولین کمپین تبلیغاتی خود را با ۲۰٪ تخفیف ثبت کنید؛ کد تخفیف TECH20.",
        link: "/campaigns/new",
        desktopImage,
        mobileImage,
        placement: "HERO",
        sortOrder: 0,
        isActive: true,
        createdById: admin?.id ?? null,
      },
    });
    console.log("created banner:", banner.id);
  }
  await prisma.$disconnect();
}

void main();
