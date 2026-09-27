import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "پیگیری خودکار و فالوآپ مشتریان - پیام‌بان پرو",
  description: "ارسال پیام یادآوری و فالوآپ هوشمند در دایرکت جهت افزایش نرخ تبدیل و فروش",
};

export default async function FollowupsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
  });

  if (!workspace) {
    redirect("/dashboard");
  }

  const { formatNumber } = await getI18n();

  const automations = await prisma.automation.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  // Server action to update follow-up settings for a campaign
  async function updateFollowup(formData: FormData) {
    "use server";
    const automationId = String(formData.get("automationId") ?? "");
    const followUpEnabled = formData.get("followUpEnabled") === "on";
    const followUpMessage = String(formData.get("followUpMessage") ?? "").trim();
    const followUpDelayMinutes = parseInt(String(formData.get("followUpDelayMinutes") ?? "60"), 10);

    if (!automationId) return;

    await prisma.automation.update({
      where: { id: automationId },
      data: {
        followUpEnabled,
        followUpMessage,
        followUpDelayMinutes,
      },
    });

    revalidatePath("/followups");
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              پیگیری خودکار و فالوآپ (Automated Follow-ups)
            </h1>
            <p className="mt-1 text-sm text-muted">
              ارسال پیام‌های یادآوری هوشمند در زمان تعیین‌شده به مخاطبانی که روی لینک کلیک نکرده‌اند
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            ⏳ افزایش ۳ برابری فروش با فالوآپ هوشمند
          </span>
        </div>
      </div>

      {/* Follow-up Sequence Settings per Campaign */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">سناریوهای پیگیری خودکار کمپین‌ها</h2>

        {automations.map((auto) => (
          <div key={auto.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <h3 className="font-semibold text-foreground text-base">{auto.name}</h3>
                <p className="text-xs text-muted">
                  کلیدواژه‌ها: {auto.keywords.join(" · ")}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                auto.followUpEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-zinc-500/10 text-zinc-400"
              }`}>
                {auto.followUpEnabled ? "فالوآپ فعال است" : "فالوآپ غیرفعال"}
              </span>
            </div>

            <form action={updateFollowup} className="space-y-4">
              <input type="hidden" name="automationId" value={auto.id} />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`enable-${auto.id}`}
                  name="followUpEnabled"
                  defaultChecked={auto.followUpEnabled}
                  className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                />
                <label htmlFor={`enable-${auto.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                  فعال‌سازی ارسال پیام یادآوری و فالوآپ خودکار
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    متن پیام یادآوری (فالوآپ)
                  </label>
                  <textarea
                    rows={2}
                    name="followUpMessage"
                    defaultValue={auto.followUpMessage ?? "سلام مجدد دوست عزیز! آیا تونستید کاتالوگ و تخفیف ویژه رو بررسی کنید؟ اگر سوالی دارید من اینجام تا راهنماییتون کنم 🌸"}
                    className="w-full rounded bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    مدت زمان تاخیر در ارسال
                  </label>
                  <select
                    name="followUpDelayMinutes"
                    defaultValue={auto.followUpDelayMinutes || 120}
                    className="w-full rounded bg-surface border border-border px-3 py-2 text-xs text-foreground focus:border-accent outline-none"
                  >
                    <option value="15">۱۵ دقیقه بعد از دایرکت اول</option>
                    <option value="60">۱ ساعت بعد از دایرکت اول</option>
                    <option value="120">۲ ساعت بعد از دایرکت اول</option>
                    <option value="720">۱۲ ساعت بعد</option>
                    <option value="1440">۲۴ ساعت (یک روز) بعد</option>
                    <option value="2880">۴۸ ساعت (دو روز) بعد</option>
                  </select>

                  <button
                    type="submit"
                    className="mt-3 w-full rounded bg-accent hover:bg-accent/90 text-white font-medium py-2 px-3 text-xs transition-all shadow-sm"
                  >
                    ذخیره تنظیمات فالوآپ
                  </button>
                </div>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
