import { NextResponse } from "next/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await prisma.instagramAccount.findMany({
      where: {
        workspaceId: context.workspaceId,
        provider: "META",
      },
      select: {
        id: true,
        instagramId: true,
        username: true,
        name: true,
        tokenStatus: true,
        tokenExpiresAt: true,
        webhookSubscribed: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    const now = Date.now();
    const enrichedAccounts = accounts.map((account) => {
      let daysRemaining: number | null = null;
      let isExpiringSoon = false;
      let isExpired = false;

      if (account.tokenExpiresAt) {
        const diffMs = new Date(account.tokenExpiresAt).getTime() - now;
        daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        isExpiringSoon = daysRemaining <= 10;
        isExpired = diffMs <= 0;
      }

      const computedStatus =
        account.tokenStatus === "REVOKED"
          ? "REVOKED"
          : isExpired
            ? "EXPIRED"
            : isExpiringSoon
              ? "EXPIRING_SOON"
              : account.tokenStatus || "HEALTHY";

      return {
        id: account.id,
        instagramId: account.instagramId,
        username: account.username,
        name: account.name,
        tokenStatus: computedStatus,
        daysRemaining,
        tokenExpiresAt: account.tokenExpiresAt,
        webhookSubscribed: account.webhookSubscribed,
      };
    });

    const hasIssue = enrichedAccounts.some(
      (acc) => acc.tokenStatus !== "HEALTHY"
    );

    return NextResponse.json({
      success: true,
      hasIssue,
      accounts: enrichedAccounts,
    });
  } catch (err) {
    console.error("[Instagram Health API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
