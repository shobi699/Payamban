# راهنمای جامع استقرار پیام‌بان در Vercel همراه با پایگاه‌داده Neon
# Complete Deployment Guide: Vercel + Neon PostgreSQL + Upstash Redis

این سند راهنمای قدم‌به‌قدم برای راه‌اندازی و دیپلوی نسخه نهایی سامانه **پیام‌بان (Payamban Pro)** بر روی پلتفرم ابری **Vercel** به همراه پایگاه داده سرورلس **Neon PostgreSQL** و صف پیام **Upstash Redis** است.

---

## ۱. پیش‌نیازهای استقرار (Prerequisites)

برای استقرار پایدار سامانه، به حساب‌های کاربری زیر نیاز دارید:
1. **حساب Vercel** ([vercel.com](https://vercel.com/))
2. **پایگاه‌داده Neon** ([neon.tech](https://neon.tech/)) — پلن رایگان برای شروع کاملاً کافی است.
3. **ردیس سرورلس Upstash** ([upstash.com](https://upstash.com/)) — جهت مدیریت صف‌های BullMQ و کشینگ سشن‌ها.
4. **حساب Resend یا سرویس SMTP** ([resend.com](https://resend.com/)) — برای ارسال لینک‌های لاگین (Magic Link).
5. **پنل توسعه‌دهندگان متا** ([developers.facebook.com](https://developers.facebook.com/)) — برای ساخت اپلیکیشن اینستاگرام.

---

## ۲. راه‌اندازی پایگاه داده در Neon (Neon Database Setup)

1. وارد [console.neon.tech](https://console.neon.tech/) شوید و یک پروژه جدید به نام `payamban` بسازید.
2. از داشبورد پروژه، رشته اتصال (**Connection string**) را کپی کنید.
3. توصیه می‌شود از حالت **Pooled Connection** یا رشته اتصال مستقیم با `sslmode=require` استفاده کنید:
   ```text
   postgresql://[user]:[password]@[ep-xyz].eu-central-1.aws.neon.tech/payamban?sslmode=require
   ```
4. این رشته همان مقدار متغیر `DATABASE_URL` خواهد بود.

---

## ۳. راه‌اندازی ردیس سرورلس در Upstash (Redis Setup)

1. در [console.upstash.com](https://console.upstash.com/) یک دیتابیس Redis جدید ایجاد کنید.
2. از بخش Details، فیلد **UPSTASH_REDIS_REST_URL** یا آدرس استاندارد **Node.js ioredis** را کپی کنید:
   ```text
   rediss://default:[password]@[endpoint].upstash.io:6379
   ```
3. این رشته مقدار متغیر `REDIS_URL` خواهد بود.

---

## ۴. استقرار روی Vercel (Deploying to Vercel)

### روش اول: اتصال مستقیم مخزن گیت‌هاب (پیشنهادی)
1. مخزن گیت‌هاب پروژه (`https://github.com/shobi699/Payamban`) را در Vercel وارد (Import) کنید.
2. تنظیمات پروژه به صورت خودکار شناسایی می‌شود:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run vercel-build` (یا `prisma generate && prisma migrate deploy && next build`)
   - **Output Directory**: `.next`

### روش دوم: تنظیم متغیرهای محیطی در Vercel Dashboard (Environment Variables)
در تب **Settings > Environment Variables** در پنل پروژه ورسل، متغیرهای زیر را ثبت نمایید:

| نام متغیر | نمونه مقدار / توضیح | الزامی؟ |
| :--- | :--- | :--- |
| `DATABASE_URL` | رشته اتصال دیتابیس Neon با پسوند `?sslmode=require` | بله |
| `NEXTAUTH_URL` | دامنه ورسل، مثلاً `https://payamban.vercel.app` | بله |
| `NEXTAUTH_SECRET` | یک رشته تصادفی امن ۳۲ بایتی (تولید با دستور زیر) | بله |
| `ENCRYPTION_KEY` | کلید رمزنگاری ۶۴ کاراکتری هگز (۳۲ بایتی) جهت توکن‌های متا | بله |
| `CRON_SECRET` | رشته تصادفی دلخواه جهت امنیت روت‌های کرون ورسل | بله |
| `REDIS_URL` | رشته اتصال ردیس Upstash | بله |
| `RESEND_API_KEY` | کلید API سرویس Resend برای ارسال ایمیل ورود | بله |
| `EMAIL_FROM` | ایمیل فرستنده مثلاً `Payamban <auth@yourdomain.com>` | بله |
| `META_GRAPH_API_VERSION` | مقدار پیش‌فرض: `v25.0` | خیر |
| `INSTAGRAM_APP_ID` | شناسه اپلیکیشن در پرتال توسعه‌دهندگان متا | بله |
| `INSTAGRAM_APP_SECRET` | کلید سکرت اینستاگرام در پنل متا | بله |
| `FACEBOOK_APP_SECRET` | کلید سکرت فیس‌بوک در پنل متا | بله |
| `WEBHOOK_VERIFY_TOKEN` | توکن اعتبارسنجی وبهوک (رشته تصادفی دلخواه) | بله |
| `ZARINPAL_MERCHANT_ID` | مرچنت کد زرین‌پال یا `zarinpal_demo_merchant` | اختیاری |
| `ZARINPAL_SANDBOX` | `true` برای تست یا `false` برای محیط واقعی | اختیاری |
| `AI_API_KEY` | کلید API هوش مصنوعی (OpenAI / Gemini) | اختیاری |
| `AI_API_MODEL` | مدل پیش‌فرض (مثلاً `gpt-4o-mini`) | اختیاری |

> **نکته امنیتی:** برای ساخت سریع کلیدهای تصادفی در پاورشل یا ترمینال:
> ```powershell
> # تولید NEXTAUTH_SECRET و CRON_SECRET
> [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
>
> # تولید ENCRYPTION_KEY دقیقاً ۶۴ کاراکتر هگز
> -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
> ```

---

## ۵. زمان‌بندی خودکار جاب‌ها در Vercel Crons (Cron Jobs)

فایل `vercel.json` در ریشه پروژه از قبل پیکربندی شده است و پس از دیپلوی روی ورسل، موارد زیر به صورت خودکار فعال می‌شوند:
- **/api/cron/refresh-tokens**: روزانه در ساعت ۵ صبح توکن‌های ۶۰ روزه اینستاگرام که کمتر از ۱۰ روز تا انقضا دارند را تمدید می‌کند.
- **/api/cron/attach-next-reel**: روزانه سناریوها را به ریلزها متصل نگه می‌دارد.
- **/api/cron/snapshot-followers**: روزانه آمار تغییرات فالوورها را ثبت می‌کند.

---

## ۶. پیکربندی پرتال توسعه‌دهندگان متا (Meta Developer Configuration)

1. به [developers.facebook.com](https://developers.facebook.com/) بروید و اپلیکیشن خود را باز کنید.
2. در بخش **Instagram Platform > Settings**:
   - در فیلد **Valid OAuth Redirect URIs**: آدرس `https://<YOUR-VERCEL-DOMAIN>/api/instagram/callback` را اضافه کنید.
3. در بخش **Webhooks > Instagram**:
   - **Callback URL**: `https://<YOUR-VERCEL-DOMAIN>/api/webhook`
   - **Verify Token**: همان مقداری که در `WEBHOOK_VERIFY_TOKEN` قرار داده‌اید.
   - سپس روی دکمه **Verify and Save** کلیک کنید.
   - رویدادهای `comments`، `messages` و `story_mention` را تیک بزنید (**Subscribe**).

---

## ۷. تست لوکال وب‌هوک با تانل کلودفلر (Local Webhook Testing via Cloudflare Tunnel)

چنانچه پیش از دیپلوی در Vercel تمایل دارید وب‌هوک‌های متا را روی کامپیوتر خودتان تست کنید:
1. پروژه را در یک ترمینال اجرا کنید:
   ```bash
   npm run dev
   ```
2. در ترمینال دوم، اسکریپت آماده تانل را اجرا کنید:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-tunnel.ps1
   ```
3. لینک عمومی تولیدشده (مانند `https://xxxxx.trycloudflare.com`) را کپی کرده و به انتهای آن `/api/webhook` اضافه کنید و در پنل وب‌هوک متا ثبت فرمایید.
