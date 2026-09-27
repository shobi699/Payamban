# لیست وظایف پیاده‌سازی: بومی‌سازی فارسی، چیدمان راست‌چین و اتوماسیون اینستاگرام
# Tasks: Persian RTL Localization & Instagram Automation

**شناسه ویژگی**: `001-persian-rtl-instagram-automation`  
**طرح فنی**: [plan.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/plan.md) | **سند مشخصات**: [spec.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/spec.md) | **مدل داده**: [data-model.md](file:///e:/AI/dayrect/specs/001-persian-rtl-instagram-automation/data-model.md)

---

## وضعیت وظایف (Task Checklist)

### فاز ۱: راه‌اندازی، پاکسازی و حذف وابستگی‌های ثالث (Setup & Decoupling)
- [x] **T001**: ایجاد ساختار پوشه فونت‌های محلی در `public/fonts/vazirmatn/` و بارگذاری فونت متغیر بهینه `Vazirmatn[wght].woff2`.
- [x] **T002**: حذف ارجاعات و متون اسپانسری و تجاری Zernio از کامپوننت سایدبار [components/sidebar.tsx](file:///e:/AI/dayrect/components/sidebar.tsx) و نوار بالا [components/top-bar.tsx](file:///e:/AI/dayrect/components/top-bar.tsx).
- [x] **T003**: حذف کامل ماژول‌ها و کامپوننت‌های زائد شخص ثالث در [components/zernio-connection.tsx](file:///e:/AI/dayrect/components/zernio-connection.tsx) و [lib/zernio-links.ts](file:///e:/AI/dayrect/lib/zernio-links.ts).
- [x] **T004**: به‌روزرسانی متغیرهای محیطی در [lib/env.ts](file:///e:/AI/dayrect/lib/env.ts) و افزودن پشتیبانی از متغیرهای پروکسی خروجی (`HTTPS_PROXY` / `ALL_PROXY`).
- [x] **T005**: تعریف تعاریف `@font-face` و توکن‌های استایل منطقی در فایل استایل سراسری [app/globals.css](file:///e:/AI/dayrect/app/globals.css).

### فاز ۲: زیرساخت مشترک بین‌المللی‌سازی و مدل داده (Foundation & i18n Core)
- [x] **T006**: به‌روزرسانی مدل داده در [prisma/schema.prisma](file:///e:/AI/dayrect/prisma/schema.prisma) برای افزودن فیلد وضعیت توکن `tokenStatus` با مقادیر (`HEALTHY`, `EXPIRING_SOON`, `EXPIRED`, `REVOKED`) و ایجاد کلاینت پریزما.
- [x] **T007**: پیاده‌سازی تایپ‌های بازگشتی و Type-Safe برای کلیدهای ترجمه بر مبنای ساختار Namespace در [lib/i18n/types.ts](file:///e:/AI/dayrect/lib/i18n/types.ts).
- [x] **T008**: بازمهندسی موتور چندزبانه در [lib/i18n/index.ts](file:///e:/AI/dayrect/lib/i18n/index.ts) جهت استفاده از کلیدهای معنایی دسته‌بندی‌شده به جای رشته‌های متن خام انگلیسی.
- [x] **T009**: پیاده‌سازی تابع سروری واکشی زبان و جهت در [lib/i18n/server.ts](file:///e:/AI/dayrect/lib/i18n/server.ts) با پشتیبانی از کش ریکوئست Next.js.
- [x] **T010**: بازنویسی کامپوننت پرووایدر در [lib/i18n/provider.tsx](file:///e:/AI/dayrect/lib/i18n/provider.tsx) با همگام‌سازی لحظه‌ای صفت‌های `dir` و `lang` در ریشه سند DOM.
- [x] **T011**: پیاده‌سازی Server Action ذخیره‌سازی ترجیح زبانی کاربر در کوکی امن در [lib/i18n/actions.ts](file:///e:/AI/dayrect/lib/i18n/actions.ts).

### فاز ۳: داستان کاربری ۱ (P1) — تغییر زبان و چیدمان راست‌چین (RTL Layout)
- [x] **T012**: [US1] تدوین دیکشنری کاتالوگ فارسی اصطلاحات عمومی، ناوبری و دکمه‌ها در `locales/fa/common.json`.
- [x] **T013**: [US1] تدوین دیکشنری کاتالوگ انگلیسی متناظر در `locales/en/common.json`.
- [x] **T014**: [US1] بازطراحی المان انتخاب‌گر زبان با پشتیبانی از جهت راست‌چین در [components/language-switcher.tsx](file:///e:/AI/dayrect/components/language-switcher.tsx).
- [x] **T015**: [US1] اصلاح تگ ریشه در [app/layout.tsx](file:///e:/AI/dayrect/app/layout.tsx) جهت اعمال پویای `dir="rtl"` و `lang="fa"` بر مبنای کوکی فعال.
- [x] **T016**: [US1] ریفکتورینگ کلاس‌های فیزیکی پوسته داشبورد به خصوصیات منطقی CSS در [components/dashboard-shell.tsx](file:///e:/AI/dayrect/components/dashboard-shell.tsx).
- [x] **T017**: [US1] اصلاح ساختار لایه‌بندی محلی در [components/localized-layout.tsx](file:///e:/AI/dayrect/components/localized-layout.tsx).

### فاز ۴: داستان کاربری ۲ (P1) — تقویم و ارقام شمسی در داشبورد (Jalali Calendar & Numbers)
- [x] **T018**: [US2] پیاده‌سازی ماژول فرمت‌دهی تقویم جلالی (هجری خورشیدی) و تبدیل ارقام به فارسی با `Intl.DateTimeFormat` در [lib/utils/formatters.ts](file:///e:/AI/dayrect/lib/utils/formatters.ts).
- [x] **T019**: [US2] تدوین دیکشنری فارسی عناوین و برچسب‌های داشبورد در `locales/fa/dashboard.json`.
- [x] **T020**: [US2] بومی‌سازی کارت‌های شاخص عملکرد و نمایش مقادیر با اعداد فارسی در [components/stat-card.tsx](file:///e:/AI/dayrect/components/stat-card.tsx).
- [x] **T021**: [US2] فارسی‌سازی محورهای تاریخ شمسی و مقادیر در نمودار تعاملات در [components/follower-chart.tsx](file:///e:/AI/dayrect/components/follower-chart.tsx).

### فاز ۵: داستان کاربری ۳ (P1) — سایدبار و ناوبری ریسپانسیو RTL در موبایل (Mobile Navigation)
- [x] **T022**: [US3] بازنویسی کلاس‌های سایدبار به `start-0`, `border-e`, `translate-x` در [components/sidebar.tsx](file:///e:/AI/dayrect/components/sidebar.tsx) برای باز شدن صحیح از لبه راست.
- [x] **T023**: [US3] بهینه‌سازی دکمه همبرگری و ترنزیشن دراور متناسب با جهت RTL در [components/top-bar.tsx](file:///e:/AI/dayrect/components/top-bar.tsx).
- [x] **T024**: [US3] اصلاح کلاس‌های هدر سایت عمومی و منوی ریسپانسیو در [components/public-site-header.tsx](file:///e:/AI/dayrect/components/public-site-header.tsx).
- [x] **T025**: [US3] تست چیدمان ریسپانسیو و رفع قطعی هرگونه اسکرول افقی ناخواسته در عرض‌های موبایل (۳۶۰ تا ۴۳۰ پیکسل).

### فاز ۶: داستان کاربری ۴ (P1) — اتصال ایمن اکانت اینستاگرام و رمزنگاری توکن (OAuth & Encryption)
- [x] **T026**: [US4] به‌روزرسانی پارامترهای OAuth و تفکیک State امن در [lib/meta/oauth.ts](file:///e:/AI/dayrect/lib/meta/oauth.ts).
- [x] **T027**: [US4] اصلاح روت آغاز اتصال اکانت اینستاگرام در [app/api/instagram/connect/route.ts](file:///e:/AI/dayrect/app/api/instagram/connect/route.ts).
- [x] **T028**: [US4] مدیریت تبادل کد با توکن ۶۰ روزه بلندمدت و ذخیره‌سازی رمزنگاری‌شده با AES-256-GCM در [app/api/instagram/callback/route.ts](file:///e:/AI/dayrect/app/api/instagram/callback/route.ts).
- [x] **T029**: [US4] تدوین دیکشنری فارسی بخش تنظیمات اکانت و مدیریت تیم در `locales/fa/settings.json`.
- [x] **T030**: [US4] بازطراحی کارت وضعیت اتصال اکانت با نام کاربری، آواتار و دکمه قطع اتصال در [components/instagram-connect-notice.tsx](file:///e:/AI/dayrect/components/instagram-connect-notice.tsx).

### فاز ۷: داستان کاربری ۵ (P1) — تمدید خودکار توکن‌های بلندمدت در ورکر (Token Auto-Refresh)
- [x] **T031**: [US5] پیاده‌سازی متد نوسازی توکن با پشتیبانی از کلاینت پروکسی در [lib/meta/client.ts](file:///e:/AI/dayrect/lib/meta/client.ts).
- [x] **T032**: [US5] پیاده‌سازی ماژول زمان‌بندی تمدید توکن‌های در آستانه انقضا در [lib/queue/token-refresher.ts](file:///e:/AI/dayrect/lib/queue/token-refresher.ts).
- [x] **T033**: [US5] ثبت جاب تکرارشونده روزانه (Daily Repeatable Job) در زمان بوت شدن ورکر در [worker/dm-worker.ts](file:///e:/AI/dayrect/worker/dm-worker.ts).
- [x] **T034**: [US5] ثبت رویدادهای خطا در جدول `OperationalEvent` در صورت بروز هرگونه مشکل در تجدید دسترسی از سوی متا.

### فاز ۸: داستان کاربری ۶ (P2) — پایش سلامت اکانت و هشدار انقضا (Account Health Monitoring)
- [x] **T035**: [US6] پیاده‌سازی کامپوننت بج وضعیت سلامت اکانت (`HEALTHY`, `EXPIRING_SOON`, `REVOKED`) در [components/status-badge.tsx](file:///e:/AI/dayrect/components/status-badge.tsx).
- [x] **T036**: [US6] پیاده‌سازی روت استعلام سلامت اکانت‌ها در [app/api/instagram/health/route.ts](file:///e:/AI/dayrect/app/api/instagram/health/route.ts).
- [x] **T037**: [US6] نمایش بنر هشدار فارسی در پیشخوان هنگام بروز مشکل در اتصال اکانت یا ابطال دسترسی توسط اینستاگرام.

### فاز ۹: داستان کاربری ۷ (P1) — سازنده کمپین با کلمات کلیدی فارسی (Persian Campaign Builder)
- [x] **T038**: [US7] تدوین دیکشنری فارسی بخش سازنده سناریوهای اتوماسیون در `locales/fa/campaigns.json`.
- [x] **T039**: [US7] ارتقای ماژول تطبیق کلمات کلیدی با مدیریت کاراکترهای فارسی، فاصله مجازی و نیم‌فاصله‌ها در [lib/utils/keyword-matcher.ts](file:///e:/AI/dayrect/lib/utils/keyword-matcher.ts).
- [x] **T040**: [US7] بازطراحی فرم ساخت کمپین با اعتبارسنجی Zod و فیلدهای راست‌چین در [components/campaign-builder.tsx](file:///e:/AI/dayrect/components/campaign-builder.tsx).
- [x] **T041**: [US7] به‌روزرسانی کامپوننت انتخاب پست و ریلز با چیدمان RTL در [components/post-picker.tsx](file:///e:/AI/dayrect/components/post-picker.tsx).
- [x] **T042**: [US7] پیاده‌سازی پیش‌نمایش زنده دایرکت و دکمه شیشه‌ای لینک با چیدمان راست‌چین در [components/campaign-preview.tsx](file:///e:/AI/dayrect/components/campaign-preview.tsx).

### فاز ۱۰: داستان کاربری ۸ (P1) — وب‌هوک سریع و ارسال خودکار دایرکت (Non-Blocking Webhook & DM)
- [x] **T043**: [US8] تبدیل هندلر وب‌هوک به مدل سریع و Non-blocking با بازگشت آنی کد ۲۰۰ در [app/api/webhook/route.ts](file:///e:/AI/dayrect/app/api/webhook/route.ts).
- [x] **T044**: [US8] اعتبارسنجی امضای رمزنگاری‌شده `x-hub-signature-256` با کلید سکرت در [lib/meta/webhook.ts](file:///e:/AI/dayrect/lib/meta/webhook.ts).
- [x] **T045**: [US8] انتقال فوری پیلود خام به صف ردیس در [lib/queue/process-webhook.ts](file:///e:/AI/dayrect/lib/queue/process-webhook.ts).
- [x] **T046**: [US8] پردازش جاب توسط ورکر و ارسال متد `sendPrivateReply` به کلاینت گراف متا در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T047**: [US8] ثبت رکورد موفقیت ارسال در جدول `DmLog` در دیتابیس.
- [x] **T048**: [US8] فیلتر کامنت‌های ارسالی توسط خود ادمین پیج جهت جلوگیری از پاسخ به خود.

### فاز ۱۱: داستان کاربری ۹ (P2) — ارسال پاسخ عمومی به کامنت (Public Comment Replies)
- [x] **T049**: [US9] پیاده‌سازی متد ارسال پاسخ عمومی به کامنت در [lib/meta/client.ts](file:///e:/AI/dayrect/lib/meta/client.ts).
- [x] **T050**: [US9] افزودن قابلیت انتخاب تصادفی پاسخ‌های عمومی در سناریوی ورکر در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T051**: [US9] فیلتر و مدیریت خطای ممانعت از ارسال مکرر کامنت در پاسخ به یک رخداد.

### فاز ۱۲: داستان کاربری ۱۰ (P2) — قفل فالو کردن پیج (Follow Gate)
- [x] **T052**: [US10] بررسی متد `getUserFollowStatus` و استعلام فلگ `is_user_follow_business` در [lib/instagram/provider.ts](file:///e:/AI/dayrect/lib/instagram/provider.ts).
- [x] **T053**: [US10] سناریوی ارسال دکمه Postback جهت بررسی مجدد فالو پس از کلیک کاربر در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T054**: [US10] ارسال دایرکت حاوی لینک نهایی پس از احراز فالوور بودن مخاطب.

### فاز ۱۳: داستان کاربری ۱۱ (P1) — کنترل سقف ارسال ساعتی (Rate Limiting 650/hr)
- [x] **T055**: [US11] تنظیم دقیق الگوریتم کنترل ظرفیت ساعتی روی سقف ۶۵۰ پیام در [lib/utils/rate-limiter.ts](file:///e:/AI/dayrect/lib/utils/rate-limiter.ts).
- [x] **T056**: [US11] هدایت جاب‌های سرریز به تاخیر ۵ دقیقه‌ای به جای لغو یا خطا در [lib/queue/dm-worker.ts](file:///e:/AI/dayrect/lib/queue/dm-worker.ts).
- [x] **T057**: [US11] آزادسازی اسلات رزرو شده ردیس در صورت بروز خطای عدم دسترسی یا ریجکت متا.

### فاز ۱۴: داستان کاربری ۱۲ (P2) — لاگ دایرکت‌ها و مانیتورینگ خطاها (DM Activity Logs)
- [x] **T058**: [US12] تدوین دیکشنری فارسی لاگ‌ها و ترجمه کدهای خطای متا در `locales/fa/logs.json`.
- [x] **T059**: [US12] بازطراحی جدول لاگ‌های ارسالی با ستون‌های راست‌چین در [app/(dashboard)/logs/page.tsx](file:///e:/AI/dayrect/app/(dashboard)/logs/page.tsx).
- [x] **T060**: [US12] پیاده‌سازی فیلترهای وضعیت (`موفق`, `در انتظار`, `محدودیت نرخ`, `ناموفق`).
- [x] **T061**: [US12] نمایش پاپ‌اور جزئیات خطا و راهنمای رفع مشکل به زبان فارسی برای ادمین.

### فاز ۱۵: راستی‌آزمایی، تست‌های سرتاسری و تحویل (Verification & Quality Assurance)
- [x] **T062**: آزمون کامل تایپ‌استریکت با `npm run typecheck` و رفع ۱۰۰٪ خطاهای احتمالی.
- [x] **T063**: اجرای تست‌های خودکار با `npm run test` و تایید قبولی تمامی سناریوهای تستی.
- [x] **T064**: ممیزی بصری در مرورگر در حالت راست‌چین و اطمینان از خوانایی فونت وزیرمتن و عدم وجود اسکرول افقی.
- [x] **T065**: به‌روزرسانی راهنمای استقرار و کانفیگ داکر در [README.md](file:///e:/AI/dayrect/README.md) و [docker-compose.yml](file:///e:/AI/dayrect/docker-compose.yml).
- [x] **T066**: ممیزی نهایی امنیتی و تطبیق با تمامی بندهای نظام‌نامه [agent.md](file:///e:/AI/dayrect/agent.md).
