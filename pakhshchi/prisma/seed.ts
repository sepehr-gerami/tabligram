// Seed تبلیگرام.
//  - توسعه (پیش‌فرض): ادمین + یک تبلیغ‌کننده و صاحب پیج نمونه، پیج‌ها، بنر و یک کمپین با سفارش و پرداخت مستقیم.
//  - production: فقط ادمین، آن هم فقط اگر ADMIN_MOBILE و ADMIN_PASSWORD در env تنظیم شده باشد. داده/رمز دمو ساخته نمی‌شود.
// اجرا: npx prisma db seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";
const DEMO_PASSWORD = "Demo@12345";

async function ensureAdmin() {
  const mobile = process.env.ADMIN_MOBILE?.trim() || (isProd ? "" : "09120000000");
  const password = process.env.ADMIN_PASSWORD || (isProd ? "" : "Admin@12345");
  if (!mobile || !password) {
    console.log("seed: ADMIN_MOBILE / ADMIN_PASSWORD تنظیم نشده؛ ادمین ساخته نشد.");
    return null;
  }
  if (!/^09\d{9}$/.test(mobile)) throw new Error("ADMIN_MOBILE باید به شکل 09xxxxxxxxx باشد.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD باید حداقل ۸ کاراکتر باشد.");
  // update خالی است: رمز ادمینِ موجود هرگز با seed بازنویسی نمی‌شود.
  return prisma.user.upsert({
    where: { mobile },
    update: {},
    create: { mobile, passwordHash: await bcrypt.hash(password, 12), name: "مدیر تبلیگرام", role: "ADMIN", trustScore: 100 },
  });
}

async function seedDemo(adminId: string | null) {
  const pw = await bcrypt.hash(DEMO_PASSWORD, 12);

  const advUser = await prisma.user.upsert({
    where: { mobile: "09121111111" },
    update: {},
    create: {
      mobile: "09121111111", passwordHash: pw, name: "تبلیغ‌کننده نمونه",
      advertiserProfile: { create: { businessName: "مزون آرمان" } },
    },
  });

  const pubUser = await prisma.user.upsert({
    where: { mobile: "09122222222" },
    update: {},
    create: {
      mobile: "09122222222", passwordHash: pw, name: "صاحب پیج نمونه",
      publisherProfile: { create: { payoutCard: "6037-9975-1234-5678", bio: "پیج پوشاک و استایل" } },
    },
  });

  const page = await prisma.instaPage.upsert({
    where: { handle: "@mode_dar_tehran" },
    update: {},
    create: {
      ownerId: pubUser.id, handle: "@mode_dar_tehran", title: "مدِ تهران", category: "fashion", city: "تهران",
      bio: "پوشاک و استایل روزانهٔ زنانه", followers: 182000, avgPostViews: 40000, avgReelsViews: 55000,
      pricePost: 1500000, priceReels: 1800000, status: "APPROVED",
      verification: { create: { status: "VERIFIED", method: "BIO_CODE", verifiedAt: new Date() } },
    },
  });

  const page2 = await prisma.instaPage.upsert({
    where: { handle: "@tech_negar" },
    update: {},
    create: {
      ownerId: pubUser.id, handle: "@tech_negar", title: "تک‌نگار", category: "tech", city: "تهران",
      bio: "اخبار و بررسی گجت‌ها", followers: 240000, avgPostViews: 62000, avgReelsViews: 90000,
      pricePost: 1800000, priceReels: 2200000, status: "PENDING",
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { orderNumber: "PK-100231" },
    update: {},
    create: {
      orderNumber: "PK-100231", advertiserId: advUser.id, title: "کلکسیون پاییزه کت و پالتو",
      business: "مزون آرمان", description: "کلکسیون جدید با ارسال رایگان.", link: "https://example.com/armaan",
      budget: 6000000, publishType: "post", category: "fashion", city: "تهران", status: "RUNNING",
    },
  });

  const existingOrder = await prisma.order.findFirst({ where: { campaignId: campaign.id, pageId: page.id } });
  if (!existingOrder) {
    await prisma.order.create({
      data: {
        campaignId: campaign.id, pageId: page.id, amount: 1500000, publishType: "post",
        publishAt: new Date(Date.now() + 3 * 864e5), terms: "پست اینستاگرامی + ذکر پیج برند",
        status: "PARTIALLY_PAID",
        payments: {
          create: {
            stage: "STAGE1", amount: 600000, method: "کارت به کارت", reference: "TRX-100231-1",
            status: "CONFIRMED", confirmedAt: new Date(), confirmedByPage: true,
          },
        },
      },
    });
  }

  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "تبلیغ در تبلیگرام برای کسب‌وکار شما", description: "یک کمپین، ده‌ها پیج مرتبط.",
          link: "/campaigns/new", placement: "HERO", sortOrder: 1, isActive: true, createdById: adminId,
        },
        {
          title: "به جمع صاحبان پیج بپیوندید", description: "از پیج خودت درآمد بساز.",
          link: "/publisher/dashboard", placement: "HERO", sortOrder: 2, isActive: true, createdById: adminId,
        },
      ],
    });
  }

  console.log(`seed: داده‌های نمونه آماده است — تبلیغ‌کننده 09121111111 و صاحب پیج 09122222222 با رمز ${DEMO_PASSWORD}`);
  console.log("seed: پیج‌ها:", page.handle, page2.handle);
}

async function main() {
  const admin = await ensureAdmin();
  if (admin) console.log("seed: ادمین آماده:", admin.mobile);
  if (isProd) return;
  await seedDemo(admin?.id ?? null);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
