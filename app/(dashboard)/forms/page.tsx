import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "فرم‌ساز دایرکت اینستاگرام - پیام‌بان پرو",
  description: "دریافت گام به گام اطلاعات، شماره تماس و ثبت لیدها در دایرکت اینستاگرام",
};

export default async function FormsPage() {
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

  const forms = await prisma.dmForm.findMany({
    where: { workspaceId: workspace.id },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Server action to create a new form
  async function createForm(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });
    if (!workspace) return;

    const title = String(formData.get("title") ?? "").trim();
    const triggerKeyword = String(formData.get("triggerKeyword") ?? "").trim();
    const completionMessage = String(formData.get("completionMessage") ?? "").trim();
    const smsNotificationEnabled = formData.get("smsNotificationEnabled") === "on";

    if (!title || !triggerKeyword) return;

    await prisma.dmForm.create({
      data: {
        workspaceId: workspace.id,
        title,
        triggerKeyword,
        completionMessage: completionMessage || "اطلاعات شما با موفقیت ثبت شد! به زودی با شما تماس می‌گیریم.",
        smsNotificationEnabled,
        fields: [
          { id: "name", label: "لطفاً نام و نام خانوادگی خود را بنویسید:", type: "text", required: true },
          { id: "phone", label: "شماره موبایل خود را وارد کنید:", type: "phone", required: true },
        ],
      },
    });

    revalidatePath("/forms");
  }

  // Server action to toggle form
  async function toggleForm(formData: FormData) {
    "use server";
    const formId = String(formData.get("formId") ?? "");
    const form = await prisma.dmForm.findUnique({ where: { id: formId } });
    if (form) {
      await prisma.dmForm.update({
        where: { id: formId },
        data: { isActive: !form.isActive },
      });
      revalidatePath("/forms");
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              فرم‌ساز دایرکت (Lead Form Builder)
            </h1>
            <p className="mt-1 text-sm text-muted">
              دریافت گام به گام شماره موبایل، نام و اطلاعات کاربران مستقیماً درون دایرکت اینستاگرام
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent border border-accent/20">
            📊 مجموع {formatNumber(forms.reduce((sum, f) => sum + f.submissions.length, 0))} لید ثبت‌شده
          </span>
        </div>
      </div>

      {/* Create New Form Quick Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">ایجاد فرم هوشمند جدید</h2>
        <form action={createForm} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">عنوان فرم</label>
            <input
              type="text"
              name="title"
              required
              placeholder="مثال: فرم مشاوره و تخفیف ویژه"
              className="w-full rounded bg-surface border border-border px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">کلمه کلیدی شروع فرم</label>
            <input
              type="text"
              name="triggerKeyword"
              required
              placeholder="مثال: فرم، ثبت‌نام، مشاوره"
              className="w-full rounded bg-surface border border-border px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">پیام پایان فرم</label>
            <input
              type="text"
              name="completionMessage"
              placeholder="اطلاعات شما با موفقیت ثبت شد!"
              className="w-full rounded bg-surface border border-border px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 text-sm transition-all shadow-sm"
            >
              + ساخت فرم هوشمند
            </button>
          </div>
        </form>
      </div>

      {/* Forms List */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">فرم‌های دایرکت فعال شما</h2>
        {forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
            هنوز فرمی ایجاد نکرده‌اید. با استفاده از فرم بالا اولین فرم خود را بسازید.
          </div>
        ) : (
          forms.map((form) => (
            <div key={form.id} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{form.title}</h3>
                    <span className="rounded bg-accent/10 px-2.5 py-0.5 text-xs text-accent font-medium">
                      کلیدواژه: {form.triggerKeyword}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">{form.completionMessage}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {formatNumber(form.submissions.length)} پاسخ ثبت‌شده
                  </span>
                  <form action={toggleForm}>
                    <input type="hidden" name="formId" value={form.id} />
                    <button
                      type="submit"
                      className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                        form.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {form.isActive ? "فعال ✓" : "متوقف ⏸"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    آخرین اطلاعات ثبت‌شده توسط کاربران (لیدها)
                  </h4>
                  <a
                    href={`/api/forms/export?formId=${form.id}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1 text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    📥 خروجی اکسل / CSV
                  </a>
                </div>

                {form.submissions.length === 0 ? (
                  <p className="text-xs text-muted py-4">هنوز پاسخی برای این فرم ثبت نشده است.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="border-b border-border/50 text-xs text-muted font-medium">
                        <tr>
                          <th className="py-2.5">کاربر اینستاگرام</th>
                          <th className="py-2.5">شماره موبایل ثبت‌شده</th>
                          <th className="py-2.5">اطلاعات تکمیلی</th>
                          <th className="py-2.5">زمان ثبت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {form.submissions.map((sub) => {
                          const dataObj = (sub.data as Record<string, string>) || {};
                          return (
                            <tr key={sub.id} className="hover:bg-surface-hover/30 transition-colors">
                              <td className="py-3 font-semibold text-foreground">
                                @{sub.commenterUsername ?? sub.commenterId}
                              </td>
                              <td className="py-3 font-mono text-emerald-400">
                                {sub.phone ?? dataObj["phone"] ?? "نامشخص"}
                              </td>
                              <td className="py-3 text-xs text-muted">
                                {Object.entries(dataObj)
                                  .filter(([k]) => k !== "phone")
                                  .map(([k, v]) => `${v}`)
                                  .join(" · ")}
                              </td>
                              <td className="py-3 text-xs text-muted font-mono">
                                {new Date(sub.createdAt).toLocaleDateString("fa-IR")}
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
          ))
        )}
      </div>
    </div>
  );
}
