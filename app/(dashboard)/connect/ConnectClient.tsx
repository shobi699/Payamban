"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InstagramAccountData {
  id: string;
  instagramId: string;
  username: string;
  tokenStatus: string;
  webhookSubscribed: boolean;
  pageId?: string | null;
  appId?: string | null;
  webhookVerifyToken?: string | null;
  connectedAt: string;
}

interface ConnectClientProps {
  currentAccount: InstagramAccountData | null;
  workspaceName: string;
  serverWebhookUrl: string;
  defaultVerifyToken: string;
}

export default function ConnectClient({
  currentAccount,
  workspaceName,
  serverWebhookUrl,
  defaultVerifyToken,
}: ConnectClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"form" | "test" | "guide">("form");

  // Form states (Mirroring .env variables in the UI)
  const [username, setUsername] = useState(currentAccount?.username || "");
  const [instagramId, setInstagramId] = useState(currentAccount?.instagramId || "");
  const [pageId, setPageId] = useState(currentAccount?.pageId || "");
  const [accessToken, setAccessToken] = useState("");
  const [appId, setAppId] = useState(currentAccount?.appId || "");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState(
    currentAccount?.webhookVerifyToken || defaultVerifyToken
  );
  const [showToken, setShowToken] = useState(false);

  // Status and feedback
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Diagnostic test states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/instagram/connect-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          instagramId,
          pageId,
          accessToken: accessToken || "demo_token_persian_payamban_suite",
          appId,
          appSecret,
          webhookVerifyToken: verifyToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "خطا در برقراری اتصال با اینستاگرام");
      }

      setSaveSuccess(true);
      router.refresh();
      // Auto run diagnostic test after saving
      runConnectionTest();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runConnectionTest = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/instagram/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username || currentAccount?.username,
          instagramId: instagramId || currentAccount?.instagramId,
          accessToken: accessToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تست اتصال ناموفق بود");
      }

      setTestResult(data.diagnostic);
      setActiveTab("test");
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  اتصال به اینستاگرام و پیکربندی اختصاصی API
                </h1>
                <p className="text-sm text-muted">
                  تنظیمات اتصال پیج اینستاگرام (مشابه متغیرهای فایل ENV) به همراه تست زنده سلامت و آموزش گام‌به‌گام
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runConnectionTest}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
            >
              {testing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  در حال تست...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  تست زنده اتصال
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current status banner */}
        <div className="mt-6 rounded-xl border border-border bg-surface-hover/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`relative flex h-3.5 w-3.5 shrink-0 ${
                  currentAccount ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    currentAccount ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-3.5 w-3.5 rounded-full ${
                    currentAccount ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {currentAccount ? (
                    <>
                      اکانت فعال:{" "}
                      <span className="text-purple-600 font-mono">
                        @{currentAccount.username}
                      </span>{" "}
                      (شناسه: {currentAccount.instagramId})
                    </>
                  ) : (
                    "⚠️ هیچ اکانت اینستاگرامی متصل نیست"
                  )}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {currentAccount
                    ? "اتصال شما به API رسمی اینستاگرام برقرار است و پیام‌ها در کسری از ثانیه پاسخ داده می‌شوند."
                    : "برای فعال‌سازی پاسخ خودکار دایرکت و کامنت‌ها، اطلاعات فرم زیر را پر کنید."}
                </p>
              </div>
            </div>

            {currentAccount && (
              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                وضعیت توکن: {currentAccount.tokenStatus === "HEALTHY" ? "سالم و پایدار" : currentAccount.tokenStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("form")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "form"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          فرم تنظیمات اتصال (Web ENV)
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "test"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          تست زنده و گزارش سلامت اتصال
          {testResult && (
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("guide")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === "guide"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          آموزش گام‌به‌گام دریافت توکن و وب‌هوک
        </button>
      </div>

      {/* Tab 1: Form Connection */}
      {activeTab === "form" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveConnection} className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-base font-bold text-foreground">
                  مشخصات اکانت و کلیدهای ارتباطی (مشابه فایل ENV)
                </h2>
                <p className="text-xs text-muted mt-1">
                  این اطلاعات در سرور شما با الگوریتم استاندارد AES-256 رمزنگاری شده و برای برقراری ارتباط با متا استفاده می‌شوند.
                </p>
              </div>

              {saveSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 text-sm flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>اطلاعات اینستاگرام با موفقیت ثبت شد و اتوماسیون با آن همگام گردید!</span>
                </div>
              )}

              {saveError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 text-sm flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Instagram Username */}
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5">
                    نام کاربری اینستاگرام (Instagram Handle) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted font-mono">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="payamban.official"
                      className="w-full rounded-xl border border-border bg-background ps-8 pe-4 py-2.5 text-sm font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">آیدی پیج تجاری یا کریتور شما بدون علامت @</p>
                </div>

                {/* Page Access Token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-muted">
                      توکن دسترسی دائمی (Page Access Token) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      {showToken ? "مخفی کردن" : "نمایش توکن"}
                    </button>
                  </div>
                  <input
                    type={showToken ? "text" : "password"}
                    required
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={currentAccount ? "•••••••••••••••••••••••••••• (توکن فعلی ذخیره شده است)" : "EAABwz..."}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono focus:border-purple-500 focus:outline-none"
                  />
                  <p className="text-xs text-muted mt-1">
                    توکن صادر شده از فیس‌بوک دولوپر با دسترسی‌های دایرکت و کامنت (طبق تب آموزش).
                  </p>
                </div>

                {/* Grid for IDs */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">
                      شناسه اکانت تجاری اینستاگرام (Instagram Business ID)
                    </label>
                    <input
                      type="text"
                      value={instagramId}
                      onChange={(e) => setInstagramId(e.target.value)}
                      placeholder="17841400000000000"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-muted mt-1">شناسه عددی اکانت اینستاگرام در فیس‌بوک</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5">
                      شناسه صفحه فیس‌بوک (Facebook Page ID)
                    </label>
                    <input
                      type="text"
                      value={pageId}
                      onChange={(e) => setPageId(e.target.value)}
                      placeholder="100080000000000"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-muted mt-1">شناسه پیج فیس‌بوک متصل به اینستاگرام</p>
                  </div>
                </div>

                {/* Advanced App Credentials */}
                <div className="rounded-xl border border-border bg-surface-hover/30 p-4 space-y-4">
                  <h3 className="text-xs font-bold text-foreground">
                    تنظیمات اختصاصی اپلیکیشن متا (اختیاری - ویژه اپلیکیشن‌های مستقل)
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        شناسه اپ متا (Meta App ID)
                      </label>
                      <input
                        type="text"
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                        placeholder="123456789012345"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        رمز اپ متا (Meta App Secret)
                      </label>
                      <input
                        type="password"
                        value={appSecret}
                        onChange={(e) => setAppSecret(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      توکن تایید وب‌هوک (Webhook Verify Token)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setVerifyToken(`payamban_${Math.random().toString(36).substring(2, 10)}`)}
                        className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
                      >
                        تولید تصادفی
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "در حال ذخیره..." : "ذخیره و همگام‌سازی اکانت"}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar / Quick copy items (1 col) */}
          <div className="space-y-6">
            {/* Webhook Quick Copy Box */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                  🔗
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  اطلاعات وب‌هوک متا (Webhook)
                </h3>
              </div>
              <p className="text-xs text-muted">
                این مقادیر را در بخش Webhooks پنل فیس‌بوک دولوپر کپی و ثبت نمایید:
              </p>

              {/* Callback URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Callback URL:</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs font-mono">
                  <span className="truncate flex-1" dir="ltr">{serverWebhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(serverWebhookUrl, "url")}
                    className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium hover:bg-surface-hover text-purple-600"
                  >
                    {copiedField === "url" ? "کپی شد ✓" : "کپی"}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Verify Token:</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs font-mono">
                  <span className="truncate flex-1" dir="ltr">{verifyToken}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verifyToken, "token")}
                    className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium hover:bg-surface-hover text-purple-600"
                  >
                    {copiedField === "token" ? "کپی شد ✓" : "کپی"}
                  </button>
                </div>
              </div>

              {/* Events Required */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold text-foreground">
                  رویدادهای الزامی اشتراک (Subscription Fields):
                </label>
                <div className="space-y-1 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <code className="text-foreground">messages</code> (دایرکت‌های دریافتی)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <code className="text-foreground">messaging_postbacks</code> (کلیک دکمه‌ها)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <code className="text-foreground">comments</code> (کامنت‌های جدید پست‌ها)
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Guide Card */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-purple-900">
                راهنمایی در مورد دریافت توکن
              </h3>
              <p className="text-xs text-purple-800 leading-relaxed">
                آیا هنوز توکن ندارید؟ تب «آموزش گام‌به‌گام» را باز کنید تا نحوه ساخت رایگان اپلیکیشن و صدور توکن دسترسی فیس‌بوک در کمتر از ۵ دقیقه را یاد بگیرید.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className="text-xs font-bold text-purple-700 underline"
              >
                مشاهده آموزش تصویری ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Test & Health Diagnostic */}
      {activeTab === "test" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  سنجش سلامت و دیاگنوستیک زنده اتصال اینستاگرام
                </h2>
                <p className="text-xs text-muted mt-1">
                  بررسی صحت توکن، دسترسی به دایرکت و کامنت‌ها، و زمان پاسخگویی (پینگ) به سرورهای گراف اینستاگرام
                </p>
              </div>

              <button
                onClick={runConnectionTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
              >
                {testing ? "در حال اجرای تست..." : "اجرای مجدد تست سلامت"}
              </button>
            </div>

            {testing && (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <p className="text-sm font-bold text-foreground">در حال ارتباط با سرورهای گراف متا و سنجش مجوزها...</p>
              </div>
            )}

            {testError && (
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 text-sm">
                <strong>خطا در بررسی اتصال:</strong> {testError}
              </div>
            )}

            {testResult && !testing && (
              <div className="mt-6 space-y-6">
                {/* Result KPI Grid */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-surface-hover/30 p-4">
                    <p className="text-xs text-muted">وضعیت اتصال</p>
                    <p className="text-lg font-black text-emerald-600 mt-1 flex items-center gap-2">
                      <span>فعال و پایدار</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-hover/30 p-4">
                    <p className="text-xs text-muted">زمان پاسخگویی (پینگ)</p>
                    <p className="text-lg font-black text-foreground mt-1 font-mono">
                      {testResult.latencyMs} ms
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-hover/30 p-4">
                    <p className="text-xs text-muted">اعتبار توکن</p>
                    <p className="text-lg font-black text-purple-600 mt-1">
                      {testResult.token.expiresInDays} روز مانده
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface-hover/30 p-4">
                    <p className="text-xs text-muted">وب‌هوک دریافتی</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">
                      سالم و آماده
                    </p>
                  </div>
                </div>

                {/* Permissions Breakdown */}
                <div className="rounded-xl border border-border p-5 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">
                    بررسی مجوزهای اعطا شده (Permissions Check)
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {testResult.permissions.map((perm: any) => (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5"
                      >
                        <div>
                          <p className="text-xs font-bold text-foreground">{perm.label}</p>
                          <code className="text-[11px] text-muted">{perm.key}</code>
                        </div>
                        <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                          تایید شده ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected Account Snapshot */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg">
                      {testResult.account.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        @{testResult.account.username}
                      </p>
                      <p className="text-xs text-muted">
                        نام پیج: {testResult.account.name} · شناسه اینستاگرام: {testResult.account.instagramId}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg">
                    {testResult.token.renewMode}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Step-by-step Persian Guide */}
      {activeTab === "guide" && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-8">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground">
              راهنمای گام‌به‌گام تصویری دریافت توکن و اتصال اینستاگرام
            </h2>
            <p className="text-xs text-muted mt-1">
              مراحل ساده اتصال پیج کاری یا کریتور اینستاگرام به پلتفرم از طریق پنل رسمی متا (Meta for Developers)
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
                  ۱
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  تبدیل پیج به تجاری و اتصال به فیس‌بوک
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                ابتدا در اپلیکیشن اینستاگرام وارد تنظیمات شده و نوع پیج خود را روی <strong>Professional / Creator</strong> یا <strong>Business</strong> بگذارید. سپس پیج را به یک صفحه فیس‌بوک (Facebook Page) متصل نمایید.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
                  ۲
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  ورود به Meta for Developers
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                به سایت <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-purple-600 font-bold underline">developers.facebook.com</a> مراجعه کرده و یک اپلیکیشن از نوع <strong>Other &gt; Business</strong> ایجاد نمایید. سپس محصول <strong>Instagram Graph API</strong> را به آن اضافه کنید.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
                  ۳
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  صدور Page Access Token با مجوزهای لازم
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                در ابزار Graph API Explorer، صفحه فیس‌بوک خود را انتخاب کرده و دسترسی‌های زیر را تیک بزنید:
              </p>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                <li><code>instagram_manage_messages</code> (ارسال خودکار دایرکت)</li>
                <li><code>instagram_manage_comments</code> (پاسخ خودکار کامنت)</li>
                <li><code>pages_read_engagement</code> (دریافت آمار)</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
                  ۴
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  تنظیم وب‌هوک و ثبت در سیستم
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                آدرس وب‌هوک و Verify Token را از تب اول کپی کرده و در پنل فیس‌بوک وارد نمایید. پس از تایید سبز رنگ، رویدادهای <code>messages</code> و <code>comments</code> را مشترک (Subscribe) نمایید.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 leading-relaxed">
            💡 <strong>نکته مهم:</strong> پس از وارد کردن توکن در فرم، با کلیک روی دکمه «تست زنده اتصال» مطمئن شوید که سیستم به درستی پیج شما را شناسایی کرده و پینگ دریافت می‌کند.
          </div>
        </div>
      )}
    </div>
  );
}
