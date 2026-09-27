import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "ویترین‌ساز محصولات اینستاگرام - پیام‌بان پرو",
  description: "نمایش محصولات و خدمات در دایرکت مانند یک فروشگاه آنلاین با قیمت و دکمه خرید",
};

interface ProductItem {
  id: string;
  name: string;
  priceTomans: number;
  imageUrl: string;
  buyUrl: string;
  description: string;
}

export default async function ShowcasePage() {
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

  const showcases = await prisma.productShowcase.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  // Server action to add product to showcase
  async function addProduct(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return;
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });
    if (!workspace) return;

    const showcaseId = String(formData.get("showcaseId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const priceTomans = parseInt(String(formData.get("priceTomans") ?? "0"), 10);
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const buyUrl = String(formData.get("buyUrl") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!showcaseId || !name) return;

    const showcase = await prisma.productShowcase.findUnique({
      where: { id: showcaseId },
    });

    if (showcase) {
      const items = (showcase.items as unknown as ProductItem[]) || [];
      items.push({
        id: `prod_${Date.now()}`,
        name,
        priceTomans,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
        buyUrl: buyUrl || "https://payamban.ir",
        description,
      });

      await prisma.productShowcase.update({
        where: { id: showcaseId },
        data: { items: items as any },
      });
      revalidatePath("/showcase");
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              ویترین‌ساز دایرکت (Product Showcase)
            </h1>
            <p className="mt-1 text-sm text-muted">
              تبدیل دایرکت اینستاگرام به یک فروشگاه اینترنتی با کارت‌های شیک محصول، قیمت و دکمه خرید
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            🛍️ فروش مستقیم در دایرکت
          </span>
        </div>
      </div>

      {/* Showcases */}
      {showcases.map((showcase) => {
        const items = (showcase.items as unknown as ProductItem[]) || [];
        return (
          <div key={showcase.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{showcase.title}</h2>
                <p className="text-xs text-muted mt-0.5">
                  ارسال خودکار این ویترین با کلمه کلیدی:{" "}
                  <span className="rounded bg-accent/10 text-accent font-semibold px-2 py-0.5">
                    {showcase.triggerKeyword}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 font-medium border border-emerald-500/20">
                {formatNumber(items.length)} محصول در ویترین
              </span>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-hover/30 overflow-hidden flex flex-col justify-between shadow-sm hover:border-accent/40 transition-all"
                >
                  <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {formatNumber(item.priceTomans)} <span className="text-xs font-normal text-muted">تومان</span>
                      </span>
                      <a
                        href={item.buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 transition-all shadow-sm"
                      >
                        خرید آنلاین ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add product to this showcase */}
            <div className="pt-4 border-t border-border/40">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                + افزودن محصول جدید به ویترین
              </h3>
              <form action={addProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input type="hidden" name="showcaseId" value={showcase.id} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="نام محصول"
                  className="rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none"
                />
                <input
                  type="number"
                  name="priceTomans"
                  required
                  placeholder="قیمت (تومان)"
                  className="rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none font-mono"
                />
                <input
                  type="url"
                  name="imageUrl"
                  placeholder="آدرس عکس محصول (URL)"
                  className="rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none font-mono"
                />
                <input
                  type="url"
                  name="buyUrl"
                  placeholder="لینک پرداخت / خرید"
                  className="rounded bg-surface border border-border px-3 py-1.5 text-xs text-foreground focus:border-accent outline-none font-mono"
                />
                <button
                  type="submit"
                  className="rounded bg-accent hover:bg-accent/90 text-white font-medium py-1.5 px-3 text-xs transition-all shadow-sm"
                >
                  افزودن به ویترین
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
