import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { decryptToken } from "@/lib/meta/oauth";
import {
  sendCommentReply,
  RateLimitError,
  TokenExpiredError,
  MetaApiError,
} from "@/lib/meta/client";

export const metadata = {
  title: "کامنت‌های بی‌پاسخ اینستاگرام - پیام‌بان پرو",
  description: "شناسایی هوشمند و ارسال پاسخ مستقیم به زیر کامنت‌های اینستاگرام با Meta Graph API",
};

interface CommentsPageProps {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}

export default async function CommentsPage({ searchParams }: CommentsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
    include: {
      instagramAccounts: true,
    },
  });

  if (!workspace || workspace.instagramAccounts.length === 0) {
    redirect("/dashboard");
  }

  const { formatNumber } = await getI18n();
  const query = await searchParams;
  const igAccount = workspace.instagramAccounts[0];

  const comments = await prisma.unansweredComment.findMany({
    where: { instagramAccountId: igAccount.id },
    orderBy: { createdAt: "desc" },
  });

  const unansweredList = comments.filter((c) => c.status === "UNANSWERED");
  const repliedList = comments.filter((c) => c.status === "REPLIED");
  const dismissedList = comments.filter((c) => c.status === "DISMISSED");

  // Server action to reply to comment via Meta Graph API (T016, T017)
  async function replyComment(formData: FormData) {
    "use server";
    const commentId = String(formData.get("commentId") ?? "");
    const replyText = String(formData.get("replyText") ?? "").trim();
    if (!commentId || !replyText) return;

    // 1. Locate unanswered comment record
    const targetComment = await prisma.unansweredComment.findUnique({
      where: { commentId },
      include: { instagramAccount: true },
    });

    if (!targetComment) return;

    // 2. Decrypt access token
    let accessToken = targetComment.instagramAccount.accessToken;
    try {
      accessToken = decryptToken(targetComment.instagramAccount.accessToken);
    } catch {
      // Use fallback if already plain
      accessToken = targetComment.instagramAccount.accessToken;
    }

    // 3. Send reply to Meta Graph API
    try {
      await sendCommentReply(accessToken, commentId, replyText);

      await prisma.unansweredComment.update({
        where: { commentId },
        data: {
          status: "REPLIED",
          replyText,
          repliedAt: new Date(),
        },
      });

      revalidatePath("/comments");
    } catch (err) {
      console.error("[Comment Reply Error]:", err);

      if (err instanceof RateLimitError || (err instanceof MetaApiError && err.code === 368)) {
        redirect(
          `/comments?error=${encodeURIComponent(
            "محدودیت موقت ارسال کامنت توسط اینستاگرام (کد ۳۶۸). لطفاً دقایقی دیگر مجدداً تلاش فرمایید."
          )}`
        );
      }

      if (err instanceof TokenExpiredError || (err instanceof MetaApiError && err.code === 190)) {
        await prisma.instagramAccount.update({
          where: { id: targetComment.instagramAccountId },
          data: { tokenStatus: "EXPIRING_SOON" },
        });

        redirect(
          `/comments?error=${encodeURIComponent(
            "توکن دسترسی اینستاگرام منقضی شده است (کد ۱۹۰). لطفاً حساب خود را در بخش اتصال مجدداً تایید کنید."
          )}`
        );
      }

      if (err instanceof MetaApiError && (err.code === 100 || err.code === 10)) {
        // Comment deleted on Instagram
        await prisma.unansweredComment.update({
          where: { commentId },
          data: { status: "DISMISSED" },
        });

        redirect(
          `/comments?error=${encodeURIComponent(
            "این کامنت در اینستاگرام حذف شده است و از لیست خارج شد."
          )}`
        );
      }

      redirect(
        `/comments?error=${encodeURIComponent(
          err instanceof Error ? err.message : "خطای ناشناخته در ارسال پاسخ به اینستاگرام"
        )}`
      );
    }
  }

  // Server action to dismiss comment without replying (T018)
  async function dismissComment(formData: FormData) {
    "use server";
    const commentId = String(formData.get("commentId") ?? "");
    if (!commentId) return;

    await prisma.unansweredComment.update({
      where: { commentId },
      data: { status: "DISMISSED" },
    });

    revalidatePath("/comments");
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              کامنت‌های بی‌پاسخ (Unanswered Comments)
            </h1>
            <p className="mt-1 text-sm text-muted">
              پاسخ مستقیم و لحظه‌ای به کامنت‌های پست‌ها و ریلزها از طریق ارتباط با Graph API اینستاگرام
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
              ⚠️ {formatNumber(unansweredList.length)} کامنت در انتظار پاسخ
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {query.error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400 shadow-sm flex items-start gap-3">
          <span className="text-lg">⚠</span>
          <div className="text-xs">
            <p className="font-semibold">{decodeURIComponent(query.error)}</p>
          </div>
        </div>
      )}

      {query.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400 shadow-sm flex items-start gap-3">
          <span className="text-lg">✓</span>
          <div className="text-xs">
            <p className="font-semibold">{decodeURIComponent(query.success)}</p>
          </div>
        </div>
      )}

      {/* Unanswered List */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">کامنت‌های منتظر پاسخ شما</h2>

        {unansweredList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
            🎉 عالیه! هیچ کامنت بی‌پاسخی در حال حاضر وجود ندارد. تمام کامنت‌ها پاسخ داده شده‌اند.
          </div>
        ) : (
          unansweredList.map((comm) => (
            <div
              key={comm.id}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {comm.commenterUsername.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">@{comm.commenterUsername}</span>
                    <span className="text-xs text-muted ms-2 font-mono">
                      {new Date(comm.createdAt).toLocaleDateString("fa-IR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/10 text-amber-400 px-2.5 py-0.5 text-xs font-medium">
                    بی‌پاسخ
                  </span>
                  {/* Dismiss Action (T018) */}
                  <form action={dismissComment}>
                    <input type="hidden" name="commentId" value={comm.commentId} />
                    <button
                      type="submit"
                      title="نادیده گرفتن و حذف از لیست"
                      className="text-xs text-muted hover:text-rose-400 px-2 py-0.5 rounded border border-border hover:border-rose-500/30 transition-colors"
                    >
                      رد کردن ✕
                    </button>
                  </form>
                </div>
              </div>

              <div className="rounded-lg bg-surface-hover/50 p-3.5 border border-border/50 text-sm text-foreground">
                <p className="font-medium leading-relaxed">{comm.text}</p>
              </div>

              {/* Quick Reply Form (T016, T017) */}
              <form action={replyComment} className="flex gap-2">
                <input type="hidden" name="commentId" value={comm.commentId} />
                <input
                  type="text"
                  name="replyText"
                  required
                  placeholder="متن پاسخ عمومی زیر این کامنت در اینستاگرام..."
                  className="flex-1 rounded-lg bg-surface border border-border px-3.5 py-2 text-xs text-foreground focus:border-accent outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent hover:bg-accent/90 text-white font-medium px-4 py-2 text-xs transition-all shadow-sm"
                >
                  ارسال پاسخ زنده
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {/* Replied Archive */}
      {repliedList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/40">
          <h2 className="text-sm font-semibold text-muted">کامنت‌های پاسخ‌داده‌شده اخیراً</h2>
          <div className="space-y-3">
            {repliedList.map((comm) => (
              <div
                key={comm.id}
                className="rounded-lg border border-border/40 bg-surface/50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">@{comm.commenterUsername}: </span>
                  <span className="text-muted">{comm.text}</span>
                  {comm.replyText && (
                    <p className="mt-1 text-emerald-400">
                      ← پاسخ شما در اینستاگرام: {comm.replyText}
                    </p>
                  )}
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-medium">
                  منتشر شد ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dismissed Archive */}
      {dismissedList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/40">
          <h2 className="text-sm font-semibold text-muted">کامنت‌های رد شده ({formatNumber(dismissedList.length)})</h2>
          <div className="space-y-2">
            {dismissedList.map((comm) => (
              <div
                key={comm.id}
                className="rounded-lg border border-border/30 bg-surface/30 p-3 flex items-center justify-between text-xs text-muted"
              >
                <div>
                  <span className="text-foreground">@{comm.commenterUsername}: </span>
                  <span>{comm.text}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">رد شده</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
