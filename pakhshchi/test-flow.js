const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // برای ساخت رمز عبور
const prisma = new PrismaClient();
const BASE_URL = 'http://127.0.0.1:3000';

// تابع برای ارسال درخواست‌ها
async function apiCall(method, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json', 'Origin': BASE_URL };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`API Error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// تابع برای لاگین کردن و گرفتن کوکی واقعی
async function loginUser(mobile, password) {
  // آدرس را به localhost برمی‌گردانیم تا با تنظیمات پیش‌فرض Next.js یکی باشد
  const url = `http://localhost:3000/api/auth/login`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({ mobile, password })
  });
  
  if (!res.ok) {
    // اینجا متن دقیق ارور را چاپ می‌کنیم
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Login failed (Status ${res.status}): ${JSON.stringify(errorData)}`);
  }
  
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error("No cookie returned");
  return setCookie.split(';')[0]; 
}

async function main() {
  console.log("⏳ در حال آماده‌سازی دیتابیس تست...");
  
  const uniqueTime = Date.now().toString().slice(-7); // ۷ رقم آخر
  const advMobile = '0912' + uniqueTime; // ۴ + ۷ = ۱۱ رقم
  const pubMobile = '0913' + uniqueTime; // ۴ + ۷ = ۱۱ رقم
  const handleName = 'test_page_' + uniqueTime;
  const orderNo = 'CMP-' + uniqueTime;
  const testPassword = 'test1234';

  // هش کردن رمز عبور
  const passwordHash = await bcrypt.hash(testPassword, 10);

  // 1. ساخت کاربران با رمز عبور واقعی
  const advertiser = await prisma.user.create({
    data: { mobile: advMobile, name: 'تبلیغ دهنده تست', passwordHash, role: 'USER' }
  });
  const publisher = await prisma.user.create({
    data: { mobile: pubMobile, name: 'صاحب پیج تست', passwordHash, role: 'USER' }
  });

  // 2. ساخت پروفایل‌ها
  await prisma.advertiserProfile.create({ data: { userId: advertiser.id, businessName: 'کسب و کار تست' } });
  await prisma.publisherProfile.create({ data: { userId: publisher.id, payoutStatus: 'VERIFIED' } });

  // 3. ساخت پیج (تایید شده)
  const page = await prisma.instaPage.create({
    data: {
      ownerId: publisher.id, handle: handleName, title: 'پیج تست', category: 'مد و پوشاک',
      status: 'APPROVED', priceStory: 500000, pricePost: 1000000, priceReels: 1500000
    }
  });

  // 4. ساخت واریزی تایید شده
  await prisma.deposit.create({
    data: { userId: advertiser.id, amount: 3000000, reference: 'REF-' + uniqueTime, status: 'VERIFIED' }
  });

  // 5. ساخت کمپین
  const campaign = await prisma.campaign.create({
    data: {
      orderNumber: orderNo, advertiserId: advertiser.id, title: 'کمپین تست',
      business: 'کسب و کار تست', description: 'توضیحات تست', link: 'https://example.com',
      budget: 2000000, category: 'مد و پوشاک', 
      publishType: 'story', 
      publishTypes: 'story,post', status: 'APPROVED'
    }
  });

  console.log(`✅ دیتابیس آماده شد. (شماره تبلیغ‌دهنده: ${advMobile} | رمز: ${testPassword})\n`);

  // ورود واقعی با API
  const advCookie = await loginUser(advMobile, testPassword);
  const pubCookie = await loginUser(pubMobile, testPassword);

  // ==========================================
  // شروع تست چرخه
  // ==========================================

  console.log("🔍 ۱. تبلیغ‌دهنده درخواست لیست پیج‌های مناسب را می‌دهد...");
  const matched = await apiCall('GET', `/api/campaigns/${campaign.id}/matching-pages`, null, advCookie);
  console.log(`- تعداد پیج‌های مناسب: ${matched.length} | پیج: ${matched[0]?.title}`);
  
  console.log("\n💸 ۲. تبلیغ‌دهنده پیج را انتخاب می‌کند (بلوکه شدن پول)...");
  const orderResult = await apiCall('POST', `/api/campaigns/${campaign.id}/select-page`, { pageId: page.id, publishType: 'story' }, advCookie);
  const orderId = orderResult.orderId;
  
  let order = await prisma.order.findUnique({ where: { id: orderId }, include: { hold: true } });
  console.log(`- وضعیت سفارش: ${order.status} | وضعیت بلوکه: ${order.hold.status} | مبلغ: ${order.amount}`);

  console.log("\n🤝 ۳. صاحب پیج درخواست را می‌پذیرد...");
  await apiCall('POST', `/api/orders/${orderId}/respond`, { action: 'accept' }, pubCookie);
  
  order = await prisma.order.findUnique({ where: { id: orderId }, include: { hold: true } });
  console.log(`- وضعیت سفارش: ${order.status} | آیا هویت آشکار شد؟ ${order.revealedAt !== null ? 'بله' : 'خیر'}`);

  console.log("\n📸 ۴. صاحب پیج مدرک انتشار (لینک و آمار) را ثبت می‌کند...");
  await apiCall('POST', `/api/orders/${orderId}/proof`, { 
    postLink: 'https://instagram.com/p/123', 
    statsImage: 'https://example.com/stats.jpg' 
  }, pubCookie);
  
  order = await prisma.order.findUnique({ where: { id: orderId }, include: { hold: true } });
  console.log(`- وضعیت سفارش: ${order.status} | زمان ثبت مدرک: ${order.proofSubmittedAt !== null ? 'ثبت شد' : 'خیر'}`);

  console.log("\n✅ ۵. تبلیغ‌دهنده مدرک را تایید می‌کند...");
  await apiCall('POST', `/api/orders/${orderId}/confirm`, {}, advCookie);
  
  order = await prisma.order.findUnique({ where: { id: orderId }, include: { hold: true } });
  console.log(`- وضعیت سفارش: ${order.status} | وضعیت بلوکه: ${order.hold.status}`);
  console.log(`- زمان مجاز پرداخت (payoutDueAt): ${order.hold.payoutDueAt ? 'تنظیم شد' : 'تنظیم نشد'}`);

  console.log("\n🎉 تست با موفقیت به پایان رسید. کل چرخه درست کار می‌کند!");
}

main()
  .catch(e => console.error("❌ خطا در تست:", e.message))
  .finally(() => prisma.$disconnect());