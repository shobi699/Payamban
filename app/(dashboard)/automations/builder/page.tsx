import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VisualFlowBuilder } from "@/components/flow-builder/VisualFlowBuilder";

export const metadata = {
  title: "سازنده سناریوی بصری (Visual Flow Builder) - پیام‌بان پرو",
  description: "ترسیم بصری و درگ‌اند‌دراپ مراحل ارسال دایرکت، شرط فالوور، دریافت فرم و هوش مصنوعی",
};

export default async function FlowBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            طراحی بصری سناریوهای دایرکت (Visual Flowchart Builder)
          </h1>
          <p className="text-xs text-muted mt-1">
            با کشیدن و رها کردن مراحل، مسیر هوشمند مکالمه را شبیه مانی‌چت و Botpress طراحی کنید
          </p>
        </div>
      </div>

      <VisualFlowBuilder />
    </div>
  );
}
