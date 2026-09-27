import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { requestZibalPayment } from "@/lib/billing/zibal";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId ?? "");

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return NextResponse.json({ success: false, error: "پلن مورد نظر یافت نشد." }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/api/billing/zibal/callback`;

  // Initiate with Zibal
  const result = await requestZibalPayment({
    amountTomans: plan.priceTomans,
    description: `خرید پلن ${plan.nameFa} (درگاه زیبال)`,
    callbackUrl,
    orderId: `${session.user.id}_${Date.now()}`,
  });

  if (!result.success || !result.paymentUrl || !result.trackId) {
    return NextResponse.json(
      { success: false, error: result.errorMessage ?? "خطا در اتصال به درگاه زیبال" },
      { status: 502 }
    );
  }

  // Record pending transaction
  await prisma.walletTransaction.create({
    data: {
      userId: session.user.id,
      amountTomans: plan.priceTomans,
      type: "PLAN_PURCHASE",
      status: "PENDING",
      authority: String(result.trackId),
      paymentGateway: "ZIBAL",
      description: `خرید پلن ${plan.nameFa} - شناسه رهگیری: ${result.trackId}`,
    },
  });

  return NextResponse.json({
    success: true,
    paymentUrl: result.paymentUrl,
    trackId: result.trackId,
  });
}
