# لیست وظایف مهندسی و پیاده‌سازی: سامانه رشد سازمانی، فروش و مکالمات هوشمند اینستاگرام
# Tasks: Enterprise Growth, Sales Automation & Conversational Intelligence Suite

**شناسه ویژگی**: `002-enterprise-growth-and-sales-suite`  
**طرح فنی**: [plan.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/plan.md) | **سند مشخصات**: [spec.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/spec.md) | **مدل داده**: [data-model.md](file:///e:/AI/dayrect/specs/002-enterprise-growth-and-sales-suite/data-model.md)

---

## وضعیت و چک‌لیست وظایف اجرایی (Execution Checklist)

### فاز ۱: راه‌اندازی و مدل‌های داده جدید (Setup & Schema Expansion)
- [x] **T001** [P] به‌روزرسانی مدل داده در [prisma/schema.prisma](file:///e:/AI/dayrect/prisma/schema.prisma) جهت افزودن مدل `AiKnowledgeDoc` و فیلدهای `storyMentionEnabled` و `storyMentionMessage` به مدل `Automation`.
- [x] **T002** [P] تولید تایپ‌ها و کلاینت پریزما با اجرای `npm run db:generate` در [package.json](file:///e:/AI/dayrect/package.json).
- [x] **T003** تعریف متغیرهای محیطی درگاه پرداخت و هوش مصنوعی در [lib/env.ts](file:///e:/AI/dayrect/lib/env.ts) با اعتبارسنجی Zod.
- [x] **T004** [P] تعریف کلیدهای پیش‌فرض تنظیمات پلتفرم (زرین‌پال و پرامپت هوش مصنوعی) در فایل سیدینگ [scripts/seed-demo.ts](file:///e:/AI/dayrect/scripts/seed-demo.ts).

---

### فاز ۲: زیرساخت مشترک و سرویس‌های بنیادین (Foundational Infrastructure)
- [x] **T005** [P] پیاده‌سازی کلاینت وب‌سرویس REST زرین‌پال v4 در [lib/billing/zarinpal.ts](file:///e:/AI/dayrect/lib/billing/zarinpal.ts) با متدهای `requestPayment` و `verifyPayment`.
- [x] **T006** [P] پیاده‌سازی ماژول سشن‌های گفتگو در ردیس با انقضای ۱۸۰۰ ثانیه در [lib/queue/dm-session.ts](file:///e:/AI/dayrect/lib/queue/dm-session.ts).
- [x] **T007** ارتقای ورکر پس‌زمینه به جاب‌های تکرارشونده BullMQ و حذف `setInterval`های هم‌پوشان در [worker/dm-worker.ts](file:///e:/AI/dayrect/worker/dm-worker.ts).
- [x] **T008** [P] پاک‌سازی نهایی ارجاعات و هندلرهای باقیمانده Zernio در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts) و [lib/instagram/provider.ts](file:///e:/AI/dayrect/lib/instagram/provider.ts).

---

### فاز ۳: داستان‌های کاربری ۱ تا ۵ (P1) — پرداخت ریالی آنلاین و تمدید اشتراک (Zarinpal Billing & Quota)
*هدف: اتصال درگاه بانکی واقعی، ارتقای آنلاین بسته‌ها، ثبت فاکتور و تمدید خودکار روزهای اشتراک.*  
*معیار قبولی مستقل: کاربر با انتخاب پلن به درگاه زرین‌پال هدایت شده و پس از بازگشت موفق، اشتراک تمدید و سهمیه دایرکت شارژ گردد.*

- [x] **T009** [P] [US1] پیاده‌سازی اندپوینت ایجاد تراکنش پرداخت در [app/api/billing/payment/request/route.ts](file:///e:/AI/dayrect/app/api/billing/payment/request/route.ts).
- [x] **T010** [US1] پیاده‌سازی روت بازگشت بانکی و تاییدیه پرداخت در [app/api/billing/payment/callback/route.ts](file:///e:/AI/dayrect/app/api/billing/payment/callback/route.ts) همراه با ثبت کد پیگیری (RefID) در جدول `WalletTransaction`.
- [x] **T011** [US2] اعمال تمدید ۳۰ روزه به `expiresAt` و ریست سهمیه ماهانه `dmsUsed` در صورت موفقیت تراکنش در [app/api/billing/payment/callback/route.ts](file:///e:/AI/dayrect/app/api/billing/payment/callback/route.ts).
- [x] **T012** [US3] اتصال ارسال پیامک تایید خرید اشتراک به مدیر با استفاده از درایور پیامک در [app/api/billing/payment/callback/route.ts](file:///e:/AI/dayrect/app/api/billing/payment/callback/route.ts).
- [x] **T013** [US4] اصلاح فرم خرید اشتراک در [app/(dashboard)/billing/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/billing/page.tsx) جهت اتصال به روت درخواست پرداخت آنلاین به جای شبیه‌ساز فیک.
- [x] **T014** [P] [US5] افزودن جدول تاریخچه تراکنش‌های پرداخت بانکی با ارقام فارسی در [app/(dashboard)/billing/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/billing/page.tsx).

---

### فاز ۴: داستان‌های کاربری ۶ تا ۸ (P1) — ارسال قطعی پاسخ به کامنت‌ها در اینستاگرام (Meta Comments API)
*هدف: انتشار واقعی پاسخ‌های تایپ‌شده توسط ادمین در زیر کامنت‌های اینستاگرام از طریق Graph API.*  
*معیار قبولی مستقل: زدن دکمه «ارسال پاسخ» در کامنت‌های بی‌پاسخ بلافاصله متد متا را فراخوانی کرده و ریپلای زیر پست مربوطه ظاهر شود.*

- [x] **T015** [US6] افزودن متد `sendCommentReply(accessToken, commentId, message)` در [lib/meta/client.ts](file:///e:/AI/dayrect/lib/meta/client.ts).
- [x] **T016** [US6] ارتقای سرور اکشن `replyComment` در [app/(dashboard)/comments/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/comments/page.tsx) جهت رمزگشایی توکن و ارسال زنده ریپلای به کلاینت گراف متا.
- [x] **T017** [US7] مدیریت خطای ۳۶۸ (Spam Throttle) و خطای ۱۹۰ (Token Expired) در فرم پاسخ به کامنت در [app/(dashboard)/comments/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/comments/page.tsx) و نمایش اعلان فارسی مناسب.
- [x] **T018** [P] [US8] تکمیل اکشن رد کردن کامنت (`dismissComment`) با برچسب‌گذاری در پایگاه‌داده در [app/(dashboard)/comments/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/comments/page.tsx).

---

### فاز ۵: داستان‌های کاربری ۹ تا ۱۳ (P1) — ماشین وضعیت گفتگوی دایرکت و فرم‌ساز لید (Conversational DM State Machine)
*هدف: پرسش مرحله‌به‌مرحله فیلدهای فرم در دایرکت، اعتبارسنجی شماره موبایل و ثبت خودکار در دفترچه تلفن و پیامک.*  
*معیار قبولی مستقل: ارسال کلمه محرک فرم در دایرکت سوال اول را فعال کند؛ ارسال شماره موبایل معتبر فرم را ببندد و رکورد لید ایجاد شود.*

- [x] **T019** [US9] پیاده‌سازی متد تطبیق کلمه محرک فرم‌های فعال (`triggerKeyword`) در هندلر پیام‌های ورودی [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T020** [US10] پیاده‌سازی توالی ارسال سوال اول و ساخت سشن در ردیس در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T021** [US11] پیاده‌سازی اعتبارسنجی عبارات باقاعده برای شماره موبایل ایران (`/^(\+98|0)?9\d{9}$/`) و ارسال پیام هشدار فارسی در صورت ورودی نامعتبر در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T022** [US12] ثبت رکورد نهایی در جدول `DmFormSubmission` و ساخت یا به‌روزرسانی مخاطب در `PhonebookContact` در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T023** [US13] ارسال خودکار پیامک تایید با کاوه‌نگار یا فرازاس‌ام‌اس به شماره موبایل دریافتی پس از تکمیل فرم در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).

---

### فاز ۶: داستان‌های کاربری ۱۴ تا ۱۷ (P1) — اتوماسیون استوری منشن و ریپلای استوری (Story Mention Automation)
*هدف: ارسال خودکار دایرکت هدیه یا کد تخفیف زیر ۳ ثانیه پس از تگ شدن پیج در استوری مشتریان.*  
*معیار قبولی مستقل: تگ شدن در استوری، وب‌هوک را فعال کرده و پیام دایرکت حاوی بن تخفیف با کنترل سقف روزانه ارسال گردد.*

- [x] **T024** [US14] اضافه کردن پارسر رویداد استوری منشن (`story_mention`) به وب‌هوک در [lib/meta/webhook.ts](file:///e:/AI/dayrect/lib/meta/webhook.ts).
- [x] **T025** [US14] ایجاد جاب اختصاصی `process-story-mention` در صف ردیس در [lib/queue/process-webhook.ts](file:///e:/AI/dayrect/lib/queue/process-webhook.ts).
- [x] **T026** [US15] پیاده‌سازی پردازشگر استوری منشن و ارسال دایرکت خودکار تشکر در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T027** [US16] تعبیه گیت بازدارنده ارسال تکراری در ردیس (`rate:story:{acct}:{user}`) با انقضای ۲۴ ساعته در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T028** [P] [US17] افزودن سوییچ و متن استوری منشن در فرم سازنده سناریو در [components/campaign-builder.tsx](file:///e:/AI/dayrect/components/campaign-builder.tsx).

---

### فاز ۷: داستان‌های کاربری ۱۸ تا ۲۱ (P2) — ایجنت هوش مصنوعی و پایگاه دانش RAG (AI Sales Agent)
*هدف: پاسخگویی هوشمندانه و انسانی به سوالات متداول کاربران در دایرکت با استفاده از پایگاه دانش اختصاصی فروشگاه.*  
*معیار قبولی مستقل: طرح سوالاتی مانند «هزینه پست چقدره؟» در دایرکت پاسخی کاملاً منطبق بر اطلاعات واردشده در پنل ایجاد کند.*

- [x] **T029** [P] [US18] پیاده‌سازی صفحه مدیریت اسناد پایگاه دانش FAQها در [app/(dashboard)/settings/ai/page.tsx](file:///e:/AI/dayrect/app/(dashboard)/settings/ai/page.tsx).
- [x] **T030** [US18] پیاده‌سازی ماژول ساخت کانتکست و فراخوانی مدل زبانی (LLM) در [lib/ai/responder.ts](file:///e:/AI/dayrect/lib/ai/responder.ts).
- [x] **T031** [US19] تزریق لحن انتخابی ادمین (رسمی یا خودمانی) از جدول `PlatformSetting` به عنوان System Prompt در [lib/ai/responder.ts](file:///e:/AI/dayrect/lib/ai/responder.ts).
- [x] **T032** [US20] یکپارچه‌سازی ایجنت هوش مصنوعی در پایپ‌لاین پیام‌های ورودی دایرکت در صورت عدم تطابق کلمات کلیدی در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T033** [US21] پیاده‌سازی گیت ایمنی تشخیص نارضایتی یا ابهام و علامت‌گذاری مکالمه با برچسب «نیاز به مداخله ادمین» در [lib/ai/responder.ts](file:///e:/AI/dayrect/lib/ai/responder.ts).

---

### فاز ۸: داستان‌های کاربری ۲۲ و ۲۳ (P2) — ویترین محصولات و اسلایدر دایرکت (Product Showcase Carousel)
*هدف: ارسال کاروسل گرافیکی محصولات همراه با دکمه خرید آنلاین متصل به ترکینگ لینک.*  
*معیار قبولی مستقل: ارسال کلمه «محصولات» کاتالوگ کارت‌های تصویری کالاها را در دایرکت اینستاگرام نمایش دهد.*

- [x] **T034** [US22] پیاده‌سازی متد ارسال پیام چندکارتونی (Generic Template Carousel) در [lib/meta/client.ts](file:///e:/AI/dayrect/lib/meta/client.ts).
- [x] **T035** [US23] اتصال ارسال ویترین به رویداد تطابق کلیدواژه در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts) با لینک‌های رهگیری‌شده اختصاصی `TrackedLink`.

---

### فاز ۹: داستان‌های کاربری ۲۴ و ۲۵ (P2) — اینباکس زنده بلادرنگ (Real-Time Live Inbox via SSE)
*هدف: حذف پولینگ ۱۲ ثانیه‌ای و تبدیل صندوق مکالمات به چت زنده آنی با تاخیر زیر ۱ ثانیه.*  
*معیار قبولی مستقل: ارسال پیام جدید در اینستاگرام بلافاصله و بدون رفرش در صفحه اینباکس ظاهر شود.*

- [x] **T036** [US24] پیاده‌سازی روت استریم رویدادها با استاندارد SSE در [app/api/inbox/stream/route.ts](file:///e:/AI/dayrect/app/api/inbox/stream/route.ts) متصل به Redis Pub/Sub.
- [x] **T037** [US24] انتشار رویداد پیام‌های جدید دایرکت روی کانال ردیس در زمان پردازش وب‌هوک در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T038** [US25] بازنویسی هوک کلاینت اینباکس با استفاده از `EventSource` و حذف تایمرهای پولینگ در [app/(dashboard)/inbox/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/inbox/page.tsx).

---

### فاز ۱۰: داستان‌های کاربری ۲۶ و ۲۷ (P2) — پایداری پس‌زمینه و نظارت سازمانی (Resilience & Ops)
*هدف: تضمین عدم اجرای همزمان جاب‌ها در محیط چند سروره و پایش خطاهای زیرساختی.*

- [x] **T039** [US26] پیاده‌سازی قفل توزیع‌شده (Distributed Redlock) در [lib/queue/client.ts](file:///e:/AI/dayrect/lib/queue/client.ts) برای هماهنگی فرآیندهای دوره‌ای.
- [x] **T040** [US27] ثبت خودکار وقایع هشداری در جدول `OperationalEvent` و نمایش بج زنده وضعیت سرور در پنل سوپرادمین [app/(dashboard)/admin/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/admin/page.tsx).

---

### فاز ۱۱: ممیزی کیفیت، آزمون‌های یکپارچگی و پولیش نهایی (Polish & Cross-Cutting)
- [x] **T041** [P] پیاده‌سازی تست‌های واحد ماشین وضعیت فرم در `__tests__/dm-state-machine.test.ts`.
- [x] **T042** [P] پیاده‌سازی تست‌های چرخه پرداخت درگاه زرین‌پال در `__tests__/payment-zarinpal.test.ts`.
- [x] **T043** بررسی انطباق صددرصدی فیلدهای جدید پنل ادمین با قانون ۷ در [app/(dashboard)/admin/page.tsx](file:///e:/AI/dayrect/app/%28dashboard%29/admin/page.tsx).
- [x] **T044** بررسی و ممیزی عدم وجود کامنت‌های ناقص، جانگهدار (`// TODO`, `// ...`) و تایید سلامت خروجی نهایی.
- [x] **T045** اجرای موفق و بدون خطای `npm run typecheck` و `npm run test`.

---

## ماتریس وابستگی‌ها و اولویت‌بندی پیاده‌سازی (Dependencies & Phasing)

```text
فاز ۱ (مدل داده و راه‌اندازی) ➔ فاز ۲ (زیرساخت زرین‌پال و سشن ردیس)
     ├── ➔ فاز ۳ (US1-US5: پرداخت بانکی زرین‌پال و فاکتور) [MVP]
     ├── ➔ فاز ۴ (US6-US8: انتشار زنده ریپلای کامنت‌ها در متا) [MVP]
     ├── ➔ فاز ۵ (US9-US13: ماشین وضعیت دایرکت و فرم‌ساز لید) [فروشگاه]
     ├── ➔ فاز ۶ (US14-US17: اتوماسیون استوری منشن) [وایرال]
     ├── ➔ فاز ۷ (US18-US21: ایجنت هوش مصنوعی RAG) [هوشمندسازی]
     ├── ➔ فاز ۸ (US22-US23: ویترین محصولات)
     ├── ➔ فاز ۹ (US24-US25: استریم اینباکس زنده)
     └── ➔ فاز ۱۰ و ۱۱ (پایداری و پولیش نهایی)
```

## محدوده نسخه کمینه قابل عرضه (Suggested MVP Scope)
برای رسیدن به اولین نسخه عملیاتی و پول‌ساز در سریع‌ترین زمان، تکمیل **فاز ۳ (پرداخت زرین‌پال)** و **فاز ۴ (ارسال زنده کامنت‌ها)** به عنوان MVP پیشنهاد می‌شود.
