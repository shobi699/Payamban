"use client";

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  instagramUsername?: string | null;
  instagramAccountCount?: number;
}

interface NavGroup {
  titleFa: string;
  titleEn: string;
  items: Array<{
    labelFa: string;
    labelEn: string;
    href: string;
    badge?: string;
    icon: (props: { className?: string }) => React.JSX.Element;
  }>;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
  instagramUsername,
  instagramAccountCount = 0,
}: SidebarProps) {
  const { t, locale } = useI18n();
  const isFa = locale === "fa";
  const pathname = usePathname();

  const isConnected = !!instagramUsername || instagramAccountCount > 0;

  const navGroups: NavGroup[] = [
    {
      titleFa: "امکانات اصلی",
      titleEn: "Core Features",
      items: [
        {
          labelFa: "پیشخوان تحلیل و آمار",
          labelEn: "Dashboard",
          href: "/dashboard",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          labelFa: "کاوشگر پست‌ها و ریلز",
          labelEn: "Posts & Reels",
          href: "/media",
          badge: isFa ? "بصری" : "Visual",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          labelFa: "کمپین‌های پاسخ خودکار",
          labelEn: "Campaigns",
          href: "/campaigns",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          ),
        },
        {
          labelFa: "سناریوساز بصری (Flow)",
          labelEn: "Visual Flow Builder",
          href: "/automations/builder",
          badge: isFa ? "ویژوال" : "Flow",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
      ],
    },
    {
      titleFa: "ابزارهای هوشمند (دایرکتم)",
      titleEn: "Growth Suite (Directam)",
      items: [
        {
          labelFa: "فرم‌ساز هوشمند لید",
          labelEn: "Form Builder",
          href: "/forms",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          labelFa: "کامنت‌های بی‌پاسخ",
          labelEn: "Unanswered Comments",
          href: "/comments",
          badge: isFa ? "سریع" : "New",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          labelFa: "ویترین فروشگاهی دایرکت",
          labelEn: "Product Showcase",
          href: "/showcase",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          ),
        },
        {
          labelFa: "پیگیری خودکار (فالوآپ)",
          labelEn: "Follow-ups",
          href: "/followups",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          labelFa: "دفترچه تلفن و مخاطبان",
          labelEn: "Phonebook CRM",
          href: "/contacts",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          labelFa: "پیامک هوشمند (کاوه‌نگار)",
          labelEn: "Smart SMS",
          href: "/sms",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
        {
          labelFa: "صندوق مکالمات اینستاگرام",
          labelEn: "Direct Inbox",
          href: "/inbox",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          ),
        },
      ],
    },
    {
      titleFa: "اتصال و تنظیمات",
      titleEn: "Integration & Settings",
      items: [
        {
          labelFa: "اتصال اینستاگرام و تست API",
          labelEn: "Connect Instagram & API",
          href: "/connect",
          badge: isFa ? "ضروری" : "Setup",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
        },
        {
          labelFa: "لاگ‌ها و گزارش ارسال دایرکت",
          labelEn: "DM Logs",
          href: "/logs",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          labelFa: "تنظیمات فضای کاری",
          labelEn: "Settings",
          href: "/settings",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      titleFa: "اشتراک و همکاری",
      titleEn: "Billing & Referral",
      items: [
        {
          labelFa: "تعرفه‌ها و ارتقای اشتراک",
          labelEn: "Billing & Plans",
          href: "/billing",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          labelFa: "همکاری در فروش (درآمدزایی)",
          labelEn: "Affiliate & Referral",
          href: "/affiliate",
          badge: isFa ? "کمیسیون" : "Earn",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      titleFa: "مدیریت کل سیستم",
      titleEn: "Super Administration",
      items: [
        {
          labelFa: "پنل مدیریت کل (Super Admin)",
          labelEn: "Super Admin Panel",
          href: "/admin",
          badge: isFa ? "مدیر ارشد" : "Root",
          icon: (props) => (
            <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          payamban-sidebar fixed top-0 start-0 z-50 h-dvh w-72 max-w-[85vw] shrink-0 bg-surface border-e border-border flex flex-col
          transition-transform duration-200 ease-out shadow-lg lg:shadow-none
          lg:h-full lg:static lg:z-auto lg:transform-none
          ${isOpen ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"}
        `}
      >
        {/* Top Brand & Wordmark */}
        <div
          className="px-5 py-4 border-b border-border flex items-center justify-between"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-base shadow-sm">
              P
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-foreground block">
                {isFa ? "پیام‌بان پرو" : "Payamban Pro"}
              </span>
              <span className="text-[10px] text-purple-600 font-bold block -mt-1">
                B2B Instagram SaaS
              </span>
            </div>
          </Link>

          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
            v2.0
          </span>
        </div>

        {/* Instagram Account Live Status Card */}
        <div className="p-3">
          <Link
            href="/connect"
            onClick={onClose}
            className={`block rounded-xl border p-3 transition-all ${
              isConnected
                ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-bold text-foreground truncate">
                  {isConnected ? `@${instagramUsername || "اکانت متصل"}` : (isFa ? "اینستاگرام متصل نیست" : "Instagram Offline")}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500 text-white"
                }`}
              >
                {isConnected ? (isFa ? "متصل ✓" : "Connected") : (isFa ? "اتصال سریع" : "Connect")}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 truncate">
              {isConnected
                ? (isFa ? "کلیک جهت مشاهده تنظیمات و تست API" : "Click to test connection")
                : (isFa ? "برای فعال‌سازی پاسخ خودکار کلیک کنید" : "Setup required to automate")}
            </p>
          </Link>
        </div>

        {/* Grouped Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted/70">
                {isFa ? group.titleFa : group.titleEn}
              </p>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors
                      ${
                        isActive
                          ? "bg-purple-600 text-white font-bold shadow-sm"
                          : "text-muted hover:text-foreground hover:bg-surface-hover"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
                      <span className="truncate">{isFa ? item.labelFa : item.labelEn}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="p-3 border-t border-border space-y-3 bg-surface">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] text-muted truncate max-w-[120px]">
              {workspaceName}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
    </>
  );
}
