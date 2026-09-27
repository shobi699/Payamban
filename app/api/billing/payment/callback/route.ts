import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPayment } from "@/lib/billing/zarinpal";
import { sendSmsNotification } from "@/lib/sms/sender";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const searchParams = req.nextUrl.searchParams;
  const authority = searchParams.get("Authority") || searchParams.get("authority");
  const status = searchParams.get("Status") || searchParams.get("status");

  if (!authority) {
    return NextResponse.redirect(new URL("/billing?payment=no_authority", origin));
  }

  // 1. Locate the pending transaction
  const transaction = await prisma.walletTransaction.findFirst({
    where: { authority },
    include: { user: true },
  });

  if (!transaction) {
    console.error(`[Payment Callback] Transaction not found for authority: ${authority}`);
    return NextResponse.redirect(new URL("/billing?payment=not_found", origin));
  }

  if (transaction.status === "SUCCESS") {
    // Already processed previously
    return NextResponse.redirect(
      new URL(`/billing?payment=already_processed&refId=${transaction.refId ?? ""}`, origin)
    );
  }

  // 2. Handle user cancellation or non-OK status
  if (status !== "OK") {
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        description: `${transaction.description || ""} (لغو شده توسط کاربر یا خطا در درگاه)`,
      },
    });
    return NextResponse.redirect(
      new URL(`/billing?payment=cancelled&authority=${authority}`, origin)
    );
  }

  // 3. Verify with Zarinpal REST API v4
  const verifyResult = await verifyPayment({
    authority,
    amountTomans: transaction.amountTomans,
  });

  if (!verifyResult.success || !verifyResult.refId) {
    console.error(`[Payment Callback] Verification failed for authority ${authority}:`, verifyResult);
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        description: `${transaction.description || ""} (خطای تایید زرین‌پال: ${verifyResult.errorMessage || ""})`,
      },
    });
    return NextResponse.redirect(
      new URL(
        `/billing?payment=verify_failed&error=${encodeURIComponent(
          verifyResult.errorMessage || "عدم تایید تراکنش بانکی"
        )}`,
        origin
      )
    );
  }

  // 4. Mark transaction as SUCCESS
  const refId = verifyResult.refId;
  await prisma.walletTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "SUCCESS",
      refId,
    },
  });

  // 5. Update or extend user subscription (T011)
  const matchedPlan = await prisma.plan.findFirst({
    where: { priceTomans: transaction.amountTomans },
    orderBy: { sortOrder: "asc" },
  });

  const durationDays = matchedPlan?.durationDays ?? 30;
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: transaction.userId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  let newExpiresAt = new Date();

  if (existingSub?.expiresAt && new Date(existingSub.expiresAt) > now) {
    // Extend from existing expiration date
    newExpiresAt = new Date(new Date(existingSub.expiresAt).getTime() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    // Set 30 days from now
    newExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        status: "ACTIVE",
        expiresAt: newExpiresAt,
        dmsUsed: 0, // Reset monthly quota
        smsUsed: 0,
        planId: matchedPlan ? matchedPlan.id : existingSub.planId,
      },
    });
  } else if (matchedPlan) {
    await prisma.subscription.create({
      data: {
        userId: transaction.userId,
        planId: matchedPlan.id,
        status: "ACTIVE",
        expiresAt: newExpiresAt,
        dmsUsed: 0,
        smsUsed: 0,
      },
    });
  }

  // 6. Send SMS confirmation to user (T012)
  try {
    const userWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: transaction.userId },
      include: { smsConfiguration: true },
    });

    if (userWorkspace) {
      // Find recipient phone: from workspace contacts or owner
      const adminPhone =
        userWorkspace.smsConfiguration?.senderLine ||
        process.env.ADMIN_SMS_RECIPIENT ||
        "";

      if (adminPhone) {
        const smsMessage = `کاربر گرامی، اشتراک شما در پیام‌بان پرو با موفقیت تمدید شد.\nکد رهگیری: ${refId}\nمبلغ: ${transaction.amountTomans.toLocaleString(
          "fa-IR"
        )} تومان`;

        await sendSmsNotification({
          workspaceId: userWorkspace.id,
          recipientPhone: adminPhone,
          messageText: smsMessage,
          userId: transaction.userId,
        });
      }
    }
  } catch (smsError) {
    console.warn("[Payment Callback] Non-blocking SMS notification error:", smsError);
  }

  // 7. Redirect back to billing with success
  return NextResponse.redirect(
    new URL(`/billing?payment=success&refId=${refId}`, origin)
  );
}
