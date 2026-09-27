import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "پنل مدیریت کل پلتفرم (Super Admin) - پیام‌بان پرو",
  description: "مدیریت کاربران، پلن‌ها، درآمد، توکن‌ها و تنظیمات سراسری پلتفرم پیام‌بان",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // Only SUPER_ADMIN and ADMIN can access
  if (currentUser?.role !== "SUPER_ADMIN" && currentUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { formatNumber } = await getI18n();

  // Fetch system-wide metrics (including OperationalEvents for T040)
  const [
    usersCount,
    subscriptions,
    plans,
    settings,
    totalDmsCount,
    totalSmsCount,
    instagramAccounts,
    operationalEvents,
    recentErrorsCount,
    cardReceipts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.platformSetting.findMany({
      orderBy: { category: "asc" },
    }),
    prisma.dmLog.count(),
    prisma.smsLog.count(),
    prisma.instagramAccount.findMany({
      include: {
        workspace: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    }),
    prisma.operationalEvent.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        workspace: { select: { name: true } },
      },
    }),
    prisma.operationalEvent.count({
      where: {
        level: "ERROR",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.walletTransaction.findMany({
      where: { paymentGateway: "CARD_TO_CARD" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const activeSubsCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.plan?.priceTomans ?? 0), 0);
  const pendingReceiptsCount = cardReceipts.filter((r) => r.status === "PENDING").length;

  // Server actions for super admin
  async function updateUserRole(formData: FormData) {
    "use server";
    const targetUserId = String(formData.get("userId") ?? "");
    const newRole = String(formData.get("role") ?? "USER") as "USER" | "ADMIN" | "SUPER_ADMIN";
    if (!targetUserId) return;
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });
    revalidatePath("/admin");
  }

  async function updateSetting(formData: FormData) {
    "use server";
    const settingKey = String(formData.get("key") ?? "");
    const settingValue = String(formData.get("value") ?? "");
    if (!settingKey) return;
    await prisma.platformSetting.update({
      where: { key: settingKey },
      data: { value: settingValue },
    });
    revalidatePath("/admin");
  }

  async function updatePlanPrice(formData: FormData) {
    "use server";
    const planId = String(formData.get("planId") ?? "");
    const priceTomans = parseInt(String(formData.get("priceTomans") ?? "0"), 10);
    const monthlyDmLimit = parseInt(String(formData.get("monthlyDmLimit") ?? "500"), 10);
    if (!planId) return;
    await prisma.plan.update({
      where: { id: planId },
      data: { priceTomans, monthlyDmLimit },
    });
    revalidatePath("/admin");
  }

  async function clearAllEvents() {
    "use server";
    await prisma.operationalEvent.deleteMany({});
    revalidatePath("/admin");
  }

  async function approveCardReceipt(formData: FormData) {
    "use server";
    const txId = String(formData.get("transactionId") ?? "");
    if (!txId) return;

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: txId },
      include: { user: true },
    });

    if (!tx || tx.status !== "PENDING") return;

    // 1. Mark transaction as SUCCESS
    await prisma.walletTransaction.update({
      where: { id: txId },
      data: {
        status: "SUCCESS",
        description: `${tx.description ?? "خرید اشتراک کارت‌به‌کارت"} (تأیید دستی مدیریت)`,
      },
    });

    // 2. Extend or activate subscription for 30 days
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: tx.userId },
      include: { plan: true },
    });

    const proPlan = (await prisma.plan.findFirst({ where: { name: "pro" } })) || (await prisma.plan.findFirst());
    const now = new Date();
    const currentExpiry = existingSub?.expiresAt && existingSub.expiresAt > now ? existingSub.expiresAt : now;
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: "ACTIVE",
          expiresAt: newExpiry,
          dmsUsed: 0,
        },
      });
    } else if (proPlan) {
      await prisma.subscription.create({
        data: {
          userId: tx.userId,
          planId: proPlan.id,
          status: "ACTIVE",
          startsAt: now,
          expiresAt: newExpiry,
          dmsUsed: 0,
        },
      });
    }

    // 3. Operational Event Log
    await prisma.operationalEvent.create({
      data: {
        source: "SYSTEM",
        level: "INFO",
        message: `فیش کارت‌به‌کارت کاربر ${tx.user?.name || tx.userId} به مبلغ ${tx.amountTomans.toLocaleString("fa-IR")} تومان تایید و اشتراک ۳۰ روز شارژ شد.`,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/billing");
  }

  async function rejectCardReceipt(formData: FormData) {
    "use server";
    const txId = String(formData.get("transactionId") ?? "");
    const reason = String(formData.get("reason") ?? "فیش واریزی نامعتبر یا عدم تطابق با تراکنش‌های بانکی");
    if (!txId) return;

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: txId },
      include: { user: true },
    });

    if (!tx || tx.status !== "PENDING") return;

    await prisma.walletTransaction.update({
      where: { id: txId },
      data: {
        status: "FAILED",
        description: `${tx.description ?? "فیش کارت‌به‌کارت"} - دلیل رد: ${reason}`,
      },
    });

    await prisma.operationalEvent.create({
      data: {
        source: "SYSTEM",
        level: "WARNING",
        message: `فیش کارت‌به‌کارت کاربر ${tx.user?.name || tx.userId} به مبلغ ${tx.amountTomans.toLocaleString("fa-IR")} تومان رد شد. (${reason})`,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/billing");
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header with Dynamic System Health Badge (T040) */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              پنل مدیریت کل پلتفرم (Super Admin)
            </h1>
            <p className="mt-1 text-sm text-muted">
              مدیریت مشترکین، نرخ‌گذاری پلن‌ها، درآمد کل و نظارت بر پایداری سرورها
            </p>
          </div>
          <div className="flex items-center gap-2">
            {recentErrorsCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                سرور پایدار و وضعیت عملیاتی مطلوب
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                هشدار: {formatNumber(recentErrorsCount)} خطا در ۲۴ ساعت گذشته
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">کل کاربران پلتفرم</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {formatNumber(usersCount)} <span className="text-xs font-normal text-muted">کاربر</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400">ثبت‌نام شده در دیتابیس</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">اشتراک‌های فعال</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">
            {formatNumber(activeSubsCount)} <span className="text-xs font-normal text-muted">اشتراک</span>
          </p>
          <p className="mt-1 text-xs text-muted">مشترکین در حال استفاده</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">درآمد کل تخمینی</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {formatNumber(totalRevenue)} <span className="text-xs font-normal text-muted">تومان</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400">مجموع فروش بسته‌ها</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">کل تعاملات ارسالی</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {formatNumber(totalDmsCount + totalSmsCount)} <span className="text-xs font-normal text-muted">پیام</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatNumber(totalDmsCount)} دایرکت + {formatNumber(totalSmsCount)} پیامک
          </p>
        </div>
      </div>

      {/* Card-to-Card Receipts Verification Section */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                مدیریت و تأیید فیش‌های کارت‌به‌کارت بانکی (واریز دستی)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                بررسی فیش‌های واریزی کاربران، تایید شارژ اشتراک و فعال‌سازی دستی دسترسی
              </p>
            </div>
            {pendingReceiptsCount > 0 && (
              <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold animate-pulse">
                {formatNumber(pendingReceiptsCount)} فیش در انتظار بررسی
              </span>
            )}
          </div>
          <span className="text-xs text-muted">
            کل فیش‌ها: {formatNumber(cardReceipts.length)}
          </span>
        </div>

        <div className="overflow-x-auto">
          {cardReceipts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              هنوز هیچ فیش کارت‌به‌کارتی توسط کاربران ثبت نشده است.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-hover/50 text-muted uppercase text-[10px] tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-6 py-3">کاربر / تماس</th>
                  <th className="px-6 py-3">مبلغ پرداختی</th>
                  <th className="px-6 py-3">شماره پیگیری فیش</th>
                  <th className="px-6 py-3">۴ رقم کارت</th>
                  <th className="px-6 py-3">تاریخ ثبت</th>
                  <th className="px-6 py-3">وضعیت</th>
                  <th className="px-6 py-3 text-center">عملیات مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {cardReceipts.map((rcp) => {
                  const isPending = rcp.status === "PENDING";
                  const isSuccess = rcp.status === "SUCCESS";

                  return (
                    <tr key={rcp.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-foreground">
                          {rcp.user?.name || "کاربر ناشناس"}
                        </p>
                        <p className="text-[11px] text-muted font-mono">
                          {rcp.user?.email || rcp.userId}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-bold text-foreground">
                        {formatNumber(rcp.amountTomans)} تومان
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono bg-surface-hover border border-border/60 px-2 py-0.5 rounded text-[11px] text-foreground font-semibold">
                          {rcp.refId || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-muted">
                        {rcp.authority ? `****-${rcp.authority}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-muted font-mono text-[11px]">
                        {new Date(rcp.createdAt).toLocaleString("fa-IR")}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSuccess ? "bg-emerald-400" : isPending ? "bg-amber-400" : "bg-rose-400"
                            }`}
                          />
                          {isSuccess ? "تأیید شده" : isPending ? "در انتظار بررسی" : "رد شده"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <form action={approveCardReceipt}>
                              <input type="hidden" name="transactionId" value={rcp.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 text-xs shadow-sm transition"
                              >
                                تأیید و شارژ اشتراک
                              </button>
                            </form>
                            <form action={rejectCardReceipt}>
                              <input type="hidden" name="transactionId" value={rcp.id} />
                              <button
                                type="submit"
                                className="rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3 py-1.5 text-xs transition"
                              >
                                رد فیش
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted">
                            {rcp.description || "عملیات خاتمه یافته"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Plans Pricing & Quotas Management (Rule 7) */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">مدیریت پلن‌ها، قیمت‌ها و سهمیه دایرکت</h2>
            <p className="text-xs text-muted mt-0.5">تعیین قیمت به تومان و حجم پیام مجاز هر بسته برای فروش به مشتریان</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-border/50 bg-surface/50 text-xs text-muted font-medium">
              <tr>
                <th className="px-6 py-3">نام پلن</th>
                <th className="px-6 py-3">قیمت ماهانه (تومان)</th>
                <th className="px-6 py-3">سقف دایرکت ماهانه</th>
                <th className="px-6 py-3">سقف پیامک</th>
                <th className="px-6 py-3">اکانت اینستاگرام</th>
                <th className="px-6 py-3">هوش مصنوعی</th>
                <th className="px-6 py-3 text-center">ذخیره تغییرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{plan.nameFa}</p>
                    <p className="text-xs text-muted">{plan.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <form action={updatePlanPrice} id={`form-plan-${plan.id}`} className="flex items-center gap-2">
                      <input type="hidden" name="planId" value={plan.id} />
                      <input
                        type="number"
                        name="priceTomans"
                        defaultValue={plan.priceTomans}
                        className="w-28 rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground font-semibold focus:border-accent outline-none"
                      />
                      <span className="text-xs text-muted">تومان</span>
                    </form>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      form={`form-plan-${plan.id}`}
                      type="number"
                      name="monthlyDmLimit"
                      defaultValue={plan.monthlyDmLimit}
                      className="w-24 rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 text-xs text-muted">
                    {formatNumber(plan.monthlySmsLimit)} عدد
                  </td>
                  <td className="px-6 py-4 text-xs text-muted">
                    {formatNumber(plan.maxInstagramAccounts)} اکانت
                  </td>
                  <td className="px-6 py-4">
                    {plan.hasAiResponder ? (
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        فعال
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400">
                        غیرفعال
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      form={`form-plan-${plan.id}`}
                      type="submit"
                      className="rounded bg-accent hover:bg-accent/90 px-3 py-1 text-xs font-medium text-white transition-all shadow-sm"
                    >
                      ذخیره
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users and Subscriptions Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30">
          <h2 className="text-base font-semibold text-foreground">لیست کاربران و اشتراک‌های فعال</h2>
          <p className="text-xs text-muted mt-0.5">مشاهده مشخصات کاربران، نقش‌ها و وضعیت پکیج‌های خریداری‌شده</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-border/50 bg-surface/50 text-xs text-muted font-medium">
              <tr>
                <th className="px-6 py-3">کاربر</th>
                <th className="px-6 py-3">نقش دسترسی</th>
                <th className="px-6 py-3">پلن اشتراک</th>
                <th className="px-6 py-3">مصرف دایرکت</th>
                <th className="px-6 py-3">مصرف پیامک</th>
                <th className="px-6 py-3">وضعیت</th>
                <th className="px-6 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{sub.user.name ?? "کاربر بدون نام"}</p>
                    <p className="text-xs text-muted font-mono">{sub.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <form action={updateUserRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={sub.user.id} />
                      <select
                        name="role"
                        defaultValue={sub.user.role}
                        className="rounded bg-surface border border-border px-2 py-1 text-xs text-foreground outline-none"
                      >
                        <option value="USER">کاربر عادی (USER)</option>
                        <option value="ADMIN">مدیر سیستم (ADMIN)</option>
                        <option value="SUPER_ADMIN">سوپر ادمین کل (SUPER_ADMIN)</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded border border-border hover:bg-surface-hover px-2 py-1 text-xs text-muted hover:text-foreground"
                      >
                        تغییر
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">{sub.plan.nameFa}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {formatNumber(sub.dmsUsed)} / {formatNumber(sub.plan.monthlyDmLimit)}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {formatNumber(sub.smsUsed)} / {formatNumber(sub.plan.monthlySmsLimit)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      فعال تا {new Date(sub.expiresAt).toLocaleDateString("fa-IR")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs text-emerald-400">تأیید شده ✓</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instagram Accounts Health Monitor */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">نظارت بر اکانت‌های اینستاگرام متصل کاربران</h2>
            <p className="text-xs text-muted mt-0.5">بررسی وضعیت توکن‌ها، اشتراک وب‌هوک و سلامت اتصال در سطح کل پلتفرم</p>
          </div>
          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600">
            {formatNumber(instagramAccounts.length)} اکانت متصل
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-hover/50 text-muted uppercase text-[10px] tracking-wider border-b border-border/40">
              <tr>
                <th className="px-6 py-3">اکانت اینستاگرام</th>
                <th className="px-6 py-3">کاربر مالک</th>
                <th className="px-6 py-3">وضعیت توکن</th>
                <th className="px-6 py-3">وضعیت وب‌هوک</th>
                <th className="px-6 py-3">تاریخ اتصال</th>
                <th className="px-6 py-3 text-center">عملیات دیاگنوستیک</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {instagramAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground font-mono">@{acc.username}</p>
                    <p className="text-[11px] text-muted font-mono">{acc.instagramId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{acc.workspace?.owner?.name ?? "نامشخص"}</p>
                    <p className="text-[11px] text-muted font-mono">{acc.workspace?.owner?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      acc.tokenStatus === "HEALTHY"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${acc.tokenStatus === "HEALTHY" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {acc.tokenStatus === "HEALTHY" ? "سالم و فعال" : acc.tokenStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted">
                      {acc.webhookSubscribed ? "فعال و ثبت شده ✓" : "در انتظار ثبت"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted">
                    {new Date(acc.connectedAt).toLocaleDateString("fa-IR")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href="/connect"
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-500/20 transition"
                    >
                      تست زنده اتصال
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Centralized Platform Settings (Rule 7) */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30">
          <h2 className="text-base font-semibold text-foreground">تنظیمات متمرکز سیستم (Platform Settings)</h2>
          <p className="text-xs text-muted mt-0.5">شخصی‌سازی نام سامانه، کلیدهای پیامک و درگاه‌های پرداخت بدون نیاز به تغییر کد</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map((st) => (
              <form
                key={st.id}
                action={updateSetting}
                className="rounded-lg border border-border/60 bg-surface/50 p-4 space-y-3"
              >
                <input type="hidden" name="key" value={st.key} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{st.label}</p>
                    <p className="text-xs text-muted font-mono">{st.key}</p>
                  </div>
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent font-medium uppercase">
                    {st.category}
                  </span>
                </div>
                {st.description && <p className="text-xs text-muted">{st.description}</p>}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="value"
                    defaultValue={st.value}
                    className="flex-1 rounded bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="rounded bg-accent hover:bg-accent/90 px-3 py-2 text-xs font-medium text-white transition-all"
                  >
                    ثبت
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Events & Audit Log Monitor (T040) */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              پایش وقایع عملیاتی و سلامت زیرساخت (Operational Events & Audit Log)
            </h2>
            <p className="text-xs text-muted mt-0.5">
              رهگیری خودکار خطاهای ورکر، هشدارهای هوش مصنوعی و رویدادهای مالی در سطح پلتفرم
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              {formatNumber(operationalEvents.length)} رویداد اخیر
            </span>
            <form action={clearAllEvents}>
              <button
                type="submit"
                className="rounded border border-border hover:bg-surface-hover px-3 py-1 text-xs text-muted hover:text-foreground transition"
              >
                پاکسازی لاگ‌ها
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          {operationalEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              هیچ واقعه خطایی در سیستم ثبت نشده است. همه سرویس‌ها با پایداری کامل در حال فعالیت هستند ✓
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-hover/50 text-muted uppercase text-[10px] tracking-wider border-b border-border/40">
                <tr>
                  <th className="px-6 py-3">منبع واقعه</th>
                  <th className="px-6 py-3">سطح اهمیت</th>
                  <th className="px-6 py-3">شرح پیام</th>
                  <th className="px-6 py-3">فضای کاری</th>
                  <th className="px-6 py-3">زمان ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {operationalEvents.map((evt) => {
                  const isError = evt.level === "ERROR";
                  const isWarn = evt.level === "WARNING";
                  return (
                    <tr key={evt.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="font-mono font-medium text-foreground bg-surface-hover px-2 py-0.5 rounded text-[11px]">
                          {evt.source}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isError
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : isWarn
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isError ? "bg-rose-400" : isWarn ? "bg-amber-400" : "bg-blue-400"
                            }`}
                          />
                          {evt.level}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-foreground max-w-lg truncate" title={evt.message}>
                          {evt.message}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 text-muted">
                        {evt.workspace?.name ?? "سیستمی (کل)"}
                      </td>
                      <td className="px-6 py-3.5 text-muted font-mono text-[11px]">
                        {new Date(evt.createdAt).toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
