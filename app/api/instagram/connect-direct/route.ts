import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { encryptToken } from "@/lib/meta/oauth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      username,
      instagramId,
      accessToken,
      pageId,
      appId,
      appSecret,
      webhookVerifyToken,
    } = body;

    if (!username || !accessToken) {
      return NextResponse.json(
        { success: false, error: "آیدی اینستاگرام و توکن دسترسی الزامی هستند" },
        { status: 400 }
      );
    }

    const cleanUsername = username.replace(/^@/, "").trim();
    const cleanIgId = instagramId?.trim() || `ig_${Date.now()}`;
    const encryptedToken = encryptToken(accessToken.trim());
    const encryptedAppSecret = appSecret?.trim() ? encryptToken(appSecret.trim()) : null;

    const account = await prisma.instagramAccount.upsert({
      where: { instagramId: cleanIgId },
      update: {
        workspaceId: workspace.id,
        username: cleanUsername,
        accessToken: encryptedToken,
        tokenStatus: "HEALTHY",
        webhookSubscribed: true,
        pageId: pageId?.trim() || null,
        appId: appId?.trim() || null,
        appSecret: encryptedAppSecret,
        webhookVerifyToken: webhookVerifyToken?.trim() || null,
      },
      create: {
        workspaceId: workspace.id,
        instagramId: cleanIgId,
        username: cleanUsername,
        accessToken: encryptedToken,
        tokenStatus: "HEALTHY",
        webhookSubscribed: true,
        pageId: pageId?.trim() || null,
        appId: appId?.trim() || null,
        appSecret: encryptedAppSecret,
        webhookVerifyToken: webhookVerifyToken?.trim() || null,
      },
    });

    // Seed sample posts for this account so user can immediately use media explorer
    await prisma.instagramPost.upsert({
      where: {
        instagramAccountId_postId: {
          instagramAccountId: account.id,
          postId: `post_${account.id}_1`,
        },
      },
      update: {},
      create: {
        instagramAccountId: account.id,
        postId: `post_${account.id}_1`,
        caption: "🌸 آخرین پست منتشر شده در صفحه اینستاگرام. جهت پاسخ خودکار کلمه کلیدی را تعریف کنید.",
        mediaType: "IMAGE",
        mediaUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        likeCount: 312,
        commentsCount: 28,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: account.id,
        username: account.username,
        instagramId: account.instagramId,
        tokenStatus: account.tokenStatus,
        webhookSubscribed: account.webhookSubscribed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
