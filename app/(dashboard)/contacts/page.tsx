import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "دفترچه تلفن و لیست شماره‌های فالوورها - پیام‌بان پرو",
  description: "بانک اطلاعات مشتریان، شماره‌های همراه جمع‌آوری‌شده از دایرکت و برچسب‌گذاری",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
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
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedTag = params.tag?.trim() ?? "";

  const whereClause: any = {
    workspaceId: workspace.id,
  };

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { instagramUsername: { contains: query, mode: "insensitive" } },
    ];
  }

  if (selectedTag) {
    whereClause.tags = { has: selectedTag };
  }

  const contacts = await prisma.phonebookContact.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  // Extract all unique tags
  const allContacts = await prisma.phonebookContact.findMany({
    where: { workspaceId: workspace.id },
    select: { tags: true },
  });
  const allTags = Array.from(new Set(allContacts.flatMap((c) => c.tags)));

  // Server action to add manual contact
  async function addContact(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });
    if (!workspace) return;

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const instagramUsername = String(formData.get("instagramUsername") ?? "").trim();
    const tag = String(formData.get("tag") ?? "").trim();

    if (!phone) return;

    await prisma.phonebookContact.upsert({
      where: {
        workspaceId_phone: {
          workspaceId: workspace.id,
          phone,
        },
      },
      update: {
        name: name || undefined,
        instagramUsername: instagramUsername || undefined,
        tags: tag ? { push: tag } : undefined,
      },
      create: {
        workspaceId: workspace.id,
        phone,
        name: name || null,
        instagramUsername: instagramUsername || null,
        tags: tag ? [tag] : [],
        source: "MANUAL",
      },
    });

    revalidatePath("/contacts");
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              دفترچه تلفن و بانک شماره‌ها (Phonebook CRM)
            </h1>
            <p className="mt-1 text-sm text-muted">
              بانک شماره‌های موبایل جمع‌آوری‌شده از دایرکت، فرم‌ها و کامنت‌های پیج شما
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/contacts/export"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover shadow-sm transition-all"
            >
              📥 دانلود بانک شماره‌ها (اکسل / CSV)
            </a>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              📱 {formatNumber(contacts.length)} مخاطب معتبر
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Quick Add */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search & Tag Filter */}
        <div className="lg:col-span-2 space-y-4">
          <form method="GET" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="جستجو بر اساس نام، شماره تلفن یا آیدی اینستاگرام..."
              className="flex-1 rounded-lg bg-surface border border-border px-4 py-2.5 text-sm text-foreground focus:border-accent outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-surface-hover border border-border px-5 py-2.5 text-sm text-foreground hover:bg-border transition-colors"
            >
              جستجو
            </button>
          </form>

          {/* Tags bar */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted ms-1">فیلتر برچسب:</span>
              <a
                href="/contacts"
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  !selectedTag ? "bg-accent text-white" : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                همه
              </a>
              {allTags.map((tag) => (
                <a
                  key={tag}
                  href={`/contacts?tag=${encodeURIComponent(tag)}`}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedTag === tag
                      ? "bg-accent text-white"
                      : "bg-surface border border-border text-muted hover:text-foreground"
                  }`}
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Add manual contact card */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            + افزودن دستی مخاطب جدید
          </h3>
          <form action={addContact} className="space-y-3">
            <input
              type="text"
              name="name"
              placeholder="نام و نام خانوادگی"
              className="w-full rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none"
            />
            <input
              type="tel"
              name="phone"
              required
              placeholder="شماره موبایل (مثال: 09121234567)"
              className="w-full rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none font-mono"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                name="instagramUsername"
                placeholder="آیدی اینستاگرام"
                className="w-full rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none"
              />
              <input
                type="text"
                name="tag"
                placeholder="برچسب (تگ)"
                className="w-full rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-accent hover:bg-accent/90 text-white font-medium py-1.5 text-xs transition-all shadow-sm"
            >
              افزودن به دفترچه تلفن
            </button>
          </form>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-surface-hover/30 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">لیست شماره‌های ثبت‌شده</h2>
          <span className="text-xs text-muted">{formatNumber(contacts.length)} مخاطب نمایش داده شده</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-border/50 bg-surface/50 text-xs text-muted font-medium">
              <tr>
                <th className="px-6 py-3">نام و مشخصات</th>
                <th className="px-6 py-3">شماره تماس (موبایل)</th>
                <th className="px-6 py-3">آیدی اینستاگرام</th>
                <th className="px-6 py-3">برچسب‌ها (Tags)</th>
                <th className="px-6 py-3">منبع ثبت</th>
                <th className="px-6 py-3">تاریخ ثبت</th>
                <th className="px-6 py-3 text-center">ارسال پیامک</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    مخاطبی مطابق با فیلتر یافت نشد.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{contact.name ?? "کاربر مهمان"}</p>
                      {contact.notes && <p className="text-xs text-muted mt-0.5">{contact.notes}</p>}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4">
                      {contact.instagramUsername ? (
                        <span className="text-xs text-accent font-medium">@{contact.instagramUsername}</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-muted border border-border"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium text-muted border border-border">
                        {contact.source === "FORM" ? "فرم دایرکت" : contact.source === "DM" ? "چت دایرکت" : "دستی"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted font-mono">
                      {new Date(contact.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={`/sms?to=${encodeURIComponent(contact.phone)}`}
                        className="inline-flex items-center gap-1 rounded bg-accent/10 hover:bg-accent/20 px-2.5 py-1 text-xs font-medium text-accent border border-accent/20 transition-colors"
                      >
                        ✉️ پیامک
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
