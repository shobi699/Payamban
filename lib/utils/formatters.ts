/**
 * Date and Number formatting utilities for Persian (Jalali) and English
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Convert Latin digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/**
 * Format numbers according to active locale
 */
export function formatNumber(
  value: number,
  locale: "fa" | "en" = "fa",
  options?: Intl.NumberFormatOptions
): string {
  try {
    const formatter = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", options);
    return formatter.format(value);
  } catch {
    return locale === "fa" ? toPersianDigits(value) : String(value);
  }
}

/**
 * Format date to Solar Hijri (Jalali) or Gregorian depending on locale
 */
export function formatDate(
  date: Date | string | number,
  locale: "fa" | "en" = "fa",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  try {
    const d = typeof date === "object" ? date : new Date(date);
    if (isNaN(d.getTime())) return "-";

    const intlLocale = locale === "fa" ? "fa-IR-u-ca-persian" : "en-US";
    const formatter = new Intl.DateTimeFormat(intlLocale, options);
    return formatter.format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format date with time
 */
export function formatDateTime(
  date: Date | string | number,
  locale: "fa" | "en" = "fa"
): string {
  return formatDate(date, locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
