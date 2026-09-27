# نقشه مهندسی و برنامه پیاده‌سازی فنی (Implementation Plan)
# ویژگی: `001-persian-rtl-instagram-automation`

---

## ۱. زمینه فنی و بستر معماری (Technical Context)

* **محیط و فریم‌ورک اصلی:** Next.js 16.2.6 (App Router) با React 19.2.4 در محیط Node.js 20+
* **زبان و اعتبارسنجی:** TypeScript 5+ (حالت Strict فعال بدون استفاده از `any`) همراه با Zod برای اعتبارسنجی ورودی‌ها و استخراج تایپ‌ها
* **پایگاه داده و نگاشت داده‌ها:** PostgreSQL با Prisma 7.8.0 (`@prisma/adapter-pg`) و مدل‌های دیتابیس در `prisma/schema.prisma`
* **صف پردازش ناهمگام:** BullMQ 5.76.4 به همراه ioredis 5.10.1 در فرآیند مستقل ورکر (`worker/dm-worker.ts`)
* **سیستم استایل و چیدمان:** Tailwind CSS v4 با تمرکز کامل بر **CSS Logical Properties** و فونت محلی وزیرمتن (Vazirmatn)
* **رابط‌های بیرونی:** Meta Graph API v22.0 (Instagram Login for Business, Webhooks, Private Replies, Comments)

---

## ۲. ارزیابی انطباق با قوانین و نظام‌نامه ایجنت (Constitution & Rules Check)

| اصل / قانون نظام‌نامه | وضعیت انطباق | نحوه تضمین در این پلن |
| :--- | :--- | :--- |
| **قانون خروجی ۱۰۰٪ کامل (Zero-Placeholder)** | **منطبق** | هیچ کدی به صورت ناقص یا با کامنت `// TODO` تحویل نخواهد شد؛ ماژول‌ها در فایل‌های مستقل کامل تفکیک می‌شوند. |
| **چیدمان راست‌چین اصیل (RTL-First)** | **منطبق** | تگ ریشه با `dir="rtl"` و تمامی کامپوننت‌ها صرفاً با کلاس‌های منطقی (`ps-*`, `pe-*`, `ms-*`, `me-*`, `border-s`, `border-e`, `start-*`, `end-*`) پیاده‌سازی می‌شوند. |
| **تایپوگرافی و بومی‌سازی جامع** | **منطبق** | فونت متغیر وزیرمتن، سیستم تقویم جلالی (شمسی)، ارقام فارسی و کلیدهای معنایی Type-Safe در دیکشنری‌های تفکیک‌شده. |
| **سازگاری با Next.js 16** | **منطبق** | رعایت شکست‌های سازگاری و اجتناب از دسترسی همگام به `params`, `searchParams` و `cookies()`. |
| **پایداری صف و امنیت وب‌هوک** | **منطبق** | پاسخ‌دهی غیرمسدودکننده به وبهوک زیر ۳۰۰ms، تایید امضای SHA256، رمزنگاری AES-256-GCM و رعایت سقف ۶۵۰ پیام در ساعت. |
| **ایزوله‌سازی از وابستگی‌های ثالث** | **منطبق** | حذف وابستگی‌های تبلیغاتی و تجاری Zernio و تمرکز بر درایور مستقیم متا. |

---

## ۳. آرتیفکت‌های طراحی و مراجع معماری (Design Artifacts)

این پلن بر مبنای آرتیفکت‌های تفصیلی زیر طراحی شده است:
* **سند مشخصات نیازمندی‌ها:** [spec.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/spec.md)
* **سند پژوهش‌ها و تصمیمات فنی (Phase 0):** [research.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/research.md)
* **مدل داده و ماشین‌های وضعیت (Phase 1):** [data-model.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/data-model.md)
* **قراردادهای رابط‌ها و وب‌هوک (Phase 1):**
  * قرارداد چندزبانه: [contracts/i18n-contract.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/contracts/i18n-contract.md)
  * قرارداد وب‌هوک و صف: [contracts/webhook-contract.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/contracts/webhook-contract.md)
  * قرارداد اینستاگرام API: [contracts/instagram-api-contract.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/contracts/instagram-api-contract.md)
* **راهنمای اعتبارسنجی سریع (Phase 1):** [quickstart.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/quickstart.md)

---

## ۴. فازبندی اجرایی و تقدم وابستگی‌ها (Phased Implementation Strategy)

```mermaid
flowchart TD
    subgraph Phase 1: پاکسازی و زیرساخت
        P1_1[حذف کدهای مازاد Zernio] --> P1_2[بازطراحی ماژول Type-Safe i18n]
        P1_2 --> P1_3[بهینه‌سازی Non-blocking وب‌هوک]
    end

    subgraph Phase 2: بومی‌سازی و RTL
        P1_3 --> P2_1[تزریق فونت وزیرمتن و dir=rtl در layout]
        P2_1 --> P2_2[ریفکتورینگ کلاس‌های فیزیکی به CSS Logical]
        P2_2 --> P2_3[پیاده‌سازی کاتالوگ دیکشنری فارسی fa.json]
        P2_3 --> P2_4[یکپارچه‌سازی تاریخ شمسی و ارقام فارسی]
    end

    subgraph Phase 3: تثبیت سرویس اینستاگرام
        P2_4 --> P3_1[بهینه‌سازی جریان Instagram Login و Scopeها]
        P3_1 --> P3_2[تعبیه تسک تمدید خودکار توکن در ورکر BullMQ]
        P3_2 --> P3_3[تعبیه لایه پروکسی شبکه Egress Proxy]
    end

    subgraph Phase 4: آزمون‌ها و استقرار
        P3_3 --> P4_1[تست‌های خودکار E2E و تاب‌آوری]
        P4_1 --> P4_2[ممیزی نهایی امنیت و استقرار Docker Compose]
    end
```

