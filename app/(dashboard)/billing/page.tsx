import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requestPayment } from "@/lib/billing/zarinpal";
import { requestZibalPayment } from "@/lib/billing/zibal";

export const metadata = {
  title: "پلن‌ها و ارتقای اشتراک - پیام‌بان پرو",
  description: "خرید بسته، افزایش سهمیه دایرکت و فعال‌سازی امکانات تجاری هوشمند با درگاه زرین‌پال، زیبال یا کارت‌به‌کارت",
};

interface BillingPageProps {
  searchParams: Promise<{
    payment?: string;
    receipt?: string;
    refId?: string;
    authority?: string;
    error?: string;
    gateway?: string;
  }>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { formatNumber } = await getI18n();
  const query = await searchParams;

  const [userSubscription, plans, transactions, settings] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: session.user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "payment.bank_card_number",
            "payment.bank_card_holder",
            "payment.bank_card_shaba",
            "payment.default_gateway",
          ],
        },
      },
    }),
  ]);

  const bankCardNumber =
    settings.find((s) => s.key === "payment.bank_card_number")?.value ||
    "۶۰۳۷-۹۹۷۵-۸۴۲۱-۱۰۰۱";
  const bankCardHolder =
    settings.find((s) => s.key === "payment.bank_card_holder")?.value ||
    "شرکت توسعه نرم‌افزار پیام‌بان پرو";
  const bankCardShaba =
    settings.find((s) => s.key === "payment.bank_card_shaba")?.value ||
    "IR120170000000123456789012";

  // Server action to initiate online payment via Zarinpal or Zibal
  async function selectPlan(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;

    const planId = String(formData.get("planId") ?? "");
    const gateway = String(formData.get("gateway") ?? "ZARINPAL") as "ZARINPAL" | "ZIBAL";
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    // 1. Handle Free / Trial plan immediately without gateway
    if (plan.priceTomans === 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      const existingSub = await prisma.subscription.findFirst({
        where: { userId: session.user.id },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            expiresAt,
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: session.user.id,
            planId: plan.id,
            status: "ACTIVE",
            expiresAt,
          },
        });
      }

      await prisma.walletTransaction.create({
        data: {
          userId: session.user.id,
          amountTomans: 0,
          type: "PLAN_PURCHASE",
          status: "SUCCESS",
          refId: `FREE_${Date.now()}`,
          paymentGateway: "INTERNAL",
          description: `فعال‌سازی پلن رایگان ${plan.nameFa}`,
        },
      });

      revalidatePath("/billing");
      revalidatePath("/dashboard");
      return;
    }

    const headerStore = await headers();
    const host = headerStore.get("host") || "localhost:3000";
    const proto =
      headerStore.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");

    // 2. Route to ZIBAL Gateway if chosen
    if (gateway === "ZIBAL") {
      const callbackUrl = `${proto}://${host}/api/billing/zibal/callback`;
      const zibalRes = await requestZibalPayment({
        amountTomans: plan.priceTomans,
        description: `خرید اشتراک ${plan.nameFa} - پیام‌بان پرو`,
        callbackUrl,
      });

      if (!zibalRes.success || !zibalRes.paymentUrl || !zibalRes.trackId) {
        redirect(
          `/billing?payment=failed&error=${encodeURIComponent(
            zibalRes.errorMessage || "ایجاد درخواست پرداخت با درگاه زیبال با خطا مواجه شد."
          )}`
        );
      }

      await prisma.walletTransaction.create({
        data: {
          userId: session.user.id,
          amountTomans: plan.priceTomans,
          type: "PLAN_PURCHASE",
          status: "PENDING",
          authority: String(zibalRes.trackId),
          paymentGateway: "ZIBAL",
          description: `خرید اشتراک ${plan.nameFa} (درگاه زیبال)`,
        },
      });

      redirect(zibalRes.paymentUrl);
    }

    // 3. Paid Plan: Connect to Zarinpal Gateway
    const callbackUrl = `${proto}://${host}/api/billing/payment/callback`;
    const zarinpalRes = await requestPayment({
      amountTomans: plan.priceTomans,
      description: `خرید اشتراک ${plan.nameFa} - پیام‌بان پرو`,
      callbackUrl,
      email: session.user.email ?? undefined,
    });

    if (!zarinpalRes.success || !zarinpalRes.paymentUrl || !zarinpalRes.authority) {
      redirect(
        `/billing?payment=failed&error=${encodeURIComponent(
          zarinpalRes.errorMessage || "ایجاد درخواست پرداخت با خطا مواجه شد."
        )}`
      );
    }

    // Record pending transaction
    await prisma.walletTransaction.create({
      data: {
        userId: session.user.id,
        amountTomans: plan.priceTomans,
        type: "PLAN_PURCHASE",
        status: "PENDING",
        authority: zarinpalRes.authority,
        paymentGateway: "ZARINPAL",
        description: `خرید اشتراک ${plan.nameFa} (درگاه زرین‌پال)`,
      },
    });

    redirect(zarinpalRes.paymentUrl);
  }

  // Server action to submit card-to-card receipt
  async function submitCardReceipt(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;

    const planId = String(formData.get("planId") ?? "");
    const trackingCode = String(formData.get("trackingCode") ?? "").trim();
    const cardLast4 = String(formData.get("cardLast4") ?? "").trim();
    const userNotes = String(formData.get("notes") ?? "").trim();

    if (!planId || !trackingCode || !cardLast4) {
      redirect("/billing?payment=failed&error=" + encodeURIComponent("لطفاً کلیه فیلدهای الزامی فیش را پر کنید."));
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    // Check duplicate tracking code
    const existing = await prisma.walletTransaction.findFirst({
      where: { refId: trackingCode },
    });
    if (existing) {
      redirect(
        "/billing?payment=failed&error=" +
          encodeURIComponent("این شماره پیگیری بانکی قبلاً در سیستم ثبت شده است.")
      );
    }

    // Record pending card-to-card transaction
    await prisma.walletTransaction.create({
      data: {
        userId: session.user.id,
        amountTomans: plan.priceTomans,
        type: "PLAN_PURCHASE",
        status: "PENDING",
        paymentGateway: "CARD_TO_CARD",
        refId: trackingCode,
        authority: cardLast4,
        description: `خرید اشتراک ${plan.nameFa} کارت‌به‌کارت (${cardLast4}) ${userNotes ? `| یادداشت: ${userNotes}` : ""}`,
      },
    });

    // Notify Admins via Operational Event
    await prisma.operationalEvent.create({
      data: {
        source: "SYSTEM",
        level: "WARNING",
        message: `فیش کارت‌به‌کارت جدید توسط کاربر با شناسه ${session.user.id} ثبت شد. مبلغ: ${plan.priceTomans.toLocaleString("fa-IR")} تومان، شماره پیگیری: ${trackingCode}`,
      },
    });

    revalidatePath("/billing");
    revalidatePath("/admin");
    redirect(`/billing?receipt=submitted&refId=${encodeURIComponent(trackingCode)}`);
  }

  const currentPlan = userSubscription?.plan;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              پلن‌ها و تعرفه‌های اشتراک
            </h1>
            <p className="mt-1 text-sm text-muted">
              پکیج متناسب با کسب‌وکار خود را انتخاب کرده و فروش خود را در اینستاگرام چند برابر کنید
            </p>
          </div>
          {currentPlan && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400">
                اشتراک فعال: {currentPlan.nameFa} (معتبر تا{" "}
                {userSubscription.expiresAt
                  ? new Date(userSubscription.expiresAt).toLocaleDateString("fa-IR")
                  : "همیشه"}
                )
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Feedback Banner */}
      {query.payment === "success" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400 shadow-sm flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <h3 className="font-bold text-sm">پرداخت آنلاین با موفقیت انجام شد</h3>
            <p className="text-xs mt-1 text-emerald-300/80 leading-relaxed">
              اشتراک شما بلافاصله فعال و سهمیه‌های دوره جدید شارژ گردید.
              {query.refId && (
                <span className="font-mono font-bold ms-2 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  شماره پیگیری بانکی: {query.refId}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Card-to-Card Receipt Submitted Feedback */}
      {query.receipt === "submitted" && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-300 shadow-sm flex items-start gap-3">
          <span className="text-xl">ℹ</span>
          <div>
            <h3 className="font-bold text-sm">فیش واریزی کارت‌به‌کارت با موفقیت ثبت شد</h3>
            <p className="text-xs mt-1 text-blue-200/90 leading-relaxed">
              فیش شما با شماره پیگیری{" "}
              <strong className="font-mono text-white underline">{query.refId}</strong> در سامانه ثبت
              شد و در صف بررسی واحد مالی قرار گرفت. بلافاصله پس از تایید (معمولاً کمتر از ۱۵ دقیقه)،
              اشتراک شما فعال و پیامک تایید ارسال خواهد شد.
            </p>
          </div>
        </div>
      )}

      {query.payment && query.payment !== "success" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-400 shadow-sm flex items-start gap-3">
          <span className="text-xl">⚠</span>
          <div>
            <h3 className="font-bold text-sm">تراکنش پرداخت تکمیل نشد</h3>
            <p className="text-xs mt-1 text-rose-300/80 leading-relaxed">
              {query.error
                ? decodeURIComponent(query.error)
                : query.payment === "cancelled"
                ? "فرآیند پرداخت در درگاه توسط شما لغو شد."
                : "تایید تراکنش بانکی با خطا مواجه شد. در صورت کسر وجه، مبلغ ظرف حداکثر ۷۲ ساعت توسط شاپرک عودت داده می‌شود."}
            </p>
          </div>
        </div>
      )}

      {/* Quota Usage Bar */}
      {userSubscription && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">میزان مصرف در دوره جاری</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>سهمیه دایرکت هوشمند</span>
                <span className="font-mono text-foreground font-semibold">
                  {formatNumber(userSubscription.dmsUsed)} /{" "}
                  {formatNumber(currentPlan?.monthlyDmLimit ?? 0)} دایرکت
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (userSubscription.dmsUsed / (currentPlan?.monthlyDmLimit || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>سهمیه پیامک هوشمند</span>
                <span className="font-mono text-foreground font-semibold">
                  {formatNumber(userSubscription.smsUsed)} /{" "}
                  {formatNumber(currentPlan?.monthlySmsLimit ?? 0)} پیامک
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (userSubscription.smsUsed / (currentPlan?.monthlySmsLimit || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.id === plan.id;
          const isPro = plan.name === "pro";

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                isPro
                  ? "border-accent bg-surface shadow-lg shadow-accent/5 ring-1 ring-accent"
                  : "border-border bg-surface hover:border-border/80"
              }`}
            >
              {isPro && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  پیشنهاد ویژه و پرفروش
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-foreground">{plan.nameFa}</h3>
                <p className="text-xs text-muted mt-1 min-h-[32px] leading-relaxed">
                  {plan.descriptionFa}
                </p>

                <div className="my-6">
                  {plan.priceTomans === 0 ? (
                    <span className="text-3xl font-extrabold text-foreground">رایگان</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-extrabold text-foreground">
                        {formatNumber(plan.priceTomans)}
                      </span>
                      <span className="text-xs text-muted ms-1 font-normal">تومان / ماهانه</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 text-xs text-muted border-t border-border/40 pt-4">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{formatNumber(plan.monthlyDmLimit)} دایرکت در ماه</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{formatNumber(plan.maxInstagramAccounts)} اکانت اینستاگرام</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{formatNumber(plan.monthlySmsLimit)} پیامک رایگان</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>فرم‌ساز دایرکت و لید کپچر</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>ویترین دیجیتال محصولات</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.hasAiResponder ? (
                      <>
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-foreground font-semibold">پاسخگوی هوش مصنوعی ۲۴ ساعته</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-600">✕</span>
                        <span className="text-zinc-600 line-through">دستیار هوش مصنوعی</span>
                      </>
                    )}
                  </li>
                </ul>
              </div>

              <div className="mt-8 space-y-2">
                {plan.priceTomans === 0 ? (
                  <form action={selectPlan}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <button
                      type="submit"
                      disabled={isCurrent}
                      className="w-full rounded-xl py-3 text-xs font-bold transition-all shadow-sm bg-surface-hover hover:bg-border text-foreground border border-border disabled:opacity-50"
                    >
                      {isCurrent ? "پلن فعلی شما" : "فعال‌سازی پلن رایگان"}
                    </button>
                  </form>
                ) : (
                  <>
                    <form action={selectPlan}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="gateway" value="ZARINPAL" />
                      <button
                        type="submit"
                        disabled={isCurrent}
                        className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? "bg-surface-hover text-muted cursor-default border border-border"
                            : isPro
                            ? "bg-accent hover:bg-accent/90 text-white shadow-indigo-500/25"
                            : "bg-surface-hover hover:bg-border text-foreground border border-border"
                        }`}
                      >
                        <span>💳</span>
                        <span>{isCurrent ? "پلن فعال شما" : "پرداخت آنلاین زرین‌پال"}</span>
                      </button>
                    </form>

                    {!isCurrent && (
                      <form action={selectPlan}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="gateway" value="ZIBAL" />
                        <button
                          type="submit"
                          className="w-full rounded-xl py-2 text-xs font-medium transition-all border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 flex items-center justify-center gap-1.5"
                        >
                          <span>⚡</span>
                          <span>پرداخت با درگاه زیبال (شتابی)</span>
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Card-to-Card Transfer & Receipt Verification Box */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="border-b border-border/40 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <span>واریز کارت‌به‌کارت و ثبت دستی فیش بانکی</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              در صورت بروز اختلال در درگاه‌های اینترنتی یا سقف خرید آنلاین، می‌توانید مبلغ پلن را مستقیماً کارت‌به‌کارت نمایید.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-medium">
            تأیید سریع زیر ۱۵ دقیقه
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Virtual Bank Card Graphic */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-gradient-to-tr from-slate-900 via-zinc-900 to-indigo-950 p-6 text-white border border-indigo-500/30 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-accent/20 rounded-full blur-2xl" />
              <div className="flex justify-between items-start relative z-10 mb-8">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    حساب بانکی پیام‌بان پرو
                  </p>
                  <p className="text-xs font-bold text-zinc-200 mt-0.5">بانک ملی ایران / شتاب</p>
                </div>
                <div className="w-10 h-7 rounded bg-amber-400/80 flex items-center justify-center shadow-inner">
                  <div className="w-6 h-4 border border-amber-900/40 rounded-sm" />
                </div>
              </div>

              <div className="relative z-10 my-4">
                <p className="text-xs text-zinc-400 mb-1">شماره کارت جهت واریز:</p>
                <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-amber-300 ltr select-all">
                  {bankCardNumber}
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 flex justify-between items-end text-xs">
                <div>
                  <p className="text-[10px] text-zinc-400">بنام صاحب حساب:</p>
                  <p className="font-semibold text-zinc-100">{bankCardHolder}</p>
                </div>
                <div className="text-left font-mono text-[11px] text-zinc-300">
                  <p className="text-[10px] text-zinc-400 text-right">شماره شبا:</p>
                  <p className="ltr select-all">{bankCardShaba}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-surface-hover/60 border border-border/50 p-4 text-xs text-muted space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <span>💡</span>
                <span>راهنمای تأیید فیش:</span>
              </div>
              <p>۱. مبلغ پلن مورد نظر را به شماره کارت بالا انتقال دهید.</p>
              <p>۲. شماره پیگیری بانکی و ۴ رقم آخر کارت واریزکننده را در فرم روبه‌رو ثبت کنید.</p>
              <p>۳. کارشناسان ما بلافاصله پس از بررسی، اشتراک اکانت شما را فعال خواهند کرد.</p>
            </div>
          </div>

          {/* Receipt Submission Form */}
          <div className="lg:col-span-7 bg-surface-hover/30 rounded-2xl border border-border/60 p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">فرم ثبت مشخصات فیش واریزی</h3>
            <form action={submitCardReceipt} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  انتخاب پلن خریداری‌شده:
                </label>
                <select
                  name="planId"
                  required
                  className="w-full rounded-xl bg-surface border border-border px-3.5 py-2.5 text-xs text-foreground focus:border-accent outline-none"
                >
                  <option value="">-- یک پلن را انتخاب کنید --</option>
                  {plans
                    .filter((p) => p.priceTomans > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameFa} - {formatNumber(p.priceTomans)} تومان
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    شماره پیگیری / شماره ارجاع بانکی (RefID):
                  </label>
                  <input
                    type="text"
                    name="trackingCode"
                    required
                    placeholder="مثلاً: 98234127"
                    className="w-full rounded-xl bg-surface border border-border px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    ۴ رقم آخر کارت مبدأ شما:
                  </label>
                  <input
                    type="text"
                    name="cardLast4"
                    maxLength={4}
                    required
                    placeholder="مثلاً: 4218"
                    className="w-full rounded-xl bg-surface border border-border px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  توضیحات تکمیلی یا نام واریزکننده (اختیاری):
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="مثلاً: واریز از همراه بانک ملی به نام محمدی ساعت ۱۸:۳۰"
                  className="w-full rounded-xl bg-surface border border-border px-3.5 py-2.5 text-xs text-foreground focus:border-accent outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl py-3 text-xs font-bold transition-all shadow-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 mt-2"
              >
                <span>✓</span>
                <span>ثبت فیش و ارسال به واحد مالی</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History Table (T014) */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">تاریخچه تراکنش‌های پرداخت</h2>
            <p className="text-xs text-muted mt-0.5">فهرست تراکنش‌های ثبت‌شده از کلیه روش‌های پرداخت (زرین‌پال، زیبال و کارت‌به‌کارت)</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted border border-dashed border-border/60 rounded-lg">
            هنوز تراکنش مالی در حساب شما ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-3 px-4 text-start font-medium">تاریخ و ساعت</th>
                  <th className="py-3 px-4 text-start font-medium">روش پرداخت</th>
                  <th className="py-3 px-4 text-start font-medium">شرح تراکنش</th>
                  <th className="py-3 px-4 text-start font-medium">مبلغ</th>
                  <th className="py-3 px-4 text-start font-medium">کد پیگیری / ارجاع</th>
                  <th className="py-3 px-4 text-start font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => {
                  const isSuccess = tx.status === "SUCCESS";
                  const isPending = tx.status === "PENDING";

                  return (
                    <tr key={tx.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-4 text-muted font-mono">
                        {new Date(tx.createdAt).toLocaleDateString("fa-IR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-surface-hover border border-border px-2 py-0.5 rounded text-foreground font-semibold">
                          {tx.paymentGateway === "ZIBAL"
                            ? "درگاه زیبال"
                            : tx.paymentGateway === "CARD_TO_CARD"
                            ? "کارت به کارت"
                            : tx.paymentGateway === "INTERNAL"
                            ? "سیستمی"
                            : "زرین‌پال"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">
                        {tx.description || "خرید اشتراک"}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-foreground">
                        {formatNumber(tx.amountTomans)} تومان
                      </td>
                      <td className="py-3 px-4 font-mono text-muted">
                        {tx.refId ? (
                          <span className="text-foreground font-semibold">{tx.refId}</span>
                        ) : tx.authority ? (
                          <span className="text-muted font-mono">{tx.authority}</span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {isSuccess ? "تکمیل شده" : isPending ? "در انتظار تایید" : "ناموفق"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
