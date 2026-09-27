# قرارداد معماری سیستم چندزبانه (i18n Interface Contract)
# ویژگی: `001-persian-rtl-instagram-automation`

این سند قرارداد فنی سیستم بین‌المللی‌سازی، توابع کلاینت و سرور، ساختار کلیدهای معنایی و نحوه همگام‌سازی تگ HTML و کوکی را تعریف می‌کند.

---

## ۱. امضای توابع و اینترفیس کلاینت و سرور

### ۱.۱. اینترفیس اصلی موتور ترجمه (`I18nInstance`)

```typescript
export type Locale = "fa" | "en";
export type Direction = "rtl" | "ltr";

export interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatNumber: (value: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  changeLocale: (newLocale: Locale) => Promise<void>;
}
```

### ۱.۲. استفاده در کامپوننت‌های سرور و کلاینت
* **کلاینت کامپوننت‌ها (`"use client"`):**
  ```typescript
  import { useI18n } from "@/lib/i18n/provider";
  
  export function DashboardHeader() {
    const { t, formatNumber, formatDate } = useI18n();
    return (
      <h1>{t("dashboard.welcome", { name: "علی" })}</h1>
    );
  }
  ```
* **سرور کامپوننت‌ها (Server Components):**
  ```typescript
  import { getI18n } from "@/lib/i18n/server";
  
  export default async function Page() {
    const { t, locale, direction } = await getI18n();
    return <main dir={direction}>{t("dashboard.title")}</main>;
  }
  ```

---

## ۲. ساختار کاتالوگ دیکشنری‌ها (Namespace Schemas)

نمونه فایل ساختار یافته فارسی: `locales/fa/common.json`
```json
{
  "app_name": "اپن‌ریپلای",
  "direction": "rtl",
  "navigation": {
    "dashboard": "پیشخوان",
    "campaigns": "کمپین‌ها",
    "inbox": "صندوق پیام",
    "logs": "گزارش دایرکت‌ها",
    "settings": "تنظیمات"
  },
  "actions": {
    "save": "ذخیره تغییرات",
    "cancel": "انصراف",
    "delete": "حذف",
    "edit": "ویرایش",
    "connect_instagram": "اتصال اکانت اینستاگرام",
    "disconnect": "قطع اتصال"
  },
  "status": {
    "active": "فعال",
    "paused": "متوقف",
    "healthy": "متصل و پایدار",
    "expiring_soon": "نیاز به تمدید",
    "expired": "منقضی شده"
  }
}
```

نمونه فایل ساختار یافته فارسی: `locales/fa/campaigns.json`
```json
{
  "title": "مدیریت کمپین‌های خودکار",
  "create_new": "ایجاد سناریوی جدید",
  "form": {
    "name_label": "عنوان سناریو",
    "keywords_label": "کلمات کلیدی تحریک پاسخ",
    "keywords_placeholder": "کلمات را وارد کرده و اینتر بزنید...",
    "matching_mode": "نوع تطبیق کلمه",
    "exact_match": "تطبیق دقیق (کل کلمه)",
    "partial_match": "شامل کلمه باشد",
    "dm_text_label": "متن دایرکت ارسالی",
    "button_title_label": "متن دکمه لینک",
    "button_url_label": "آدرس مقصد لینک",
    "public_reply_toggle": "ارسال پاسخ عمومی به کامنت",
    "follow_gate_toggle": "قفل فالو (ارسال لینک تنها پس از فالو کردن پیج)"
  }
}
```

---

## ۳. قرارداد کوکی و تغییر جهت DOM

* **نام کوکی:** `openreply-locale`
* **تنظیمات کوکی:** `SameSite=Lax; Path=/; Max-Age=31536000` (یک سال اعتبار)
* **رفتار DOM در زمان جابجایی:**
  * در زمان انتخاب زبان فارسی (`fa`):
    `<html lang="fa" dir="rtl" class="font-sans-fa">`
  * در زمان انتخاب زبان انگلیسی (`en`):
    `<html lang="en" dir="ltr" class="font-sans-en">`
