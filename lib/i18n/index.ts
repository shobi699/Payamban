/**
 * OpenReply i18n Core Engine with Full Persian (RTL) and English (LTR) Support
 */

import type { Locale, Direction, I18nInstance } from "./types";
import { formatNumber, formatDate } from "@/lib/utils/formatters";

// Persian Dictionaries
import commonFa from "@/locales/fa/common.json";
import dashboardFa from "@/locales/fa/dashboard.json";
import campaignsFa from "@/locales/fa/campaigns.json";
import settingsFa from "@/locales/fa/settings.json";
import logsFa from "@/locales/fa/logs.json";

// English Dictionaries
import commonEn from "@/locales/en/common.json";
import dashboardEn from "@/locales/en/dashboard.json";
import campaignsEn from "@/locales/en/campaigns.json";
import settingsEn from "@/locales/en/settings.json";
import logsEn from "@/locales/en/logs.json";

export * from "./types";

export const dictionaries = {
  fa: {
    common: commonFa,
    dashboard: dashboardFa,
    campaigns: campaignsFa,
    settings: settingsFa,
    logs: logsFa,
  },
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    campaigns: campaignsEn,
    settings: settingsEn,
    logs: logsEn,
  },
};

export const SUPPORTED_LOCALES: Locale[] = ["fa", "en"];
export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "openreply-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "fa" || value === "en";
}

export function resolveLocale(value: unknown): Locale {
  if (value === "zh-TW") return "en";
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function resolveDirection(locale: Locale): Direction {
  return locale === "fa" ? "rtl" : "ltr";
}

/**
 * Legacy phrase dictionary for quick backwards compatibility
 */
const legacyFaMap: Record<string, string> = {
  "Dashboard": "پیشخوان",
  "Overview": "نمای کلی",
  "Inbox": "صندوق پیام",
  "Campaigns": "کمپین‌ها",
  "New Campaign": "کمپین جدید",
  "Edit campaign": "ویرایش کمپین",
  "Campaign details": "جزئیات کمپین",
  "DM Logs": "گزارش دایرکت‌ها",
  "Settings": "تنظیمات",
  "Diagnostics": "عیب‌یابی سیستم",
  "Self-hosted": "خودمیزبان (Self-hosted)",
  "Interface language": "زبان رابط کاربری",
  "Saved in this browser. Campaign messages stay unchanged.": "در این مرورگر ذخیره می‌شود. پیام‌های ارسالی کمپین تغییری نمی‌کنند.",
  "Instagram Connection": "اتصال اینستاگرام",
  "Status": "وضعیت",
  "Comment webhooks and private replies depend on this connection.": "پذیرش وبهوک و ارسال دایرکت منوط به این اتصال است.",
  "Connected": "متصل",
  "Not connected": "متصل نیست",
  "Connect": "اتصال",
  "Connect Instagram": "اتصال اکانت اینستاگرام",
  "Connect another Instagram account": "اتصال اکانت اینستاگرام دیگر",
  "Toggle sidebar": "تغییر وضعیت سایدبار",
  "Menu": "منو",
  "All": "همه",
  "Sent": "ارسال شد",
  "SENT": "ارسال شد",
  "Failed": "ناموفق",
  "FAILED": "ناموفق",
  "Pending": "در انتظار",
  "PENDING": "در انتظار",
  "Rate limited": "محدودیت نرخ (Rate Limited)",
  "Plan limit": "محدودیت طرح",
  "Dedup": "تکراری",
  "Owner": "مالک",
  "OWNER": "مالک",
  "Admin": "مدیر",
  "ADMIN": "مدیر",
  "Member": "عضو",
  "MEMBER": "عضو",
  "Active": "فعال",
  "active": "فعال",
  "Paused": "متوقف",
  "paused": "متوقف",
  "Active Campaigns": "کمپین‌های فعال",
  "All accounts": "همه اکانت‌ها",
  "All time": "تمام زمان‌ها",
  "{count} accounts": "{count} اکانت",
  "Posts & Reels": "پست‌ها و مدیا",
  "Media": "پست‌ها و ریلزها",
  "Forms": "فرم‌ساز دایرکت",
  "Form Builder": "فرم‌ساز دایرکت",
  "Unanswered Comments": "کامنت‌های بی‌پاسخ",
  "Showcase": "ویترین محصولات",
  "Product Showcase": "ویترین محصولات دایرکت",
  "Follow-ups": "پیگیری خودکار",
  "Automated Follow-ups": "پیگیری خودکار (فالوآپ)",
  "Phonebook": "دفترچه تلفن",
  "Contacts": "دفترچه تلفن و شماره‌ها",
  "Smart SMS": "پیامک هوشمند",
  "SMS Marketing": "پیامک هوشمند",
  "Billing": "ارتقای اشتراک و پلن‌ها",
  "Billing & Plans": "پلن‌ها و تعرفه‌ها",
  "Affiliate": "همکاری در فروش",
  "Affiliate Program": "همکاری در فروش (افیلیت)",
  "Super Admin": "مدیریت کل سامانه",
  "Admin Panel": "پنل مدیریت کل",
};

/**
 * Access nested dictionary value with dot-path (e.g. "common.nav.dashboard")
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function createI18n(locale: Locale): I18nInstance {
  const resolvedLocale = resolveLocale(locale);
  const direction = resolveDirection(resolvedLocale);
  const dict = dictionaries[resolvedLocale];

  function t(
    key: string,
    valuesOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ): string {
    const isFallbackString = typeof valuesOrFallback === "string";
    const explicitFallback = isFallbackString ? valuesOrFallback : fallback;
    const values = isFallbackString ? undefined : valuesOrFallback;

    // 1. Try dot-notation path in current locale dictionary
    let message = getNestedValue(dict, key);

    // 2. If not found and locale is fa, check legacy Fa map
    if (!message && resolvedLocale === "fa" && key in legacyFaMap) {
      message = legacyFaMap[key];
    }

    // 3. Fallback to English dictionary
    if (!message && resolvedLocale !== "en") {
      message = getNestedValue(dictionaries.en, key);
    }

    // 4. Default fallback to explicit fallback or key itself
    if (!message) {
      message = explicitFallback ?? key;
    }

    // Replace {placeholder} variables
    if (values) {
      return message.replace(/\{(\w+)\}/g, (match, name: string) => {
        const val = values[name];
        if (val === undefined) return match;
        return resolvedLocale === "fa" && typeof val === "number"
          ? formatNumber(val, "fa")
          : String(val);
      });
    }

    return message;
  }

  return {
    locale: resolvedLocale,
    direction,
    t,
    label: t,
    formatNumber: (val: number) => formatNumber(val, resolvedLocale),
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, resolvedLocale, options),
  };
}

export type I18n = ReturnType<typeof createI18n>;
