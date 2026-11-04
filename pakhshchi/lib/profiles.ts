// پروفایل‌ها جایگزین «انتخاب نقش» هستند: کاربر هنگام ثبت‌نام نقش انتخاب نمی‌کند؛
// وقتی برای اولین بار کمپین می‌سازد یا پیج ثبت می‌کند، پروفایل مربوط ساخته می‌شود.
// این توابع idempotent هستند و باید از API های «ساخت کمپین» و «ثبت پیج» صدا زده شوند.
import { prisma } from "@/lib/db";

export const ensureAdvertiserProfile = (userId: string, businessName: string) =>
  prisma.advertiserProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, businessName: businessName.trim() },
  });

export const ensurePublisherProfile = (userId: string) =>
  prisma.publisherProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
