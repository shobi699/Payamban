/**
 * Strong Type-Safe definitions for OpenReply i18n
 */

import type commonFa from "@/locales/fa/common.json";
import type dashboardFa from "@/locales/fa/dashboard.json";
import type campaignsFa from "@/locales/fa/campaigns.json";
import type settingsFa from "@/locales/fa/settings.json";
import type logsFa from "@/locales/fa/logs.json";

export type Locale = "fa" | "en";
export type Direction = "rtl" | "ltr";

export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "openreply-locale";

// Recursive dot-path helper
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Leaves<T> = T extends object
  ? { [K in keyof T]-?: Join<K, Leaves<T[K]>> }[keyof T]
  : "";

export type CommonKey = Leaves<typeof commonFa>;
export type DashboardKey = Leaves<typeof dashboardFa>;
export type CampaignsKey = Leaves<typeof campaignsFa>;
export type SettingsKey = Leaves<typeof settingsFa>;
export type LogsKey = Leaves<typeof logsFa>;

export type TranslationKey =
  | `common.${CommonKey}`
  | `dashboard.${DashboardKey}`
  | `campaigns.${CampaignsKey}`
  | `settings.${SettingsKey}`
  | `logs.${LogsKey}`;

export type StaticMessageKey = string;

export interface I18nInstance {
  locale: Locale;
  direction: Direction;
  t: (
    key: string,
    valuesOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ) => string;
  label: (
    key: string,
    valuesOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ) => string;
  formatNumber: (value: number) => string;
  formatDate: (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string;
}