### شرح تفصیلی فازها:

### فاز ۱: پاکسازی، زیرساخت و ریفکتورینگ پایه
1. **ایزوله‌سازی Zernio:** بازبینی کدهای مرتبط با Zernio در دیتابیس و کلاینت‌ها و هدایت تمام فرآیندها به درایور رسمی مستقیم متا (`Direct Meta`).
2. **بازمهندسی ماژول i18n:** استقرار ساختار کلیدهای معنایی تفکیک‌شده در `lib/i18n` و ایجاد تعاریف تایپ بازگشتی TypeScript جهت اطمینان از خطای کامپایل هنگام استفاده از کلید اشتباه.
3. **مقاوم‌سازی هندلر وب‌هوک:** تبدیل جریان ذخیره رویداد در [app/api/webhook/route.ts](file:///e:/AI/dayrect/app/api/webhook/route.ts) به ساختار Non-blocking و پوش مستقیم به Redis با زمان پاسخ زیر ۳۰۰ms.

### فاز ۲: بومی‌سازی هسته، چیدمان RTL و تایپوگرافی
1. **پیکربندی DOM و فونت:** بارگذاری فونت محلی Vazirmatn در `public/fonts/`، تنظیم متغیر در Tailwind و اعمال `dir="rtl"` متناسب با کوکی در [app/layout.tsx](file:///e:/AI/dayrect/app/layout.tsx).
2. **ریفکتورینگ کلاس‌های کامپوننت‌ها:** جایگزینی کلاس‌های فیزیکی (`ml`, `pr`, `left`, `border-r`) در [components/sidebar.tsx](file:///e:/AI/dayrect/components/sidebar.tsx) و کامپوننت‌های فرم و پیشخوان به کلاس‌های منطقی.
3. **تولید دیکشنری کامل فارسی:** تدوین فایل‌های ترجمه دقیق در دسته‌های `common`, `dashboard`, `campaigns`, `settings`, `logs`.
4. **تقویم و ارقام:** پیاده‌سازی متدهای فرمت تاریخ خورشیدی (Jalali) و تبدیل ارقام به فارسی در کارت‌های آمار و جداول.

### فاز ۳: پایدارسازی و امنیت سرویس اینستاگرام
1. **جریان تأیید هویت بیزینس:** به‌روزرسانی پارامترهای OAuth 2.0 و مدیریت مطمئن State جهت جلوگیری از خطاهای اعتبارسنجی.
2. **نوسازی خودکار توکن در ورکر پس‌زمینه:** پیاده‌سازی جاب روزانه تکرارشونده در `worker/dm-worker.ts` جهت بررسی و تمدید توکن‌های ۶۰ روزه حداقل ۱۰ روز پیش از انقضا.
3. **پشتیبانی از Egress Proxy:** فعال‌سازی اتصال کلاینت متا به پروکسی شبکه برای رفع مشکلات فیلترینگ و تضمین پایداری ارتباط سرور با اینستاگرام.

### فاز ۴: آزمون‌های یکپارچگی، تاب‌آوری و استقرار
1. **آزمون‌های خودکار E2E:** تدوین سناریوهای تست با Playwright جهت راستی‌آزمایی روند لاگین، تغییر زبان، ایجاد کمپین و ارسال پیام.
2. **ممیزی تاب‌آوری (Resilience Audit):** ارزیابی پایداری سیستم در سقف ارسال ساعتی (Rate Limiting) و مدیریت خطاهای ناشی از قطعی موقت اینستاگرام.
3. **بسته‌بندی و استقرار:** آماده‌سازی فایل نهایی `docker-compose.yml` جهت استقرار یکپارچه وب‌اپلیکیشن، ورکر، پستگرس و ردیس.

---

## ۵. استراتژی کنترل کیفیت و معیارهای پذیرش (Quality Assurance & DoD)

پیش از اعلام اتمام پیاده‌سازی:
1. دستور `npm run typecheck` باید بدون خطا اجرا شود.
2. دستور `npm run test` با موفقیت ۱۰۰٪ تست‌های واحد را پشت سر بگذارد.
3. در مرورگر هیچ اسکرول افقی در زبان فارسی ایجاد نشود و فونت وزیرمتن با کیفیت نمایش یابد.
4. هندلر وبهوک در کمتر از ۳۰۰ میلی‌ثانیه پاسخ کد ۲۰۰ دهد و جاب بدون تاخیر در صف ثبت شود.
