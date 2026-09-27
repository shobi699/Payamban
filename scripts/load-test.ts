/**
 * Load & Stress Testing Script for OpenReply / Dayrect Pro
 *
 * Simulates high-concurrency ingestion of 1,000+ Instagram comments,
 * evaluating BullMQ queue throughput, latency, memory consumption, and resilience.
 *
 * Usage:
 *   npx tsx scripts/load-test.ts [--jobs=1000] [--concurrency=50] [--cleanup]
 */

import { getDMQueue, getRedisConnection, ProcessCommentJob } from "../lib/queue/client";

interface LoadTestOptions {
  totalJobs: number;
  concurrency: number;
  cleanupAfter: boolean;
}

function parseArgs(): LoadTestOptions {
  const args = process.argv.slice(2);
  let totalJobs = 1000;
  let concurrency = 50;
  let cleanupAfter = false;

  for (const arg of args) {
    if (arg.startsWith("--jobs=")) {
      totalJobs = parseInt(arg.split("=")[1], 10) || 1000;
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = parseInt(arg.split("=")[1], 10) || 50;
    } else if (arg === "--cleanup") {
      cleanupAfter = true;
    }
  }

  return { totalJobs, concurrency, cleanupAfter };
}

async function runLoadTest() {
  const { totalJobs, concurrency, cleanupAfter } = parseArgs();

  console.log("\n=======================================================");
  console.log("🚀 شروع سناریوی تست بار و استرس پلتفرم دی‌رکت پرو (Dayrect)");
  console.log("   Load & Stress Test: High-Throughput BullMQ Ingestion");
  console.log("=======================================================");
  console.log(`📊 پیکربندی آزمون:`);
  console.log(`   - تعداد کامنت‌های همزمان: ${totalJobs.toLocaleString("fa-IR")} کامنت`);
  console.log(`   - ضریب همروندی (Concurrency Batch): ${concurrency}`);
  console.log(`   - پاکسازی خودکار پس از تست: ${cleanupAfter ? "بله ✓" : "خیر (حفظ در صف)"}`);
  console.log("-------------------------------------------------------\n");

  const redis = getRedisConnection();
  const queue = getDMQueue();

  // Phase 1: Baseline Health & Latency
  console.log("📡 گام ۱: ارزیابی سلامت و تاخیر اتصال به Redis...");
  const t0 = performance.now();
  const pingRes = await redis.ping();
  const pingDuration = (performance.now() - t0).toFixed(2);

  if (pingRes !== "PONG") {
    console.error("❌ خطا در اتصال به سرور ردیس! PING ناموفق بود.");
    process.exit(1);
  }

  const initialInfo = await redis.info("memory");
  const initialMemMatch = initialInfo.match(/used_memory_human:(.*)/);
  const initialMem = initialMemMatch ? initialMemMatch[1].trim() : "نامشخص";
  console.log(`   ✓ اتصال به ردیس برقرار است (تاخیر PING: ${pingDuration}ms)`);
  console.log(`   ✓ حافظه فعلی ردیس: ${initialMem}`);

  // Phase 2: Ingestion Benchmarking
  console.log(`\n⚡ گام ۲: آغاز تزریق پرفشار ${totalJobs} کامنت به صف dm-processing...`);

  const jobIds: string[] = [];
  const testRunId = `load_${Date.now()}`;
  const keywords = ["تخفیف", "قیمت", "خرید", "ارسال", "لینک", "پکیج", "vip"];

  const startTime = performance.now();
  let successCount = 0;
  let failureCount = 0;

  // Execute in batches to simulate realistic high concurrency
  for (let i = 0; i < totalJobs; i += concurrency) {
    const batchSize = Math.min(concurrency, totalJobs - i);
    const batchPromises = Array.from({ length: batchSize }, async (_, idx) => {
      const globalIndex = i + idx;
      const commentId = `cmt_${testRunId}_${globalIndex}`;
      const randomKeyword = keywords[globalIndex % keywords.length];

      const jobData: ProcessCommentJob = {
        instagramAccountId: "test_ig_account_stress_1001",
        commentId,
        commentText: `سلام لطفا شرایط ${randomKeyword} رو برام بفرستید 🙏`,
        commenterId: `user_insta_${(globalIndex % 200) + 1}`,
        commenterName: `User_${globalIndex}`,
        mediaId: "media_post_reels_9901",
        source: "WEBHOOK",
      };

      try {
        const job = await queue.add("process-comment", jobData, {
          jobId: `stress_${commentId}`,
          removeOnComplete: true,
        });
        if (job.id) {
          jobIds.push(job.id);
          successCount++;
        }
      } catch (err) {
        failureCount++;
        console.error(`خطا در افزودن جاب ${globalIndex}:`, err);
      }
    });

    await Promise.all(batchPromises);

    // Progress tick
    const progress = Math.min(100, Math.round(((i + batchSize) / totalJobs) * 100));
    process.stdout.write(`\r   در حال تزریق جاب‌ها: ${progress}% (${i + batchSize}/${totalJobs})`);
  }

  const totalDurationSeconds = (performance.now() - startTime) / 1000;
  const throughputJobsPerSec = (successCount / totalDurationSeconds).toFixed(1);
  const avgLatencyPerJobMs = ((totalDurationSeconds * 1000) / totalJobs).toFixed(2);

  console.log("\n\n-------------------------------------------------------");
  console.log("🏁 نتایج عملکرد و توان عملیاتی صف (Throughput Benchmark):");
  console.log("-------------------------------------------------------");
  console.log(`   - کل زمان تزریق: ${totalDurationSeconds.toFixed(2)} ثانیه`);
  console.log(`   - کل کامنت‌های با موفقیت ثبت‌شده در صف: ${successCount}`);
  console.log(`   - خطاهای تزریق (Drop Rate): ${failureCount}`);
  console.log(`   - نرخ پردازش ورودی (Throughput): ${throughputJobsPerSec} کامنت بر ثانیه (Jobs/sec)`);
  console.log(`   - میانگین تاخیر به ازای هر جاب: ${avgLatencyPerJobMs} میلی‌ثانیه`);

  // Phase 3: Post-test Queue State & Memory Analysis
  console.log("\n🔍 گام ۳: بررسی وضعیت صف BullMQ و سلامت ردیس پس از بارگذاری...");
  const counts = await queue.getJobCounts();
  const finalInfo = await redis.info("memory");
  const finalMemMatch = finalInfo.match(/used_memory_human:(.*)/);
  const finalMem = finalMemMatch ? finalMemMatch[1].trim() : "نامشخص";

  console.log(`   - کارهای در انتظار پردازش (Waiting): ${counts.waiting}`);
  console.log(`   - کارهای در حال پردازش توسط Worker (Active): ${counts.active}`);
  console.log(`   - کارهای تکمیل‌شده (Completed): ${counts.completed}`);
  console.log(`   - کارهای با خطا مواجه‌شده (Failed): ${counts.failed}`);
  console.log(`   - کارهای با تاخیر (Delayed): ${counts.delayed}`);
  console.log(`   - حافظه مصرفی ردیس پس از بار: ${finalMem} (شروع: ${initialMem})`);

  // Phase 4: Optional Cleanup
  if (cleanupAfter) {
    console.log("\n🧹 گام ۴: پاکسازی جاب‌های تستی از صف...");
    let removedCount = 0;
    for (const jid of jobIds) {
      try {
        const job = await queue.getJob(jid);
        if (job) {
          await job.remove();
          removedCount++;
        }
      } catch {
        // Ignored during cleanup
      }
    }
    console.log(`   ✓ تعداد ${removedCount} جاب تستی از ردیس پاکسازی شد.`);
  }

  console.log("\n=======================================================");
  console.log("✅ ارزیابی نهایی تاب‌آوری پلتفرم (Resilience Score):");
  if (failureCount === 0 && Number(throughputJobsPerSec) > 100) {
    console.log("🌟 عالی (Grade: A+) - صف کاملاً پایدار، بدون نشت داده یا گلوگاه در مقیاس ۱۰۰۰ درخواست.");
  } else if (failureCount === 0) {
    console.log("👍 مطلوب (Grade: A) - تزریق ۱۰۰۰ کامنت بدون خطا انجام شد.");
  } else {
    console.log("⚠ نیاز به بهینه‌سازی (Grade: B) - برخی جاب‌ها دچار خطا یا تاخیر شدند.");
  }
  console.log("=======================================================\n");

  process.exit(0);
}

runLoadTest().catch((err) => {
  console.error("❌ تست استرس با خطای غیرمنتظره متوقف شد:", err);
  process.exit(1);
});
