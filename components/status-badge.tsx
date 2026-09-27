"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * Status badge for DM statuses and Instagram Token Health.
 */
interface StatusConfig {
  className: string;
  key: string;
  defaultLabel: string;
}

const statusConfig: Record<string, StatusConfig> = {
  // DM statuses
  SENT: {
    className: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.sent",
    defaultLabel: "ارسال شد",
  },
  FAILED: {
    className: "text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.failed",
    defaultLabel: "ناموفق",
  },
  PENDING: {
    className: "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.pending",
    defaultLabel: "در انتظار",
  },
  SKIPPED_DEDUP: {
    className: "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.duplicate",
    defaultLabel: "تکراری",
  },
  SKIPPED_RATE_LIMIT: {
    className: "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.rate_limited",
    defaultLabel: "محدودیت نرخ",
  },
  SKIPPED_PLAN_LIMIT: {
    className: "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.plan_limit",
    defaultLabel: "محدودیت طرح",
  },
  SKIPPED_NO_MATCH: {
    className: "text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 rounded-full text-xs font-medium",
    key: "status.all",
    defaultLabel: "بدون تطابق",
  },

  // Token Health Statuses (T035)
  HEALTHY: {
    className: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
    key: "status.healthy",
    defaultLabel: "متصل و پایدار",
  },
  EXPIRING_SOON: {
    className: "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
    key: "status.expiring_soon",
    defaultLabel: "نیاز به تمدید",
  },
  EXPIRED: {
    className: "text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
    key: "status.expired",
    defaultLabel: "منقضی شده",
  },
  REVOKED: {
    className: "text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
    key: "status.revoked",
    defaultLabel: "دسترسی لغو شده",
  },
};

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
}

export default function StatusBadge({ status, showDot = false }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] ?? statusConfig.PENDING;

  return (
    <span className={`shrink-0 whitespace-nowrap ${config.className}`}>
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 inline-block" />
      )}
      {t(config.key as any, config.defaultLabel)}
    </span>
  );
}
