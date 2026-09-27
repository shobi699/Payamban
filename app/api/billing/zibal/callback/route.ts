import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyZibalPayment } from "@/lib/billing/zibal";
import { sendSmsNotification } from "@/lib/sms/sender";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get("trackId");
  const successParam = url.searchParams.get("success");
  const baseUrl = url.origin;

  if (!trackId) {
    return NextResponse.redirect(`${baseUrl}/billing?error=invalid_track_id`);
  }

  // Find transaction
  const transaction = await prisma.walletTransaction.findUnique({
    where: { authority: trackId },
    include: {
      user: {
        include: {
          ownedWorkspaces: true,
          subscriptions: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      },
    },
  });

  if (!transaction) {
    return NextResponse.redirect(`${baseUrl}/billing?error=transaction_not_found`);
  }

  // Check if canceled by user
  if (successParam !== "1") {
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED", description: "پرداخت توسط کاربر در درگاه زیبال لغو شد." },
    });
    return NextResponse.redirect(`${baseUrl}/billing?error=canceled_by_user`);
  }

  // Verify with Zibal API
  const verifyResult = await verifyZibalPayment({
    trackId,
  });

  if (!verifyResult.success || !verifyResult.refNumber) {
    await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        description: verifyResult.errorMessage ?? "اعتبارسنجی درگاه زیبال ناموفق بود.",
      },
    });
    return NextResponse.redirect(
      `${baseUrl}/billing?error=${encodeURIComponent(verifyResult.errorMessage ?? "verification_failed")}`
    );
  }

  // Update transaction status
  await prisma.walletTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "SUCCESS",
      refId: verifyResult.refNumber,
      description: `تایید شده با زیبال - کد پیگیری: ${verifyResult.refNumber}`,
    },
  });

  // Renew or create Subscription (30 days)
  const user = transaction.user;
  const currentSub = user.subscriptions[0];
  const now = new Date();
  const currentExpiry = currentSub && currentSub.expiresAt > now ? currentSub.expiresAt : now;
  const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Find target plan by price
  const matchedPlan = await prisma.plan.findFirst({
    where: { priceTomans: transaction.amountTomans },
  });

  if (currentSub) {
    await prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        planId: matchedPlan?.id ?? currentSub.planId,
        expiresAt: newExpiry,
        status: "ACTIVE",
        dmsUsed: 0,
        smsUsed: 0,
      },
    });
  } else if (matchedPlan) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: matchedPlan.id,
        expiresAt: newExpiry,
        status: "ACTIVE",
        dmsUsed: 0,
        smsUsed: 0,
      },
    });
  }

  // Send SMS confirmation to user if phone is available
  const workspace = user.ownedWorkspaces[0];
  if (workspace) {
    const adminContact = await prisma.phonebookContact.findFirst({
      where: { workspaceId: workspace.id },
      select: { phone: true },
    });
    if (adminContact?.phone) {
      await sendSmsNotification({
        workspaceId: workspace.id,
        recipientPhone: adminContact.phone,
        messageText: `مدیر گرامی، خرید بسته اشتراک شما در پیام‌بان پرو با درگاه زیبال با موفقیت تایید شد. کد رهگیری: ${verifyResult.refNumber}`,
      });
    }
  }

  return NextResponse.redirect(
    `${baseUrl}/billing?success=1&refId=${verifyResult.refNumber}&gateway=zibal`
  );
}
