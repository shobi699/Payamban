import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { requestPayment } from "@/lib/billing/zarinpal";
import { z } from "zod";

const paymentRequestSchema = z.object({
  planId: z.string().min(1, "شناسه پلن الزامی است"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "احراز هویت انجام نشده است." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = paymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "اطلاعات ارسالی نامعتبر است." },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { id: parsed.data.planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: "پلن مورد نظر یافت نشد یا در حال حاضر غیرفعال است." },
        { status: 404 }
      );
    }

    // Determine callback URL
    const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const callbackUrl = `${origin}/api/billing/payment/callback`;

    // Request authority from Zarinpal
    const zarinpalRes = await requestPayment({
      amountTomans: plan.priceTomans,
      description: `خرید اشتراک ${plan.nameFa} - پیام‌بان پرو`,
      callbackUrl,
      email: session.user.email ?? undefined,
    });

    if (!zarinpalRes.success || !zarinpalRes.authority || !zarinpalRes.paymentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: zarinpalRes.errorMessage || "ایجاد تراکنش در درگاه پرداخت با خطا مواجه شد.",
        },
        { status: 502 }
      );
    }

    // Create pending WalletTransaction
    await prisma.walletTransaction.create({
      data: {
        userId: session.user.id,
        amountTomans: plan.priceTomans,
        type: "PLAN_PURCHASE",
        status: "PENDING",
        authority: zarinpalRes.authority,
        paymentGateway: "ZARINPAL",
        description: `خرید اشتراک ${plan.nameFa}`,
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: zarinpalRes.paymentUrl,
      authority: zarinpalRes.authority,
    });
  } catch (error) {
    console.error("[Billing Payment Request Error]:", error);
    return NextResponse.json(
      { success: false, error: "خطای غیرمنتظره در ثبت درخواست پرداخت." },
      { status: 500 }
    );
  }
}
