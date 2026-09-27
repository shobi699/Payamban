/**
 * Background Token Refresher Daemon
 *
 * Runs automatically inside the BullMQ worker to refresh 60-day Long-Lived
 * Instagram tokens before they expire.
 */

import { prisma } from "@/lib/db/client";
import { decryptToken, encryptToken } from "@/lib/meta/oauth";
import { refreshLongLivedToken } from "@/lib/meta/client";

const DAYS_BEFORE_EXPIRY = 10;

export async function refreshExpiringTokens(): Promise<{
  totalProcessed: number;
  refreshedCount: number;
  failedCount: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + DAYS_BEFORE_EXPIRY);

  const accountsToRefresh = await prisma.instagramAccount.findMany({
    where: {
      accessToken: { not: "" },
      provider: "META",
      tokenExpiresAt: {
        not: null,
        lte: cutoffDate,
      },
    },
    select: {
      id: true,
      workspaceId: true,
      username: true,
      accessToken: true,
    },
  });

  let refreshedCount = 0;
  let failedCount = 0;

  for (const account of accountsToRefresh) {
    try {
      const currentToken = decryptToken(account.accessToken);
      const { accessToken: newToken, expiresIn } =
        await refreshLongLivedToken(currentToken);
      const encryptedToken = encryptToken(newToken);
      const newExpiry = new Date(Date.now() + expiresIn * 1000);

      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptedToken,
          tokenExpiresAt: newExpiry,
          tokenStatus: "HEALTHY",
        },
      });

      console.log(`[Token Refresher] Successfully refreshed token for @${account.username}`);
      refreshedCount++;
    } catch (err) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[Token Refresher] Failed to refresh token for @${account.username}:`,
        errorMessage
      );

      await prisma.operationalEvent
        .create({
          data: {
            workspaceId: account.workspaceId,
            source: "TOKEN_REFRESH",
            level: "ERROR",
            message: `Token refresh failed for @${account.username}: ${errorMessage}`,
            payload: {
              instagramAccountId: account.id,
              username: account.username,
            },
          },
        })
        .catch(() => {});

      await prisma.instagramAccount
        .update({
          where: { id: account.id },
          data: {
            tokenStatus: "EXPIRING_SOON",
          },
        })
        .catch(() => {});
    }
  }

  return {
    totalProcessed: accountsToRefresh.length,
    refreshedCount,
    failedCount,
  };
}
