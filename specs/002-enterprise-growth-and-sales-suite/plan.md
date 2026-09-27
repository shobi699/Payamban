# نقشه مهندسی و برنامه پیاده‌سازی فنی (Implementation Plan)
# ویژگی: `002-enterprise-growth-and-sales-suite`
# پلتفرم: دی‌رکت پرو (OpenReply Engine)

---

## ۱. زمینه فنی و بستر معماری (Technical Context)

* **محیط و فریم‌ورک اصلی:** Next.js 16.2.6 (App Router) با React 19.2.4 در محیط Node.js 20+
* **زبان و اعتبارسنجی:** TypeScript 5+ (حالت Strict فعال بدون استفاده از `any`) همراه با Zod برای اعتبارسنجی ورودی‌ها و استخراج تایپ‌ها
* **پایگاه داده و نگاشت داده‌ها:** PostgreSQL با Prisma 7.8.0 (`@prisma/adapter-pg`) و مدل‌های دیتابیس در `prisma/schema.prisma`
* **صف پردازش ناهمگام و سشن‌ها:** BullMQ 5.76.4 به همراه ioredis 5.10.1 در فرآیند مستقل ورکر (`worker/dm-worker.ts`) و استفاده از Redis برای سشن‌های گفتگوی دایرکت
* **سیستم استایل و چیدمان:** Tailwind CSS v4 با تمرکز کامل بر **CSS Logical Properties** و فونت محلی وزیرمتن (Vazirmatn)
* **رابط‌های بیرونی:** 
  * Meta Graph API v22.0 (Messages, Comments, Webhooks, Story Shares, Private Replies)
  * درگاه پرداخت بانکی زرین‌پال v4 REST API
  * ارائه‌دهندگان پیامک بومی (Kavenegar / FarazSMS)
  * ارائه‌دهنده هوش مصنوعی مولد (Gemini / OpenAI API)

---

## ۲. ارزیابی انطباق با قوانین و نظام‌نامه ایجنت (Constitution & Rules Check)

| اصل / قانون نظام‌نامه | وضعیت انطباق | نحوه تضمین در این پلن |
| :--- | :--- | :--- |
| **قانون خروجی ۱۰۰٪ کامل (Zero-Placeholder)** | **منطبق** | هیچ کدی به صورت ناقص یا با کامنت `// TODO` تحویل نخواهد شد؛ کلیه هندلرها و ماژول‌ها ۱۰۰٪ نهایی نوشته می‌شوند. |
| **سیستم تنظیمات ادمین (قانون ۷ - الزامی)** | **منطبق** | تمام پارامترهای جدید (مرچنت زرین‌پال، پرامپت هوش مصنوعی، متن استوری منشن، سقف پیامک) در جدول `PlatformSetting` تعریف شده و فرم ویرایش آنها در پنل ادمین مستقر است. |
| **چیدمان راست‌چین اصیل (RTL-First)** | **منطبق** | استفاده انحصاری از خصوصیات منطقی CSS (`start-*`, `end-*`, `ps-*`, `pe-*`) بدون حتی یک کلاس فیزیکی جهت‌دار. |
| **تایپوگرافی، تاریخ و ارقام فارسی** | **منطبق** | اعداد به صورت فارسی (`۰۱۲۳۴۵۶۷۸۹`) و تاریخ‌ها بر اساس تقویم هجری خورشیدی (شمسی) نمایش می‌یابند. |
| **پایداری صف و امنیت وب‌هوک** | **منطبق** | پاسخ غیرمسدودکننده به وبهوک زیر ۳۰۰ms، کنترل سقف ارسال ۶۵۰ پیام در ساعت با اسکریپت ردیس، و رمزنگاری توکن‌ها با AES-256-GCM. |
| **کنترل نوع‌ها (Strict TypeScript)** | **منطبق** | عدم استفاده از `any`؛ تمامی اینترفیس‌های سشن، پیلودهای متا و داده‌های تراکنش با Zod و TypeScript معین شده‌اند. |

---

