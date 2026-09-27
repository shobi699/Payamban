/**
 * Dayrect Pro / OpenReply — System & Infrastructure Health Check Script
 * Run: npx tsx scripts/health-check.ts
 */

import { prisma } from "../lib/db/client";
import { getRedisConnection, getDMQueue } from "../lib/queue/client";
import { getZarinpalConfig } from "../lib/billing/zarinpal";

async function runHealthCheck() {
  console.log("==================================================");
  console.log("🔍 بررسی سلامت زیرساخت سامانه دی‌رکت پرو (Dayrect Health Check)");
  console.log("==================================================");

  let hasError = false;

  // 1. PostgreSQL Database Check
  try {
    const startTime = Date.now();
    const userCount = await prisma.user.count();
    const latency = Date.now() - startTime;
    console.log(`✅ پایگاه داده PostgreSQL: متصل (${latency}ms) — تعداد کاربران: ${userCount}`);
  } catch (error) {
    hasError = true;
    console.error("❌ خطای ارتباط با دیتابیس PostgreSQL:", error);
  }

  // 2. Redis Connection Check
  try {
    const startTime = Date.now();
    const redis = getRedisConnection();
    const pingRes = await redis.ping();
    const latency = Date.now() - startTime;
    console.log(`✅ سرویس Redis: متصل (${latency}ms) — پاسخ: ${pingRes}`);
  } catch (error) {
    hasError = true;
    console.error("❌ خطای ارتباط با سرور Redis:", error);
  }

  // 3. BullMQ Queue Metrics
  try {
    const queue = getDMQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    console.log(`📊 وضعیت صف BullMQ (dm-processing):`);
    console.log(`   - جاب‌های در انتظار (Waiting): ${waiting}`);
    console.log(`   - جاب‌های در حال پردازش (Active): ${active}`);
    console.log(`   - جاب‌های تکمیل‌شده (Completed): ${completed}`);
    console.log(`   - جاب‌های ناموفق (Failed): ${failed}`);
  } catch (error) {
    console.warn("⚠️ عدم دسترسی به متریک‌های صف BullMQ:", error);
  }

  // 4. Commercial & Integration Settings
  try {
    const zarinpalConfig = await getZarinpalConfig();
    console.log(`💳 درگاه پرداخت زرین‌پال: ${zarinpalConfig.sandbox ? "حالت سندباکس/تست فعال" : "درگاه واقعی عملیاتی"} (Merchant: ${zarinpalConfig.merchantId.slice(0, 8)}...)`);
  } catch (error) {
    console.warn("⚠️ بارگذاری تنظیمات درگاه با خطا مواجه شد:", error);
  }

  // 5. Instagram Accounts Token Health
  try {
    const accounts = await prisma.instagramAccount.findMany({
      select: { username: true, tokenStatus: true, tokenExpiresAt: true },
    });
    console.log(`📱 وضعیت اکانت‌های اینستاگرام متصل (${accounts.length} اکانت):`);
    for (const acc of accounts) {
      console.log(`   - @${acc.username}: وضعیت توکن ${acc.tokenStatus} (انقضا: ${acc.tokenExpiresAt ? acc.tokenExpiresAt.toLocaleDateString("fa-IR") : "نامشخص"})`);
    }
  } catch (error) {
    console.warn("⚠️ بررسی اکانت‌های اینستاگرام انجام نشد:", error);
  }

  console.log("==================================================");
  if (hasError) {
    console.log("❌ بررسی سلامت با برخی خطاها پایان یافت.");
    process.exit(1);
  } else {
    console.log("✅ تمامی بخش‌های سیستم در وضعیت ایده‌آل و پایدار قرار دارند.");
    process.exit(0);
  }
}

void runHealthCheck();
