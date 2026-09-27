import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";

export const metadata = {
  title: "کاوشگر پست‌ها و کامنت‌های اینستاگرام - پیام‌بان پرو",
  description: "مشاهده بصری پست‌ها، ریلزها و کامنت‌های پیج شما و ساخت سریع اتوماسیون",
};

export default async function MediaExplorerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
    include: {
      instagramAccounts: {
        include: {
          posts: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!workspace || workspace.instagramAccounts.length === 0) {
    redirect("/dashboard");
  }

  const { formatNumber } = await getI18n();
  const igAccount = workspace.instagramAccounts[0];
  const posts = igAccount.posts;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              کاوشگر پست‌ها و مدیا (Instagram Media Explorer)
            </h1>
            <p className="mt-1 text-sm text-muted">
              مشاهده پست‌ها و ریلزهای اکانت @{igAccount.username} و اتصال اتوماسیون به هر پست با یک کلیک
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              📸 {formatNumber(posts.length)} پست همگام‌شده
            </span>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl border border-border bg-surface overflow-hidden flex flex-col justify-between shadow-sm hover:border-accent/40 transition-all group"
          >
            <div className="aspect-square w-full bg-zinc-900 relative overflow-hidden">
              <img
                src={post.mediaUrl ?? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"}
                alt={post.caption ?? "Instagram Post"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 end-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white flex items-center gap-1">
                <span>{post.mediaType === "VIDEO" ? "🎥 ریلز" : "📷 پست"}</span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs text-foreground leading-relaxed line-clamp-3 font-medium">
                  {post.caption ?? "پست اینستاگرام بدون متن"}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1 font-mono">
                    ❤️ {formatNumber(post.likeCount)} لایک
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    💬 {formatNumber(post.commentsCount)} کامنت
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <Link
                  href={`/comments`}
                  className="rounded-lg border border-border hover:bg-surface-hover px-3 py-2 text-xs text-muted hover:text-foreground transition-colors font-medium"
                >
                  دیدن کامنت‌ها
                </Link>
                <Link
                  href={`/campaigns/new?postId=${post.postId}`}
                  className="rounded-lg bg-accent hover:bg-accent/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all"
                >
                  ⚡ ایجاد اتوماسیون برای این پست
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
