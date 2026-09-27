import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId ?? "");
  const transferRefId = String(body.transferRefId ?? "").trim();
  const senderCardDigits = String(body.senderCardDigits ?? "").trim();
  const receiptImageUrl = String(body.receiptImageUrl ?? "").trim();

  if (!planId || !transferRefId) {
    return NextResponse.json(
      { success: false, error: "لطفاً کد پیگیری واریز و پلن انتخابی را مشخص کنید." },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return NextResponse.json({ success: false, error: "پلن مورد نظر یافت نشد." }, { status: 404 });
  }

  // Check if this refId is already submitted
  const existingTx = await prisma.walletTransaction.findFirst({
    where: { refId: transferRefId },
  });

  if (existingTx) {
    return NextResponse.json(
      { success: false, error: "فیش واریزی با این شماره پیگیری قبلاً ثبت شده است." },
      { status: 400 }
    );
  }

  const description = `واریز کارت به کارت پلن ${plan.nameFa} | ۴ رقم کارت: ${
    senderCardDigits || "نامشخص"
  } | مدرک: ${receiptImageUrl || "بدون تصویر"}`;

  const transaction = await prisma.walletTransaction.create({
    data: {
      userId: session.user.id,
      amountTomans: plan.priceTomans,
      type: "PLAN_PURCHASE",
      status: "PENDING",
      paymentGateway: "CARD_TO_CARD",
      authority: `CARD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      refId: transferRefId,
      description,
    },
  });

  // Notify admin via OperationalEvent
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  await prisma.operationalEvent.create({
    data: {
      source: "SYSTEM",
      level: "WARNING",
      message: `فیش کارت به کارت جدید توسط کاربر (${user?.name ?? user?.email}) ثبت شد. شماره پیگیری: ${transferRefId} - مبلغ: ${plan.priceTomans.toLocaleString("fa-IR")} تومان`,
      payload: {
        transactionId: transaction.id,
        planId: plan.id,
        transferRefId,
        senderCardDigits,
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: "فیش واریزی شما با موفقیت ثبت شد و در انتظار تایید مدیریت سیستم قرار گرفت.",
    transactionId: transaction.id,
  });
}