## ۳. آرتیفکت‌های طراحی و مراجع معماری (Design Artifacts)

این پلن بر مبنای آرتیفکت‌های تفصیلی زیر مستقر است:
* **سند مشخصات نیازمندی‌ها:** [spec.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/spec.md)
* **سند پژوهش‌ها و تصمیمات فنی (Phase 0):** [research.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/research.md)
* **مدل داده و ماشین‌های وضعیت (Phase 1):** [data-model.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/data-model.md)
* **قراردادهای رابط‌ها و وب‌هوک (Phase 1):**
  * قرارداد درگاه پرداخت ریالی: [contracts/payment-gateway-contract.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/contracts/payment-gateway-contract.md)
  * قرارداد ماشین وضعیت دایرکت: [contracts/dm-state-machine-contract.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/contracts/dm-state-machine-contract.md)
  * قرارداد ارسال پاسخ کامنت: [contracts/meta-comments-contract.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/contracts/meta-comments-contract.md)
  * قرارداد استریم اینباکس زنده: [contracts/realtime-inbox-contract.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/contracts/realtime-inbox-contract.md)
* **راهنمای اعتبارسنجی سریع (Phase 1):** [quickstart.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/quickstart.md)

---

## ۴. فازبندی اجرایی و تقدم وابستگی‌ها (Phased Implementation Strategy)

```mermaid
flowchart TD
    subgraph فاز ۱: تثبیت تجاری و اصلاحات فوری
        P1_1[انتشار واقعی ریپلای کامنت‌ها در متا] --> P1_2[درایور پرداخت زرین‌پال و فاکتور]
        P1_2 --> P1_3[مهاجرت ورکر به جاب‌های تکرارشونده BullMQ]
        P1_3 --> P1_4[پاک‌سازی کامل کدهای مازاد Zernio]
    end

    subgraph فاز ۲: تعامل دایرکت و فانل‌های فروش
        P1_4 --> P2_1[ماشین وضعیت دایرکت در ردیس برای DmForm]
        P2_1 --> P2_2[اعتبارسنجی شماره موبایل و ذخیره در Phonebook CRM]
        P2_2 --> P2_3[اتوماسیون استوری منشن و کد تخفیف]
        P2_3 --> P2_4[ارسال کاتالوگ کاروسل ویترین محصولات ProductShowcase]
    end

    subgraph فاز ۳: هوش مصنوعی و اتوماسیون معنایی
        P2_4 --> P3_1[مدل دیتابیس AiKnowledgeDoc و FAQها]
        P3_1 --> P3_2[هندلر LLM در دایرکت با محدودیت طول پاسخ و System Prompt]
        P3_2 --> P3_3[تشخیص نیت و گیت ارجاع به ادمین انسان]
    end

    subgraph فاز ۴: زمان واقعی و مقیاس سازمانی
        P3_3 --> P4_1[استریم اینباکس زنده با SSE و Redis Pub-Sub]
        P4_1 --> P4_2[داشبورد پیشرفته قیف فروش و خروجی اکسل لیدها]
        P4_2 --> P4_3[تست‌های سرتاسری و پکیج استقرار Docker]
    end
```

---

## ۵. استراتژی کنترل کیفیت و معیارهای پذیرش (Quality Assurance & DoD)

پیش از اعلام اتمام هر گام توسعه:
1. دستور `npm run typecheck` باید با کد وضعیت ۰ و بدون هیچ خطای تایپ‌اسکریپت اجرا شود.
2. تست‌های واحد با دستور `npm run test` پاس شوند.
3. در لایه فرانت‌اند، تمامی صفحات و مودال‌های جدید در نمای موبایل و دسکتاپ به صورت کاملاً راست‌چین و بدون اسکرول افقی ناخواسته تایید شوند.
4. هر کلید و امکان جدید الزاماً دارای فیلد تنظیمات متناظر در پنل سوپرادمین ([`app/(dashboard)/admin/page.tsx`](file:///e:/AI/dayrect/app/%28dashboard%29/admin/page.tsx)) باشد.
