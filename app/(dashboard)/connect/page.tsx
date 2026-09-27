import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import ConnectClient from "./ConnectClient";

export const metadata = {
  title: "اتصال به اینستاگرام و تنظیمات API - پیام‌بان پرو",
  description: "فرم پیکربندی اینستاگرام، تست سلامت اتصال و آموزش گام‌به‌گام اتصال اکانت تجاری",
};

export default async function ConnectPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
    include: {
      instagramAccounts: {
        take: 1,
        orderBy: { connectedAt: "desc" },
      },
    },
  });

  if (!workspace) {
    redirect("/login");
  }

  const rawAccount = workspace.instagramAccounts[0] || null;
  const currentAccount = rawAccount
    ? {
        id: rawAccount.id,
        instagramId: rawAccount.instagramId,
        username: rawAccount.username,
        tokenStatus: rawAccount.tokenStatus,
        webhookSubscribed: rawAccount.webhookSubscribed,
        pageId: rawAccount.pageId,
        appId: rawAccount.appId,
        webhookVerifyToken: rawAccount.webhookVerifyToken,
        connectedAt: rawAccount.connectedAt.toISOString(),
      }
    : null;

  const serverWebhookUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/webhooks/instagram`
    : "http://localhost:3002/api/webhooks/instagram";

  const defaultVerifyToken =
    process.env.WEBHOOK_VERIFY_TOKEN || "openreply_persian_token";

  return (
    <ConnectClient
      currentAccount={currentAccount}
      workspaceName={workspace.name}
      serverWebhookUrl={serverWebhookUrl}
      defaultVerifyToken={defaultVerifyToken}
    />
  );
}
