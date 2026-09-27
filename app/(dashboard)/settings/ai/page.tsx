import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "پایگاه دانش هوش مصنوعی (AI Knowledge Base) - پیام‌بان پرو",
  description: "مدیریت اسناد، اطلاعات محصولات و پاسخ‌های متداول جهت آموزش دستیار هوشمند دایرکت",
};

export default async function AiSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
    include: {
      aiKnowledgeDocs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!workspace) {
    redirect("/dashboard");
  }

  // Server action to add a new knowledge doc
  async function addDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;

    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });
    if (!workspace) return;

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) return;

    await prisma.aiKnowledgeDoc.create({
      data: {
        workspaceId: workspace.id,
        title,
        content,
        isActive: true,
      },
    });

    revalidatePath("/settings/ai");
  }

  // Server action to toggle document status
  async function toggleDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;

    const docId = String(formData.get("docId") ?? "");
    const doc = await prisma.aiKnowledgeDoc.findUnique({
      where: { id: docId },
      include: { workspace: true },
    });

    if (!doc || doc.workspace.ownerId !== session.user.id) return;

    await prisma.aiKnowledgeDoc.update({
      where: { id: docId },
      data: { isActive: !doc.isActive },
    });

    revalidatePath("/settings/ai");
  }

  // Server action to delete document
  async function deleteDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;

    const docId = String(formData.get("docId") ?? "");
    const doc = await prisma.aiKnowledgeDoc.findUnique({
      where: { id: docId },
      include: { workspace: true },
    });

    if (!doc || doc.workspace.ownerId !== session.user.id) return;

    await prisma.aiKnowledgeDoc.delete({
      where: { id: docId },
    });

    revalidatePath("/settings/ai");
  }

  const docs = workspace.aiKnowledgeDocs;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              پایگاه دانش هوش مصنوعی (RAG FAQ)
            </h1>
            <p className="mt-1 text-sm text-muted">
              اطلاعات، قوانین ارسال، شرایط مرجوعی و پاسخ سوالات پرتکرار را ثبت کنید تا هوش مصنوعی در دایرکت ۲۴ ساعته پاسخگوی مشتریان باشد
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent border border-accent/20">
            🤖 {docs.length} سند آموزشی ثبت‌شده
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form to Add Document */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-surface p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-base font-bold text-foreground">افزودن سند جدید به پایگاه دانش</h2>
          <p className="text-xs text-muted leading-relaxed">
            یک موضوع مشخص (مانند «هزینه و زمان ارسال پستی») همراه با توضیحات کامل وارد کنید.
          </p>

          <form action={addDocument} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                عنوان موضوع یا سوال متداول
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="مثال: هزینه و مدت زمان ارسال سفارشات"
                className="w-full rounded-xl border border-border bg-surface-hover/30 px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                توضیحات و پاسخ کامل (برای آموزش مدل)
              </label>
              <textarea
                name="content"
                required
                rows={5}
                placeholder="مثال: ارسال به سراسر کشور با پست پیشتاز انجام می‌شود. هزینه پست ۴۵ هزار تومان و زمان تحویل ۳ تا ۵ روز کاری است..."
                className="w-full rounded-xl border border-border bg-surface-hover/30 px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent outline-none resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-accent hover:bg-accent/90 text-white py-2.5 text-xs font-bold transition-all shadow-sm shadow-indigo-500/25"
            >
              افزودن به پایگاه دانش هوش مصنوعی
            </button>
          </form>
        </div>

        {/* Existing Documents List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-foreground">اسناد آموزشی فعال در اینستاگرام</h2>

          {docs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
              هنوز سندی به پایگاه دانش اضافه نشده است. با ثبت اولین موضوع، دستیار هوش مصنوعی شما آماده پاسخگویی می‌شود.
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">{doc.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleDocument}>
                      <input type="hidden" name="docId" value={doc.id} />
                      <button
                        type="submit"
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          doc.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-surface-hover text-muted border-border hover:bg-border"
                        }`}
                      >
                        {doc.isActive ? "فعال در پاسخگویی" : "غیرفعال"}
                      </button>
                    </form>

                    <form action={deleteDocument}>
                      <input type="hidden" name="docId" value={doc.id} />
                      <button
                        type="submit"
                        className="text-xs text-muted hover:text-rose-400 px-2 py-1 rounded transition-colors"
                        title="حذف سند"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-hover/40 p-3.5 border border-border/50 text-xs text-muted leading-relaxed">
                  <p className="whitespace-pre-wrap">{doc.content}</p>
                </div>

                <div className="text-[10px] text-muted/60 font-mono">
                  آخرین به‌روزرسانی:{" "}
                  {new Date(doc.updatedAt).toLocaleDateString("fa-IR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
