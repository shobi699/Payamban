"use client";

/**
 * Dashboard Home Page
 *
 * Overview cards, 7-day chart, and recent activity feed.
 */

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  instagramAccounts: AccountOption[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: Array<{
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: string;
    automation: { name: string };
    instagramAccount?: { username: string };
  }>;
}

interface AccountHealthItem {
  id: string;
  username: string;
  name?: string | null;
  tokenStatus: "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";
  daysRemaining: number | null;
}

export default function DashboardPage() {
  const { t, label } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [healthIssues, setHealthIssues] = useState<AccountHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  useEffect(() => {
    // Check account health & token statuses
    fetch("/api/instagram/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.accounts)) {
          const issues = data.accounts.filter(
            (a: AccountHealthItem) => a.tokenStatus !== "HEALTHY"
          );
          setHealthIssues(issues);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }

    fetch(`/api/dashboard/stats${params.size ? `?${params}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setSelectedAccountId(accountId);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="panel rounded p-5 h-32">
              <div className="w-10 h-10 rounded bg-surface-hover" />
              <div className="mt-4 h-6 w-16 bg-surface-hover rounded" />
              <div className="mt-2 h-4 w-24 bg-surface-hover/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxDM = Math.max(...(stats?.dailyDMs.map((d) => d.count) ?? [1]), 1);

  const connectedCount = stats?.instagramAccounts.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Greeting header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("Hello, {name}!", { name: stats?.userName ?? t("there") })}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(connectedCount === 1 ? "{count} connected account" : "{count} connected accounts", { count: connectedCount })}
            {" · "}
            {t(stats?.contactsCount === 1 ? "{count} contact" : "{count} contacts", { count: stats?.contactsCount ?? 0 })}
            {" · "}
            <a href="/logs" className="text-accent hover:underline">
              {t("See activity")}
            </a>
          </p>
        </div>
        {stats && stats.instagramAccounts.length > 1 && (
          <AccountSelect
            accounts={stats.instagramAccounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {/* Account Health Warning Banner (T037) */}
      {healthIssues.length > 0 && (
        <div className="space-y-3">
          {healthIssues.map((account) => {
            const isDanger =
              account.tokenStatus === "REVOKED" ||
              account.tokenStatus === "EXPIRED";
            return (
              <div
                key={account.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border ${
                  isDanger
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={account.tokenStatus} showDot />
                  <p className="text-sm font-medium leading-relaxed truncate">
                    {isDanger
                      ? t(
                          "warnings.token_revoked" as any,
                          `دسترسی اکانت @${account.username} لغو شده یا منقضی گردیده است. لطفا جهت تداوم ارسال دایرکت‌ها اتصال را تجدید فرمایید.`
                        )
                      : t(
                          "warnings.token_expiring" as any,
                          `توکن دسترسی اکانت @${account.username} ظرف ${account.daysRemaining ?? "چند"} روز آینده منقضی می‌شود.`
                        )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/api/instagram/connect"
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                      isDanger
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-amber-600 text-white hover:bg-amber-500"
                    }`}
                  >
                    {t("warnings.reconnect_btn" as any, "اتصال مجدد اکانت")}
                  </a>
                  <a
                    href="/settings"
                    className="px-3 py-1.5 rounded text-xs font-medium border border-border/60 hover:bg-surface-hover transition"
                  >
                    {t("warnings.settings_btn" as any, "مشاهده در تنظیمات")}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label={t("Active Campaigns")}
          value={stats?.activeAutomations ?? 0}
        />
        <StatCard label={t("DMs Sent")} value={stats?.dmsSentMonth ?? 0} />
        <StatCard label={t("Skipped")} value={stats?.dmsSkippedMonth ?? 0} />
        <StatCard label={t("Failed")} value={stats?.dmsFailedMonth ?? 0} />
        <StatCard label={t("Clicks")} value={stats?.clicksThisMonth ?? 0} />
        <StatCard label={t("CTR")} value={`${stats?.ctrThisMonth ?? 0}%`} />
      </div>

      {/* Directam Core Suite Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              ابزارهای هوشمند بازاریابی اینستاگرام (Directam Suite)
            </h2>
            <p className="text-xs text-muted mt-0.5">
              دسترسی سریع به امکانات اختصاصی اتوماسیون، افزایش فروش و جذب لید
            </p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent border border-accent/20">
            ۹ ماژول هوشمند فعال
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: پاسخ دایرکت */}
          <a
            href="/campaigns"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">پاسخ دایرکت</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">پاسخ خودکار دایرکت و ریپلای استوری</p>
            </div>
          </a>

          {/* Card 2: پاسخ کامنت */}
          <a
            href="/campaigns"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">پاسخ کامنت</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">پاسخ خودکار در کامنت یا ارسال دایرکت</p>
            </div>
          </a>

          {/* Card 3: پیگیری خودکار */}
          <a
            href="/followups"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">پیگیری خودکار</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">پیام یادآوری خودکار و فالوآپ به مشتری</p>
            </div>
          </a>

          {/* Card 4: فرم ساز */}
          <a
            href="/forms"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">فرم‌ساز دایرکت</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">دریافت گام به گام اطلاعات و لید کاربران</p>
            </div>
          </a>

          {/* Card 5: کامنت بی پاسخ */}
          <a
            href="/comments"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">کامنت بی‌پاسخ</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">شناسایی و پاسخ سریع به کامنت‌های فعال</p>
            </div>
          </a>

          {/* Card 6: دفترچه تلفن */}
          <a
            href="/contacts"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">دفترچه تلفن</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">لیست و بانک شماره‌های همراه فالوورها</p>
            </div>
          </a>

          {/* Card 7: پیامک هوشمند */}
          <a
            href="/sms"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">پیامک هوشمند</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">ارسال پیامک آنی و انبوه به مخاطبان</p>
            </div>
          </a>

          {/* Card 8: دسترسی به ادمین */}
          <a
            href="/settings"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">دسترسی به ادمین</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">افزودن ادمین و تعیین سطح دسترسی تیمی</p>
            </div>
          </a>

          {/* Card 9: همکاری در فروش */}
          <a
            href="/affiliate"
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors">همکاری در فروش</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">دریافت کمیسیون نقدی با معرفی افراد</p>
            </div>
          </a>
        </div>
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-3 panel rounded p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-6">{t("DMs — Last 7 Days")}</h2>
          <div className="flex items-end gap-1.5 h-40 sm:gap-2">
            {stats?.dailyDMs.map((day) => (
              <div key={label(day.date)} className="min-w-0 flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-muted font-medium">{day.count}</span>
                <div
                  className="w-full rounded-sm bg-accent min-h-[4px]"
                  style={{ height: `${Math.max((day.count / maxDM) * 100, 4)}%` }}
                />
                {/* Seven labels share a phone's width, so they must not wrap. */}
                <span className="w-full truncate text-center text-[10px] text-zinc-500">
                  {label(day.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Keywords */}
        <div className="lg:col-span-1 panel rounded p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("Top Keywords")}</h2>
          <div className="space-y-3">
            {stats?.topKeywords.length === 0 && (
              <p className="text-sm text-muted py-8">{t("No keyword matches yet")}</p>
            )}
            {stats?.topKeywords.map((keyword) => (
              <div key={keyword.keyword} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">
                  {keyword.keyword}
                </span>
                <span className="text-xs text-muted">{keyword.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 panel rounded p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("Recent Activity")}</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {stats?.recentLogs.length === 0 && (
              <p className="text-sm text-muted text-center py-8">{t("No activity yet")}</p>
            )}
            {stats?.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{log.commenterName ?? "unknown"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {log.instagramAccount
                      ? `@${log.instagramAccount.username} · `
                      : ""}
                    {log.commentText}
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
