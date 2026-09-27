import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "همکاری در فروش (سیستم معرف) - پیام‌بان پرو",
  description: "دریافت پورسانت و کمیسیون نقدی با معرفی دوستان و همکاران به پیام‌بان",
};

export default async function AffiliatePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { formatNumber } = await getI18n();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      referrals: true,
      affiliateReferrals: true,
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  const referralCode = user.referralCode || `USER${user.id.slice(-6).toUpperCase()}`;
  const totalReferred = user.referrals.length;
  const totalCommission = user.affiliateReferrals.reduce((sum, r) => sum + r.commissionAmount, 0);

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              همکاری در فروش (Affiliate & Referral)
            </h1>
            <p className="mt-1 text-sm text-muted">
              با معرفی دی‌رکت به همکاران و پیج‌های اینستاگرام، تا ۳۰٪ پورسانت مادام‌العمر دریافت کنید
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            💰 ۳۰٪ کمیسیون نقدی برای هر خرید
          </span>
        </div>
      </div>

      {/* Referral Link & Code Banner */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground">لینک و کد اختصاصی دعوت شما</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">کد معرف شما</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralCode}
                className="w-full rounded-lg bg-surface border border-border px-4 py-2.5 text-sm font-mono font-bold text-accent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">لینک مستقیم ثبت‌نام با معرف</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`http://localhost:3002/login?ref=${referralCode}`}
                className="w-full rounded-lg bg-surface border border-border px-4 py-2.5 text-xs font-mono text-muted outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">تعداد افراد معرفی‌شده</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {formatNumber(totalReferred)} <span className="text-xs font-normal text-muted">نفر</span>
          </p>
          <p className="mt-1 text-xs text-muted">ثبت‌نام کرده با لینک شما</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">پورسانت کسب‌شده</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">
            {formatNumber(totalCommission)} <span className="text-xs font-normal text-muted">تومان</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400">قابل تسویه حساب به کارت شتاب</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">نرخ کمیسیون شما</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">
            ۳۰٪ <span className="text-xs font-normal text-muted">از هر تراکنش</span>
          </p>
          <p className="mt-1 text-xs text-muted">واریز آنی در پایان هر ماه</p>
        </div>
      </div>

      {/* Payout & Referral List */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">تاریخچه زیرمجموعه‌ها و تراکنش‌های پورسانت</h2>
          <button
            type="button"
            className="rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-1.5 text-xs transition-colors shadow-sm"
          >
            درخواست تسویه حساب به شماره شبا
          </button>
        </div>
        <div className="p-6 text-center text-sm text-muted">
          {user.affiliateReferrals.length === 0 ? (
            <p className="py-8">
              هنوز پورسانتی ثبت نشده است. لینک اختصاصی خود را در کانال‌ها و پیج‌های کاری خود به اشتراک بگذارید تا با اولین خرید مشتریان پورسانت نقدی دریافت کنید.
            </p>
          ) : (
            <div className="overflow-x-auto text-right">
              {/* list items */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
