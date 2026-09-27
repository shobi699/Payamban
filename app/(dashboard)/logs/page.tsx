"use client";

/**
 * DM Logs Page
 *
 * Filterable, paginated table of DM logs with Persian RTL layout,
 * Jalali timestamps, and error diagnostic explanations.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState, useCallback } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatusBadge from "@/components/status-badge";
import { formatDateTime, toPersianDigits } from "@/lib/utils/formatters";

interface DmLog {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { key: "ALL", labelKey: "status.all", defaultLabel: "همه" },
  { key: "SENT", labelKey: "status.sent", defaultLabel: "ارسال شد" },
  { key: "FAILED", labelKey: "status.failed", defaultLabel: "ناموفق" },
  { key: "PENDING", labelKey: "status.pending", defaultLabel: "در انتظار" },
  { key: "SKIPPED_RATE_LIMIT", labelKey: "status.rate_limited", defaultLabel: "محدودیت نرخ" },
  { key: "SKIPPED_PLAN_LIMIT", labelKey: "status.plan_limit", defaultLabel: "محدودیت طرح" },
  { key: "SKIPPED_DEDUP", labelKey: "status.duplicate", defaultLabel: "تکراری" },
];

export default function LogsPage() {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedErrorLog, setSelectedErrorLog] = useState<DmLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, selectedAccountId]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLogs]);

  function handleFilterChange(status: string) {
    setLoading(true);
    setStatusFilter(status);
    setPage(1);
  }

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
    setPage(1);
  }

  function getErrorExplanation(errorMsg: string | null | undefined): {
    title: string;
    hint: string;
  } | null {
    if (!errorMsg) return null;
    const lower = errorMsg.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("hourly")) {
      return {
        title: t("logs.filters.rate_limited_only" as any, "محدودیت نرخ (Rate Limited)"),
        hint: t(
          "logs.errors.rate_limit" as any,
          "سقف ارسال ساعتی اینستاگرام پر شده است؛ پیام در صف تاخیر قرار گرفت."
        ),
      };
    }
    if (lower.includes("token") || lower.includes("expired") || lower.includes("190")) {
      return {
        title: t("status.expiring_soon" as any, "انقضای توکن دسترسی"),
        hint: t(
          "logs.errors.token_expired" as any,
          "توکن دسترسی منقضی شده است. لطفا در تنظیمات مجدداً متصل شوید."
        ),
      };
    }
    if (lower.includes("invalid for a private reply") || lower.includes("already")) {
      return {
        title: t("status.duplicate" as any, "پاسخ تکراری"),
        hint: t(
          "logs.errors.already_replied" as any,
          "به این کامنت قبلاً یک پیام خصوصی ارسال شده است (محدودیت قانونی متا)."
        ),
      };
    }
    if (lower.includes("outside of allowed window") || lower.includes("7 day")) {
      return {
        title: t("status.failed" as any, "پایان مهلت قانونی پاسخ"),
        hint: t(
          "logs.errors.outside_window" as any,
          "از زمان ثبت کامنت بیش از ۷ روز گذشته است (پایان مهلت قانونی پاسخ خصوصی متا)."
        ),
      };
    }
    if (lower.includes("cannot be found") || lower.includes("user")) {
      return {
        title: t("status.failed" as any, "عدم دسترسی به کاربر"),
        hint: t(
          "logs.errors.user_cannot_be_found" as any,
          "حساب کاربری مخاطب در دسترس نیست یا دایرکت‌های خود را بسته است."
        ),
      };
    }
    return {
      title: t("status.failed" as any, "خطای ارسال"),
      hint: errorMsg,
    };
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {t("logs.title" as any, "گزارش ارسال دایرکت‌ها")}
        </h1>
        <p className="text-xs text-muted sm:text-sm">
          {t(
            "logs.subtitle" as any,
            "مشاهده وضعیت، زمان و جزئیات تمام پیام‌های خصوصی ارسال‌شده به مخاطبان"
          )}
        </p>
      </div>

      {/* Filters & Account Select */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleFilterChange(item.key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${
                  statusFilter === item.key
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "bg-surface text-muted border border-border hover:border-border-hover hover:text-foreground"
                }
              `}
            >
              {t(item.labelKey as any, item.defaultLabel)}
            </button>
          ))}
        </div>
        {accounts.length > 1 && (
          <AccountSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Logs Table */}
      <div className="panel rounded-xl overflow-hidden border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/30 text-start">
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("logs.columns.recipient" as any, "مخاطب")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("logs.columns.trigger_comment" as any, "کامنت محرک")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("Campaign", "کمپین")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("Account", "اکانت")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("logs.columns.status" as any, "وضعیت")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-start">
                  {t("logs.columns.timestamp" as any, "زمان ثبت")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-muted tracking-wider sm:px-6 text-center">
                  {t("logs.columns.details" as any, "جزئیات")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-4 sm:px-6">
                        <div className="h-4 bg-surface-hover rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted sm:px-6">
                    {t("logs.empty_logs" as any, "هیچ گزارشی برای نمایش وجود ندارد.")}
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => {
                  const hasError = Boolean(log.errorMessage);
                  const isFailedOrLimited =
                    log.status === "FAILED" ||
                    log.status === "SKIPPED_RATE_LIMIT" ||
                    log.status === "SKIPPED_PLAN_LIMIT";
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-hover/50 transition-colors"
                    >
                      <td className="px-4 py-4 sm:px-6 text-start">
                        <span className="font-semibold text-foreground">
                          @{log.commenterName ?? log.commenterId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-[220px] sm:px-6 text-start">
                        <span className="text-muted truncate block" title={log.commentText}>
                          {log.commentText}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 text-start">
                        <span className="text-muted font-medium">
                          {log.automation.name}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 text-start">
                        <span className="text-muted text-xs font-mono">
                          @{log.instagramAccount.username}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6 text-start">
                        <StatusBadge status={log.status} showDot />
                      </td>
                      <td className="px-4 py-4 text-muted whitespace-nowrap text-xs sm:px-6 text-start">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td className="px-4 py-4 text-center sm:px-6">
                        {hasError || isFailedOrLimited ? (
                          <button
                            type="button"
                            onClick={() => setSelectedErrorLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition"
                            title="مشاهده جزئیات خطا"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>راهنما</span>
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-t border-border bg-surface-hover/20 sm:px-6">
            <p className="text-xs text-muted">
              {locale === "fa" ? (
                <>
                  نمایش {toPersianDigits((pagination.page - 1) * pagination.limit + 1)} تا{" "}
                  {toPersianDigits(
                    Math.min(pagination.page * pagination.limit, pagination.total)
                  )}{" "}
                  از مجموع {toPersianDigits(pagination.total)} رکورد
                </>
              ) : (
                t("Showing {start}–{end} of {total}", {
                  start: (pagination.page - 1) * pagination.limit + 1,
                  end: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage(page - 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {t("Previous", "قبلی")}
              </button>
              <span className="text-xs text-muted px-2 font-mono">
                {locale === "fa"
                  ? `${toPersianDigits(page)} / ${toPersianDigits(pagination.totalPages)}`
                  : `${page} / ${pagination.totalPages}`}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setPage(page + 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:text-foreground hover:border-border-hover transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {t("Next", "بعدی")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Details Modal / Popover (T061) */}
      {selectedErrorLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedErrorLog(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedErrorLog.status} showDot />
                <h3 className="text-sm font-semibold text-foreground">
                  جزئیات خطای رخداده
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedErrorLog(null)}
                className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface-hover"
                aria-label={t("actions.cancel" as any, "بستن")}
              >
                ✕
              </button>
            </div>

            {(() => {
              const explanation = getErrorExplanation(selectedErrorLog.errorMessage);
              return (
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-hover/60 border border-border p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-accent">
                      {explanation?.title ?? "علت خطا"}
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {explanation?.hint}
                    </p>
                  </div>

                  {selectedErrorLog.errorMessage && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted">
                        پیام فنی خام بازگشتی:
                      </span>
                      <pre className="rounded bg-black/40 p-2.5 text-xs text-rose-300 font-mono overflow-x-auto whitespace-pre-wrap break-all border border-rose-500/20">
                        {selectedErrorLog.errorMessage}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-2 border-t border-border">
                    <div>
                      <span className="opacity-70">اکانت: </span>
                      <span className="font-semibold text-foreground">
                        @{selectedErrorLog.instagramAccount.username}
                      </span>
                    </div>
                    <div>
                      <span className="opacity-70">زمان: </span>
                      <span className="font-semibold text-foreground">
                        {formatDateTime(selectedErrorLog.createdAt, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedErrorLog(null)}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition"
              >
                {t("actions.cancel" as any, "متوجه شدم")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
