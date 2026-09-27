# راهنمای جامع استقرار روی پلتفرم‌های ابری (Railway & Vercel)
## پلتفرم اتوماسیون اینستاگرام، پاسخگوی هوشمند و فروش خودکار (دی‌رکت پرو)

این سند راهنمای سریع و کاربردی جهت استقرار پروژه روی دو سرویس ابری محبوب **Railway** و **Vercel** است.

---

## مقایسه و انتخاب بهینه معماری

سیستم شما از ۴ بخش کلیدی تشکیل شده است:
1. **وب‌سایت و APIها:** پروژه Next.js 16 (مسئول پنل کاربری، صفحات فرانت، وب‌هوک‌ها)
2. **پایگاه داده (Database):** PostgreSQL
3. **حافظه صف و کش (Cache & Queue):** Redis
4. **ورکر پردازشگر دائمی ۲۴ ساعته (Background Worker):** پروسه `npm run worker` که صف پیام‌های BullMQ را پردازش و با تاخیر انسانی به اینستاگرام ارسال می‌کند.

> [!TIP]
> **توصیه اصلی مهندسی:** استفاده از **Railway** به مراتب سریع‌تر و پایدارتر است؛ چرا که تمامی این ۴ مؤلفه را به‌صورت یکپارچه در یک پروژه فراهم می‌سازد. در نقطه مقابل، **Vercel** ساختار Serverless دارد و امکان اجرای ورکر دائمی را ندارد و نیازمند استفاده از یک سرویس مکمل است.

---

## روش اول (پیشنهادی): استقرار صفر تا صد روی Railway

### گام ۱: ساخت پروژه و دیتابیس‌ها
1. وارد [railway.com](https://railway.com) شده و با حساب GitHub لاگین کنید.
2. روی دکمه **New Project** کلیک کنید.
3. گزینه **Provision PostgreSQL** را انتخاب کنید تا پایگاه داده ایجاد شود.
4. داخل همان پروژه، روی دکمه **+ Create** کلیک کرده و **Database** و سپس **Add Redis** را بزنید.
   *(ریل‌وی به‌صورت پیش‌فرض و خودکار متغیرهای اتصال `DATABASE_URL` و `REDIS_URL` را آماده می‌کند).*

### گام ۲: اتصال سرویس وب (Next.js Web App)
1. داخل همان پروژه، روی **+ Create** کلیک کرده و گزینه **GitHub Repo** را انتخاب نمایید و مخزن گیت خود را برگزینید.
2. وارد سرویس ایجادشده شوید و در تب **Variables** مقادیر زیر را وارد کنید:
   * `DATABASE_URL`: با زدن دکمه *Add Reference* مستقیماً دیتابیس Postgres پروژه را متصل کنید.
   * `REDIS_URL`: با زدن دکمه *Add Reference* مستقیماً ردیس پروژه را متصل کنید.
   * `NEXTAUTH_SECRET`: یک رشته رندوم ۶۴ کاراکتری (تولید با `openssl rand -hex 32`)
   * `ENCRYPTION_KEY`: یک کلید تصادفی ۳۲ بایتی هگز جهت رمزنگاری توکن‌ها
   * `NEXT_PUBLIC_APP_URL`: دامنه‌ای که در مرحله بعد از ریل‌وی دریافت می‌کنید.
   * `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`: اطلاعات اپلیکیشن فیسبوک
   * `ZARINPAL_MERCHANT_ID`, `ZIBAL_MERCHANT_ID`, `KAVENEGAR_API_KEY`, `OPENAI_API_KEY`
3. در تب **Settings**:
   * بخش **Build Command** را روی عبارت زیر قرار دهید:
     ```bash
     npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   * در بخش **Networking**، روی **Generate Domain** کلیک کنید تا دامنه اختصاصی با SSL معتبر به شما اختصاص یابد.

### گام ۳: راه‌اندازی سرویس پردازشگر صف (Background Worker)
1. مجدداً در همان پروژه روی **+ Create** بزنید و همان مخزن گیت‌هاب را **برای بار دوم** اضافه کنید.
2. نام این سرویس جدید را `dayrect-worker` بگذارید.
3. تمام متغیرهای محیطی سرویس اول را در تب **Variables** این سرویس نیز کپی کنید.
4. در تب **Settings**:
   * بخش **Start Command** را روی دستور زیر تنظیم کنید:
     ```bash
     npm run worker
     ```
   *(این سرویس به صورت ۲۴ ساعته روشن می‌ماند و نیازی به ساخت دامنه اینترنتی ندارد).*

---

## روش دوم: استقرار ترکیبی با Vercel

در صورتی که اصرار بر استفاده از زیرساخت ورسل دارید، باید از معماری ترکیبی استفاده کنید:

### ۱. دیتابیس و ردیس ابری
* پایگاه‌داده PostgreSQL را در پلتفرم [Neon.tech](https://neon.tech) یا [Supabase.com](https://supabase.com) بسازید و رشته `DATABASE_URL` را کپی کنید.
* سرور ردیس با پروتکل سازگار با BullMQ را در [Upstash.com](https://upstash.com) یا یک سرور ابری ایجاد کنید و `REDIS_URL` را بردارید.

### ۲. استقرار سایت روی Vercel
1. وارد [vercel.com](https://vercel.com) شوید و مخزن گیت‌هاب را **Import** کنید.
2. در بخش **Environment Variables**، تمام متغیرهای مورد نیاز (`DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` و کلیدهای API) را وارد کنید.
3. روی **Deploy** کلیک کنید تا سایت بالا بیاید.

### ۳. استقرار ورکر دائمی (ضروری و اجباری)
* چون ورسل سرویس Background Worker دائمی ندارد، باید برای اجرای فایل ورکر (`worker/dm-worker.ts`) از یک سرویس دیگر مثل **Railway** یا **Render.com** (بخش Background Worker) استفاده کنید تا دستور `npm run worker` همواره فعال باشد؛ در غیر این صورت پیام‌های صف ارسال نخواهند شد.

---

## تنظیم نهایی وب‌هوک در پنل متا (Facebook Developers)

پس از بالا آمدن سایت و دریافت دامنه (مثلاً `https://app.yourdomain.ir` یا آدرس ریل‌وی):
1. وارد پنل توسعه‌دهندگان متا به آدرس [developers.facebook.com](https://developers.facebook.com) شوید.
2. در بخش **Instagram Graph API -> Webhooks**:
   * فیلد **Callback URL**:
     ```text
     https://your-domain.com/api/webhooks/instagram
     ```
   * فیلد **Verify Token**: همان رمزی که در متغیر `META_WEBHOOK_VERIFY_TOKEN` قرار دادید.
3. اشتراک‌های فیلد **messages** و **comments** را تیک بزنید تا ارسال خودکار رویدادها فعال شود.
