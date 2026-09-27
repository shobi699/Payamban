"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * Stat Card
 *
 * Metric panel with label, localized value, and optional trend indicator.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, value, trend, trendUp }: StatCardProps) {
  const { t, formatNumber, locale } = useI18n();

  const displayValue =
    typeof value === "number" ? formatNumber(value) : value;

  return (
    <div className="panel rounded-xl p-5 border border-border bg-surface shadow-xs transition-shadow hover:shadow-sm">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-foreground mt-2 tracking-tight">
        {displayValue}
      </p>
      {trend && (
        <p
          className={`text-xs mt-2 font-medium inline-flex items-center gap-1 ${
            trendUp ? "text-success" : "text-error"
          }`}
        >
          <span>{trendUp ? (locale === "fa" ? "↑ افزایش" : "↑ Up") : (locale === "fa" ? "↓ کاهش" : "↓ Down")}</span>
          <span>{trend}</span>
        </p>
      )}
    </div>
  );
}
