import { createHash } from "node:crypto";
import { UnrecoverableError, Worker, type Job } from "bullmq";
import {
  getDMQueue,
  getRedisConnection,
  MESSAGE_JOB_NAME,
  POSTBACK_JOB_NAME,
  FOLLOWUP_JOB_NAME,
  STORY_MENTION_JOB_NAME,
  type DmQueueJob,
  type ProcessCommentJob,
  type ProcessMessageJob,
  type ProcessPostbackJob,
  type ProcessFollowUpJob,
  type ProcessStoryMentionJob,
} from "./client";
import {
  getDmSession,
  setDmSession,
  clearDmSession,
  type DmSessionPayload,
} from "./dm-session";
import { sendSmsNotification } from "@/lib/sms/sender";
import { prisma } from "@/lib/db/client";
import {
  MetaApiError,
  RateLimitError,
  TokenExpiredError,
  getUserFollowStatus,
  sendCommentReply,
  sendDirectMessage,
  sendDirectMessageWithButton,
  sendDirectMessageWithLinkButton,
  sendPrivateReply,
  sendPrivateReplyWithButton,
  sendPrivateReplyWithLinkButton,
  sendCarouselMessage,
  type CarouselElement,
} from "@/lib/instagram/provider";
import { generateAiReply } from "@/lib/ai/responder";
import {
  createInstagramContext,
  hasInstagramCredentials,
  type InstagramContext,
} from "@/lib/instagram/provider";
import { matchKeywords } from "@/lib/utils/keyword-matcher";
import { reserveDMSlot, releaseDMSlot } from "@/lib/utils/rate-limiter";
import {
  releaseWorkspaceDMReservation,
  reserveWorkspaceDMSend,
} from "@/lib/billing/usage";
import { recordWorkerAlert } from "@/lib/ops/worker-health";
import {
  buildTrackedUrl,
  renderMessageWithTracking,
  renderMessageWithoutLink,
} from "@/lib/tracking/message";
import { TRACKED_LINK_ORDER } from "@/lib/tracking/link-order";

import {
  ZernioApiError,
  ZernioDeliveryUnconfirmedError,
} from "@/lib/zernio/client";

const BACKOFF_DELAYS = [5 * 60 * 1000, 15 * 60 * 1000, 45 * 60 * 1000];

function formatError(error: unknown): string {
  if (error instanceof MetaApiError) {
    return `${error.name} ${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

// Meta rejections that a plain-text retry cannot fix: the send was refused for
// the conversation, not for the button template. Retrying as text just burns
// the attempt and — worse — overwrites the real error with a misleading one
// ("invalid for a private reply", because the first attempt already used up the
// comment's single allowed private reply).
const NON_TEMPLATE_REJECTIONS = [
  /outside of allowed window/i,
  /invalid for a private reply/i,
  /requested user cannot be found/i,
];

function isTemplateRejection(error: unknown): boolean {
  if (
    error instanceof TokenExpiredError ||
    error instanceof RateLimitError ||
    error instanceof ZernioApiError
  ) {
    return false;
  }
  const message = error instanceof Error ? error.message : "";
  return !NON_TEMPLATE_REJECTIONS.some((pattern) => pattern.test(message));
}

type WorkerTrackedLink = {
  slug: string;
  label: string | null;
  destinationUrl: string;
};

/**
 * Build the tappable link buttons for a DM. The first link uses the campaign's
 * `linkButtonLabel`; each additional link uses its own stored `label`. Capped at
 * Meta's 3-button limit for a button template.
 */
function buildLinkButtons(
  trackedLinks: WorkerTrackedLink[],
  primaryLabel: string | null
): { title: string; url: string }[] {
  return trackedLinks.slice(0, 3).map((link, index) => ({
    url: buildTrackedUrl(link.slug),
    title:
      (index === 0 ? primaryLabel : link.label) || link.label || "Open link",
  }));
}

/**
 * Fallback text when Meta rejects the button template: render the primary link
 * inline, then append any extra tracked URLs on their own lines so no link is
 * lost.
 */
function buildInlineLinkFallback(
  message: string,
  commenterName: string | null | undefined,
  trackedLinks: WorkerTrackedLink[],
  bodyText: string
): string {
  const base =
    renderMessageWithTracking({ message, commenterName, trackedLinks }) ||
    bodyText;
  const extraUrls = trackedLinks
    .slice(1)
    .map((link) => buildTrackedUrl(link.slug));
  return extraUrls.length > 0 ? `${base}\n${extraUrls.join("\n")}` : base;
}

type RevealAutomation = {
  dmMessage: string;
  linkButtonLabel: string | null;
  trackedLinks: WorkerTrackedLink[];
  instagramAccount: { instagramId: string };
};

/**
 * Deliver a campaign's reveal message as a direct message. Shared by the
 * button-tap (postback) path and the DM keyword-trigger path — both already
 * have an open conversation with the user, so neither uses a private reply.
 */
async function sendRevealDirectMessage({
  accessToken,
  automation,
  userId,
  commenterName,
  context,
}: {
  accessToken: InstagramContext;
  automation: RevealAutomation;
  userId: string;
  commenterName: string | null;
  context: string;
}): Promise<void> {
  if (automation.trackedLinks.length === 0) {
    await sendDirectMessage({
      context: accessToken,
      instagramAccountId: automation.instagramAccount.instagramId,
      userId: userId,
      message: renderMessageWithTracking({
        message: automation.dmMessage,
        commenterName,
        trackedLinks: automation.trackedLinks,
      }),
    });
    return;
  }

  // Try button template first; if Meta rejects it, fall back to inline links.
  const bodyText =
    renderMessageWithoutLink({
      message: automation.dmMessage,
      commenterName,
    }) || "Here's your link:";
  const buttons = buildLinkButtons(
    automation.trackedLinks,
    automation.linkButtonLabel
  );

  try {
    await sendDirectMessageWithLinkButton({
      context: accessToken,
      instagramAccountId: automation.instagramAccount.instagramId,
      userId: userId,
      text: bodyText,
      buttons: buttons,
    });
  } catch (buttonError) {
    // A closed messaging window rejects the text retry too, so don't let it
    // overwrite the original error with a misleading one.
    if (!isTemplateRejection(buttonError)) throw buttonError;

    console.log(
      `[DM Worker] Button template rejected in ${context}, falling back to inline link:`,
      formatError(buttonError)
    );
    try {
      await sendDirectMessage({
        context: accessToken,
        instagramAccountId: automation.instagramAccount.instagramId,
        userId: userId,
        message: buildInlineLinkFallback(
          automation.dmMessage,
          commenterName,
          automation.trackedLinks,
          bodyText
        ),
      });
    } catch {
      throw buttonError;
    }
  }
}


function connectionScope(data: DmQueueJob) {
  return data.accountConnectionId ? { instagramAccountId: data.accountConnectionId } : {};
}

async function processComment(job: Job<ProcessCommentJob>): Promise<void> {
  const {
    instagramAccountId,
    commentId,
    commentText,
    commenterId,
    commenterName,
    mediaId,
    originalMediaId,
  } = job.data;
  const requeueAttempt = job.data.requeueAttempt ?? 0;

  // Filter comments sent by the account owner itself to prevent self-replies / infinite loops
  if (commenterId && commenterId === instagramAccountId) {
    console.log(
      `[DM Worker] Skipping comment ${commentId} from account owner itself (@${commenterName || instagramAccountId})`
    );
    return;
  }

  const automations = await prisma.automation.findMany({
    where: {
      ...connectionScope(job.data),
      // Match campaigns bound to this specific post, plus any-post campaigns.
      // A comment left on an ad carries the ad's own media id, while the
      // campaign is bound to the post the ad was created from, so both ids
      // have to be considered or the comment is dropped without a trace.
      OR: [
        { postId: mediaId },
        ...(originalMediaId ? [{ postId: originalMediaId }] : []),
        { matchAnyPost: true },
      ],
      isActive: true,
      instagramAccount: {
        instagramId: instagramAccountId,
      },
    },
    include: {
      instagramAccount: true,
      workspace: true,
      trackedLinks: {
        select: {
          slug: true,
          label: true,
          destinationUrl: true,
        },
        orderBy: TRACKED_LINK_ORDER,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const automation of automations) {
    // "Any word" campaigns fire on every comment; otherwise require a keyword hit.
    const matchResult = automation.matchAnyWord
      ? { matched: true, matchedKeyword: null }
      : matchKeywords(
          commentText,
          automation.keywords,
          automation.wholeWordMatch
        );

    if (!matchResult.matched) {
      continue;
    }

    const existingLog = await prisma.dmLog.findUnique({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId,
        },
      },
    });

    const alreadyDmd = existingLog?.status === "SENT";
    const alreadyPublicReplied = Boolean(existingLog?.publicReplySentAt);
    const needsDm = !alreadyDmd && !existingLog?.dmDeliveryUnconfirmed;

    // Skip only when there is genuinely nothing left to do. A comment whose DM
    // already sent but whose public reply never posted (e.g. it hit a rate
    // limit) must still come back so the public reply can be retried.
    if (existingLog?.status === "SKIPPED_PLAN_LIMIT") continue;
    if (
      !needsDm &&
      (alreadyPublicReplied || existingLog?.publicReplyDeliveryUnconfirmed || !automation.publicReplyEnabled)
    ) {
      continue;
    }

    if (!hasInstagramCredentials(automation.instagramAccount)) {
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        create: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: automation.instagramAccountId,
          commenterId,
          commenterName,
          commentText,
          commentId,
          matchedKeyword: matchResult.matchedKeyword,
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
        update: {
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
      });
      continue;
    }

    let accessToken: InstagramContext;
    try {
      accessToken = await createInstagramContext(
        automation.instagramAccount,
        `${job.id}:${automation.id}`
      );
    } catch {
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        create: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: automation.instagramAccountId,
          commenterId,
          commenterName,
          commentText,
          commentId,
          matchedKeyword: matchResult.matchedKeyword,
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
        update: {
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
      });
      continue;
    }

    // Ensure a log row exists before the public reply leg (which updates it).
    // Only (re)set PENDING when the DM will actually be attempted, so a prior
    // SENT is never clobbered while we come back just to retry the public reply.
    if (!existingLog) {
      await prisma.dmLog.create({
        data: {
          workspaceId: automation.workspaceId,
          automationId: automation.id,
          instagramAccountId: automation.instagramAccountId,
          commenterId,
          commenterName,
          commentText,
          commentId,
          matchedKeyword: matchResult.matchedKeyword,
          status: "PENDING",
          attempts: job.attemptsMade + 1,
        },
      });
    } else if (needsDm) {
      await prisma.dmLog.update({
        where: {
          automationId_commentId: { automationId: automation.id, commentId },
        },
        data: {
          status: "PENDING",
          attempts: job.attemptsMade + 1,
          matchedKeyword: matchResult.matchedKeyword,
          errorMessage: null,
        },
      });
    }

    // Public reply leg — decoupled from the DM and posted first so a DM failure
    // (e.g. a non-follower whose messaging is restricted) never suppresses it.
    // Idempotent across retries via publicReplySentAt.
    const replyPool =
      automation.publicReplyMessages.length > 0
        ? automation.publicReplyMessages
        : automation.publicReplyMessage
          ? [automation.publicReplyMessage]
          : [];
    if (
      automation.publicReplyEnabled &&
      replyPool.length > 0 &&
      !existingLog?.publicReplySentAt &&
      !existingLog?.publicReplyDeliveryUnconfirmed
    ) {
      try {
        const chosen = replyPool[Math.floor(Math.random() * replyPool.length)];
        const publicReply = renderMessageWithTracking({
          message: chosen,
          commenterName,
          trackedLinks: automation.trackedLinks,
        });
        await sendCommentReply({
          context: accessToken,
          commentId: commentId,
          message: publicReply,
          postId: mediaId,
        });
        await prisma.dmLog.update({
          where: {
            automationId_commentId: { automationId: automation.id, commentId },
          },
          data: { publicReplySentAt: new Date(), publicReplyError: null },
        });
      } catch (error) {
        console.error(
          "[DM Worker] Public comment reply failed:",
          formatError(error)
        );
        await prisma.dmLog
          .update({
            where: {
              automationId_commentId: {
                automationId: automation.id,
                commentId,
              },
            },
            data: { publicReplyError: formatError(error), publicReplyDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError },
          })
          .catch(() => {});
      }
    }

    // DM already sent on an earlier pass; the public reply retry above was all
    // this run needed. Don't re-send the DM.
    if (!needsDm) continue;

    // Meta allows exactly ONE private reply per comment, ever — across every
    // campaign. When several campaigns match the same comment (duplicated
    // campaigns, or an any-post campaign overlapping a post-specific one), only
    // the first can deliver; the rest would fail with "The comment is invalid
    // for a private reply". Skip them explicitly instead of burning an API call
    // and logging a failure the user can do nothing about. The public reply
    // above still goes out per campaign — only the DM leg is deduped.
    const privateReplyUsedBy = await prisma.dmLog.findFirst({
      where: {
        commentId,
        status: "SENT",
        automationId: { not: automation.id },
      },
      select: { automation: { select: { name: true } } },
    });
    if (privateReplyUsedBy) {
      await prisma.dmLog.update({
        where: {
          automationId_commentId: { automationId: automation.id, commentId },
        },
        data: {
          status: "SKIPPED_DEDUP",
          matchedKeyword: matchResult.matchedKeyword,
          errorMessage: `Another campaign (${privateReplyUsedBy.automation?.name ?? "unknown"}) already sent the one private reply Instagram allows for this comment`,
        },
      });
      continue;
    }

    const usage = await reserveWorkspaceDMSend(automation.workspaceId);
    if (!usage.allowed) {
      await prisma.dmLog.update({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        data: {
          status: "SKIPPED_PLAN_LIMIT",
          matchedKeyword: matchResult.matchedKeyword,
          errorMessage: `Monthly DM limit reached (${usage.limit})`,
        },
      });
      continue;
    }

    let rateLimit;
    try {
      rateLimit = await reserveDMSlot(instagramAccountId, requeueAttempt);
    } catch (error) {
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        usage.periodStart
      );
      await prisma.dmLog.update({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        data: {
          status: "FAILED",
          attempts: job.attemptsMade + 1,
          errorMessage: formatError(error),
          dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
        },
      });
      throw error;
    }

    if (!rateLimit.allowed) {
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        usage.periodStart
      );

      if (rateLimit.shouldSkip) {
        await prisma.dmLog.update({
          where: {
            automationId_commentId: {
              automationId: automation.id,
              commentId,
            },
          },
          data: {
            status: "SKIPPED_RATE_LIMIT",
            matchedKeyword: matchResult.matchedKeyword,
            errorMessage: "Hourly Instagram DM rate limit reached",
          },
        });
        continue;
      }

      if (rateLimit.shouldRequeue) {
        await prisma.dmLog.update({
          where: {
            automationId_commentId: {
              automationId: automation.id,
              commentId,
            },
          },
          data: {
            status: "PENDING",
            matchedKeyword: matchResult.matchedKeyword,
            errorMessage: "Hourly rate limit hit; retry scheduled",
          },
        });

        await getDMQueue().add(
          "process-comment",
          {
            ...job.data,
            requeueAttempt: requeueAttempt + 1,
          },
          {
            delay: rateLimit.requeueDelayMs,
            jobId: `comment_${instagramAccountId}_${commentId}_retry_${requeueAttempt + 1}`,
          }
        );
        continue;
      }
    }

    // With an opening DM, the private reply is a button message; tapping it
    // fires a postback that delivers the reveal (see processPostback). Without
    // one, we send the reveal text directly as today.
    const useOpeningDm =
      automation.openingDmEnabled &&
      Boolean(automation.openingDmMessage) &&
      Boolean(automation.openingDmButtonLabel);

    // Follow-gating: the link is revealed only after a follow. When an opening
    // DM is enabled it comes FIRST, and its button routes into the follow check
    // (opening DM → follow gate → link). Without an opening DM, we check follow
    // status at comment time: confirmed followers get the link now, everyone
    // else gets the "follow me first" prompt (re-verified on tap).
    let sendFollowPrompt = false;
    if (automation.requireFollow && !useOpeningDm) {
      const alreadyFollows = await getUserFollowStatus({
        context: accessToken,
        recipientId: commenterId,
      });
      sendFollowPrompt =
        accessToken.provider === "ZERNIO"
          ? alreadyFollows === false
          : alreadyFollows !== true;
    }

    try {
      if (useOpeningDm) {
        const openingText = renderMessageWithTracking({
          message: automation.openingDmMessage as string,
          commenterName,
          trackedLinks: [],
        });
        await sendPrivateReplyWithButton({
          context: accessToken,
          instagramAccountId: automation.instagramAccount.instagramId,
          commentId: commentId,
          text: openingText,
          buttonTitle: automation.openingDmButtonLabel as string,
          payload: automation.requireFollow
            ? `followcheck:${automation.id}`
            : `reveal:${automation.id}`,
          postId: mediaId,
        });
      } else if (sendFollowPrompt) {
        const promptText = renderMessageWithoutLink({
          message:
            automation.followPromptMessage ||
            "quick favor before i send your link. i don't make any money from this, it's free. if you want to support me, just don't unfollow after, and star the repo on github if it helps you. tap the button once you're following and i'll send it over",
          commenterName,
        });
        await sendPrivateReplyWithButton({
          context: accessToken,
          instagramAccountId: automation.instagramAccount.instagramId,
          commentId: commentId,
          text: promptText,
          buttonTitle: automation.followPromptButtonLabel || "i'm following",
          payload: `followcheck:${automation.id}`,
          postId: mediaId,
        });
      } else if (automation.trackedLinks.length > 0) {
        // Try button template first; if Meta rejects it, fall back to inline links.
        const bodyText =
          renderMessageWithoutLink({
            message: automation.dmMessage,
            commenterName,
          }) || "Here's your link:";
        const buttons = buildLinkButtons(
          automation.trackedLinks,
          automation.linkButtonLabel
        );

        try {
          await sendPrivateReplyWithLinkButton({
            context: accessToken,
            instagramAccountId: automation.instagramAccount.instagramId,
            commentId: commentId,
            text: bodyText,
            buttons: buttons,
            postId: mediaId,
          });
        } catch (buttonError) {
          // Only a template rejection is worth retrying as text. Anything else
          // (closed window, comment already replied to) fails the same way and
          // would replace the real error with a misleading one.
          if (!isTemplateRejection(buttonError)) throw buttonError;

          console.log(
            "[DM Worker] Button template rejected, falling back to inline link:",
            formatError(buttonError)
          );
          const fallbackMessage = buildInlineLinkFallback(
            automation.dmMessage,
            commenterName,
            automation.trackedLinks,
            bodyText
          );
          try {
            await sendPrivateReply({
              context: accessToken,
              instagramAccountId: automation.instagramAccount.instagramId,
              commentId: commentId,
              message: fallbackMessage,
              postId: mediaId,
            });
          } catch {
            // The first attempt consumed the comment's single private reply, so
            // this one reports "invalid for a private reply" no matter what the
            // underlying problem was. Surface the original rejection instead.
            throw buttonError;
          }
        }
      } else {
        const dmMessage = renderMessageWithTracking({
          message: automation.dmMessage,
          commenterName,
          trackedLinks: automation.trackedLinks,
        });
        await sendPrivateReply({
          context: accessToken,
          instagramAccountId: automation.instagramAccount.instagramId,
          commentId: commentId,
          message: dmMessage,
          postId: mediaId,
        });
      }

      await prisma.dmLog.update({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        data: {
          status: "SENT",
          dmSentAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      // The rate slot was reserved before the send; this send did not deliver a
      // DM, so hand the slot back instead of burning it (and burning more on
      // each BullMQ retry) until the hourly TTL expires.
      if (rateLimit?.reserved) {
        await releaseDMSlot(instagramAccountId);
      }
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        usage.periodStart
      );

      await prisma.dmLog.update({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId,
          },
        },
        data: {
          status: "FAILED",
          attempts: job.attemptsMade + 1,
          errorMessage: formatError(error),
          dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
        },
      });
      throw error;
    }
  }
}

async function sendPostbackOnce({
  operationId,
  send,
}: {
  operationId: string | null;
  send: () => Promise<unknown>;
}): Promise<boolean> {
  if (!operationId) {
    await send();
    return true;
  }
  try {
    await prisma.postbackDelivery.create({ data: { id: operationId } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return false;
    throw error;
  }
  try {
    await send();
    return true;
  } catch (error) {
    // A durable claim survives queue eviction, concurrent redelivery, and a
    // process crash during delivery. Only confirmed rejections permit retry.
    if (
      (error instanceof ZernioApiError && error.code < 500) ||
      error instanceof RateLimitError ||
      error instanceof TokenExpiredError
    ) {
      await prisma.postbackDelivery.delete({ where: { id: operationId } });
      throw error;
    }
    throw error instanceof ZernioDeliveryUnconfirmedError
      ? error
      : new ZernioDeliveryUnconfirmedError();
  }
}

/**
 * Deliver the reveal message after a user taps an opening DM's button.
 * The postback payload is `reveal:<automationId>`; the sender is the user's
 * IGSID (same id as their comment author id), which we DM directly.
 */
async function processPostback(job: Job<ProcessPostbackJob>): Promise<void> {
  const { instagramAccountId, userId, payload, fallback } = job.data;

  const isFollowCheck = payload.startsWith("followcheck:");
  if (!isFollowCheck && !payload.startsWith("reveal:")) return;
  const automationId = payload.slice(
    isFollowCheck ? "followcheck:".length : "reveal:".length,
  );

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, isActive: true, ...connectionScope(job.data) },
    include: {
      instagramAccount: true,
      workspace: true,
      trackedLinks: {
        select: { slug: true, label: true, destinationUrl: true },
        orderBy: TRACKED_LINK_ORDER,
      },
    },
  });

  if (
    !automation ||
    automation.instagramAccount.instagramId !== instagramAccountId ||
    !hasInstagramCredentials(automation.instagramAccount)
  ) {
    return;
  }

  // Duplicate sends are enabled: every button tap re-sends the reveal
  // instead of only firing once per person.
  const dedupeId = `reveal:${userId}`;

  if (fallback) {
    const existingReveal = await prisma.dmLog.findUnique({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId: dedupeId,
        },
      },
    });
    if (
      existingReveal?.status === "SENT" ||
      existingReveal?.dmDeliveryUnconfirmed
    )
      return;
  }

  // Personalize {username} from the opening DM log for this user, if present.
  const openingLog = await prisma.dmLog.findFirst({
    where: { automationId: automation.id, commenterId: userId },
    select: { commenterName: true },
  });
  const commenterName = openingLog?.commenterName ?? null;

  let accessToken: InstagramContext;
  try {
    accessToken = await createInstagramContext(
      automation.instagramAccount,
      `${job.id}:${automation.id}`,
    );
  } catch {
    return;
  }

  const operationId =
    accessToken.provider === "ZERNIO"
      ? createHash("sha256")
          .update(
            JSON.stringify([
              automation.instagramAccountId,
              automation.id,
              userId,
              job.data.mid ?? job.id ?? payload,
            ]),
          )
          .digest("hex")
      : null;

  // Follow-gate: before revealing the link, verify the user follows. On a
  // `followcheck:` tap a non-follower gets the prompt again (no quota spent);
  // on a read fallback a non-follower is silently skipped — the gate must not
  // be bypassable by just reading the DM and waiting. Following, or
  // unverifiable (null), falls through and delivers the link — fail-open so a
  // real follower is never trapped.
  if ((isFollowCheck || fallback) && automation.requireFollow) {
    const follows = await getUserFollowStatus({
      context: accessToken,
      recipientId: userId,
    });
    if (follows === false) {
      if (fallback) return;
      const promptText = renderMessageWithoutLink({
        message:
          automation.followPromptMessage ||
          "quick favor before i send your link. i don't make any money from this, it's free. if you want to support me, just don't unfollow after, and star the repo on github if it helps you. tap the button once you're following and i'll send it over",
        commenterName,
      });
      try {
        await sendPostbackOnce({
          operationId,
          send: () =>
            sendDirectMessageWithButton({
              context: accessToken,
              instagramAccountId: automation.instagramAccount.instagramId,
              userId: userId,
              text: promptText,
              buttonTitle:
                automation.followPromptButtonLabel || "i'm following",
              payload: `followcheck:${automation.id}`,
            }),
        });
      } catch (error) {
        console.log(
          "[DM Worker] Failed to re-send follow prompt:",
          formatError(error),
        );
      }
      return;
    }
  }

  const usage = await reserveWorkspaceDMSend(automation.workspaceId);
  if (!usage.allowed) {
    await prisma.dmLog.upsert({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId: dedupeId,
        },
      },
      create: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId: userId,
        commenterName,
        commentText: "(button tap)",
        commentId: dedupeId,
        status: "SKIPPED_PLAN_LIMIT",
        errorMessage: `Monthly DM limit reached (${usage.limit})`,
      },
      update: { status: "SKIPPED_PLAN_LIMIT" },
    });
    return;
  }

  try {
    const delivered = await sendPostbackOnce({
      operationId,
      send: () =>
        sendRevealDirectMessage({
          accessToken: accessToken,
          automation: automation,
          userId: userId,
          commenterName: commenterName,
          context: "postback",
        }),
    });
    if (!delivered) {
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        usage.periodStart,
      );
      return;
    }
    // Optional appreciation follow-up: once the link has been delivered, send a
    // short thank-you. It is scheduled as its own delayed job so it can go out
    // some minutes later (followUpDelayMinutes) rather than immediately. The
    // deterministic job id dedupes repeat button taps to one follow-up per user.
    if (automation.followUpEnabled && automation.followUpMessage?.trim()) {
      const delayMs =
        Math.max(0, automation.followUpDelayMinutes ?? 0) * 60_000;
      await getDMQueue().add(
        FOLLOWUP_JOB_NAME,
        {
          instagramAccountId: automation.instagramAccount.instagramId,
          accountConnectionId: automation.instagramAccountId,
          userId,
          automationId: automation.id,
          commenterName,
        },
        {
          delay: delayMs,
          jobId: `followup_${automation.id}_${userId}`,
        },
      );
    }
    await prisma.dmLog.upsert({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId: dedupeId,
        },
      },
      create: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId: userId,
        commenterName,
        commentText: "(button tap)",
        commentId: dedupeId,
        status: "SENT",
        dmSentAt: new Date(),
      },
      update: { status: "SENT", dmSentAt: new Date(), errorMessage: null },
    });
  } catch (error) {
    await releaseWorkspaceDMReservation(
      automation.workspaceId,
      usage.periodStart,
    );

    // The read fallback is speculative: it only runs when the user read the
    // opening DM and never tapped the button, which means they never messaged
    // us, which means the 24-hour window is closed and Meta rejects the send
    // ("outside of allowed window"). That is the expected outcome here, not a
    // failure the user can act on — so don't log it as FAILED and don't retry
    // it against a window that cannot reopen on its own. It still delivers in
    // the case that does work: the user replied by typing instead of tapping.
    if (fallback && !(error instanceof ZernioDeliveryUnconfirmedError)) {
      console.log(
        "[DM Worker] Read fallback not delivered (messaging window closed):",
        formatError(error),
      );
      return;
    }

    await prisma.dmLog.upsert({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId: dedupeId,
        },
      },
      create: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId: userId,
        commenterName,
        commentText: "(button tap)",
        commentId: dedupeId,
        status: "FAILED",
        errorMessage: formatError(error),
        dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
      },
      update: {
        status: "FAILED",
        errorMessage: formatError(error),
        dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
      },
    });
    throw error;
  }
}

/**
 * Send the scheduled appreciation follow-up. Runs after its delay elapses.
 * Best-effort: if the message can't be delivered (e.g. the 24-hour messaging
 * window closed because the delay was long), it is logged, not retried forever.
 */
async function processFollowUp(job: Job<ProcessFollowUpJob>): Promise<void> {
  const { instagramAccountId, userId, automationId, commenterName } = job.data;

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, isActive: true, ...connectionScope(job.data) },
    include: { instagramAccount: true },
  });

  if (
    !automation ||
    !automation.followUpEnabled ||
    !automation.followUpMessage?.trim() ||
    automation.instagramAccount.instagramId !== instagramAccountId ||
    !hasInstagramCredentials(automation.instagramAccount)
  ) {
    return;
  }

  let accessToken: InstagramContext;
  try {
    accessToken = await createInstagramContext(
      automation.instagramAccount,
      `${job.id}:${automation.id}`
    );
  } catch {
    return;
  }

  try {
    await sendDirectMessage({
      context: accessToken,
      instagramAccountId: automation.instagramAccount.instagramId,
      userId: userId,
      message: renderMessageWithoutLink({
        message: automation.followUpMessage,
        commenterName: commenterName ?? null,
      }),
    });
  } catch (error) {
    console.log(
      "[DM Worker] Failed to send follow-up message:",
      formatError(error)
    );
  }
}

/**
 * Normalizes Iranian phone numbers (converts Persian/Arabic numerals, strips symbols, formats to 09XXXXXXXXX).
 */
export function normalizeIranianPhone(input: string): string | null {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let clean = input.trim();
  for (let i = 0; i < 10; i++) {
    clean = clean.replaceAll(persianDigits[i], String(i));
    clean = clean.replaceAll(arabicDigits[i], String(i));
  }
  clean = clean.replace(/[\s\-_()]/g, "");
  const match = clean.match(/^(\+98|0098|98|0)?(9\d{9})$/);
  if (match) {
    return `0${match[2]}`;
  }
  return null;
}

/**
 * Handles ongoing multi-step conversational DM form sessions in Redis (T020, T021, T022, T023).
 */
async function handleConversationalDmSession(
  instagramAccountId: string,
  senderId: string,
  messageText: string
): Promise<boolean> {
  const session = await getDmSession(instagramAccountId, senderId);
  if (!session || session.type !== "FORM_SUBMISSION") {
    return false;
  }

  const account = await prisma.instagramAccount.findFirst({
    where: { instagramId: instagramAccountId },
  });
  if (!account) return false;

  const context = await createInstagramContext(account, `session:${senderId}`);
  const currentField = session.fields[session.currentStepIndex];

  if (!currentField) {
    await clearDmSession(instagramAccountId, senderId);
    return false;
  }

  let formattedAnswer = messageText.trim();
  if (currentField.type === "phone") {
    const validPhone = normalizeIranianPhone(formattedAnswer);
    if (!validPhone) {
      await sendDirectMessage({
        context,
        instagramAccountId,
        userId: senderId,
        message: "شماره همراه وارد شده نامعتبر است. لطفاً شماره موبایل خود را به درستی (مثال: ۰۹۱۲۳۴۵۶۷۸۹) ارسال فرمایید:",
      });
      return true;
    }
    formattedAnswer = validPhone;
  }

  session.collectedAnswers[currentField.label || currentField.id] = formattedAnswer;
  session.currentStepIndex += 1;

  if (session.currentStepIndex < session.fields.length) {
    const nextField = session.fields[session.currentStepIndex];
    await setDmSession(instagramAccountId, senderId, session);
    await sendDirectMessage({
      context,
      instagramAccountId,
      userId: senderId,
      message: `لطفاً ${nextField.label} خود را ارسال نمایید:`,
    });
    return true;
  }

  // Form completed!
  const form = await prisma.dmForm.findUnique({
    where: { id: session.formId },
  });

  const phoneValue = Object.entries(session.collectedAnswers).find(
    ([key]) => key.includes("تلفن") || key.includes("موبایل") || key.includes("phone")
  )?.[1] || (currentField.type === "phone" ? formattedAnswer : undefined);

  if (form) {
    await prisma.dmFormSubmission.create({
      data: {
        formId: form.id,
        commenterId: senderId,
        data: session.collectedAnswers,
        phone: phoneValue,
      },
    });

    if (phoneValue) {
      await prisma.phonebookContact.upsert({
        where: {
          workspaceId_phone: {
            workspaceId: form.workspaceId,
            phone: phoneValue,
          },
        },
        create: {
          workspaceId: form.workspaceId,
          phone: phoneValue,
          name: session.collectedAnswers["نام"] || session.collectedAnswers["نام و نام خانوادگی"] || senderId,
          instagramUsername: senderId,
          tags: ["فرم دایرکت", form.title],
          source: "FORM",
        },
        update: {
          name: session.collectedAnswers["نام"] || session.collectedAnswers["نام و نام خانوادگی"] || undefined,
          instagramUsername: senderId,
          tags: { push: [form.title] },
        },
      });

      if (form.smsNotificationEnabled || form.smsTemplate) {
        const smsText = form.smsTemplate || `مخاطب گرامی، اطلاعات شما در فرم «${form.title}» با موفقیت دریافت و ثبت گردید.`;
        await sendSmsNotification({
          workspaceId: form.workspaceId,
          recipientPhone: phoneValue,
          messageText: smsText,
        });
      }
    }

    const completionMsg = form.completionMessage || "اطلاعات شما با موفقیت ثبت شد. متشکریم! 🙏";
    await sendDirectMessage({
      context,
      instagramAccountId,
      userId: senderId,
      message: completionMsg,
    });
  }

  await clearDmSession(instagramAccountId, senderId);
  return true;
}

/**
 * Matches keyword triggers for active lead capture forms in DM (T019).
 */
async function handleNewDmFormTrigger(
  instagramAccountId: string,
  senderId: string,
  messageText: string
): Promise<boolean> {
  const account = await prisma.instagramAccount.findFirst({
    where: { instagramId: instagramAccountId },
  });
  if (!account) return false;

  const normalizedText = messageText.trim().toLowerCase();

  const activeForms = await prisma.dmForm.findMany({
    where: {
      workspaceId: account.workspaceId,
      isActive: true,
    },
  });

  const matchedForm = activeForms.find(
    (f) => f.triggerKeyword.trim().toLowerCase() === normalizedText
  );

  if (!matchedForm) return false;

  const rawFields = matchedForm.fields as Array<{ id: string; label: string; type: "text" | "phone"; required: boolean }>;
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    const context = await createInstagramContext(account, `form:${senderId}`);
    await sendDirectMessage({
      context,
      instagramAccountId,
      userId: senderId,
      message: matchedForm.completionMessage || "درخواست شما ثبت شد.",
    });
    return true;
  }

  const newSession: DmSessionPayload = {
    version: 1,
    type: "FORM_SUBMISSION",
    formId: matchedForm.id,
    fields: rawFields,
    currentStepIndex: 0,
    collectedAnswers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDmSession(instagramAccountId, senderId, newSession, 1800);

  const context = await createInstagramContext(account, `form_init:${senderId}`);
  const firstField = rawFields[0];
  await sendDirectMessage({
    context,
    instagramAccountId,
    userId: senderId,
    message: `${matchedForm.title}\n\nلطفاً ${firstField.label} خود را ارسال نمایید:`,
  });

  return true;
}

/**
 * Process story mention and story reply events (T026, T027).
 */
async function processStoryMention(job: Job<ProcessStoryMentionJob>): Promise<void> {
  const { instagramAccountId, senderId, messageId } = job.data;
  const redis = getRedisConnection();

  // T027: Gating with Redis 24h key: `rate:story:${acct}:${user}`
  const rateLimitKey = `rate:story:${instagramAccountId}:${senderId}`;
  const alreadySent = await redis.get(rateLimitKey);
  if (alreadySent) {
    console.log(`[Story Mention] User ${senderId} already received a story mention gift in the last 24h.`);
    return;
  }

  const automation = await prisma.automation.findFirst({
    where: {
      instagramAccount: { instagramId: instagramAccountId },
      storyMentionEnabled: true,
      isActive: true,
    },
    include: {
      instagramAccount: true,
    },
  });

  if (!automation) {
    console.log(`[Story Mention] No active story mention automation found for account ${instagramAccountId}`);
    return;
  }

  const context = await createInstagramContext(
    automation.instagramAccount,
    `story:${messageId}`
  );

  const replyText =
    automation.storyMentionMessage?.trim() ||
    "ممنون از اینکه پیج ما رو در استوریتون منشن کردید! این هم کد تخفیف اختصاصی شما به پاس همراهیتون: GIFT10 🎁";

  try {
    await sendDirectMessage({
      context,
      instagramAccountId,
      userId: senderId,
      message: replyText,
    });

    // Set 24h rate limit flag
    await redis.set(rateLimitKey, "1", "EX", 86400);

    // Record DmLog
    await prisma.dmLog.create({
      data: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId: senderId,
        commentText: "STORY_MENTION",
        commentId: `story:${messageId}`,
        matchedKeyword: "story_mention",
        status: "SENT",
        dmSentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Story Mention Error]:", error);
    await prisma.dmLog.create({
      data: {
        workspaceId: automation.workspaceId,
        automationId: automation.id,
        instagramAccountId: automation.instagramAccountId,
        commenterId: senderId,
        commentText: "STORY_MENTION",
        commentId: `story:${messageId}`,
        matchedKeyword: "story_mention",
        status: "FAILED",
        errorMessage: formatError(error),
      },
    });
    throw error;
  }
}

/**
 * Handle interactive product showcase carousel trigger via keyword matching (T035).
 */
async function handleProductShowcaseTrigger(
  instagramAccountId: string,
  senderId: string,
  messageText: string,
  messageId: string
): Promise<boolean> {
  const account = await prisma.instagramAccount.findUnique({
    where: { instagramId: instagramAccountId },
    include: { workspace: true },
  });

  if (!account || !hasInstagramCredentials(account)) {
    return false;
  }

  const showcases = await prisma.productShowcase.findMany({
    where: {
      workspaceId: account.workspaceId,
      isActive: true,
    },
  });

  if (showcases.length === 0) return false;

  const normalized = messageText.trim().toLowerCase();
  const matchedShowcase = showcases.find((sc) => {
    const kw = sc.triggerKeyword.trim().toLowerCase();
    return normalized.includes(kw);
  });

  if (!matchedShowcase) return false;

  const dedupeId = `showcase:${messageId}`;
  const existingLog = await prisma.dmLog.findFirst({
    where: {
      commentId: dedupeId,
    },
  });
  if (existingLog) return true;

  // Check quota
  const usage = await reserveWorkspaceDMSend(account.workspaceId);
  if (!usage.allowed) {
    console.warn(`[Product Showcase] Workspace ${account.workspaceId} reached DM limit.`);
    return true;
  }

  interface ShowcaseItem {
    id?: string;
    name: string;
    priceTomans?: number;
    imageUrl?: string;
    buyUrl?: string;
    description?: string;
  }

  const rawItems = Array.isArray(matchedShowcase.items)
    ? (matchedShowcase.items as unknown as ShowcaseItem[])
    : [];

  if (rawItems.length === 0) return false;

  const defaultAuto = await prisma.automation.findFirst({
    where: { instagramAccountId: account.id },
    select: { id: true },
  });

  // Build Tracked Links for items that have buyUrl
  const carouselElements: CarouselElement[] = [];

  for (const item of rawItems.slice(0, 10)) {
    let finalUrl = item.buyUrl;
    if (finalUrl && defaultAuto) {
      try {
        const slug = `p_${Math.random().toString(36).slice(2, 8)}`;
        const tracked = await prisma.trackedLink.create({
          data: {
            workspaceId: account.workspaceId,
            automationId: defaultAuto.id,
            destinationUrl: finalUrl,
            slug,
            label: item.name.slice(0, 30),
          },
        });
        finalUrl = buildTrackedUrl(tracked.slug);
      } catch {
        // Fallback to direct URL if slug conflict
      }
    }

    const priceText = item.priceTomans
      ? `${item.priceTomans.toLocaleString("fa-IR")} تومان`
      : "";
    const subtitle = [priceText, item.description].filter(Boolean).join(" - ");

    carouselElements.push({
      title: item.name.slice(0, 80),
      subtitle: subtitle ? subtitle.slice(0, 80) : undefined,
      imageUrl: item.imageUrl,
      itemUrl: finalUrl,
      buttons: finalUrl
        ? [
            {
              title: "خرید آنلاین 🛒",
              url: finalUrl,
            },
          ]
        : undefined,
    });
  }

  try {
    const context = await createInstagramContext(account, `showcase:${messageId}`);
    if (context.provider === "META") {
      await sendCarouselMessage(
        context.accessToken,
        instagramAccountId,
        senderId,
        carouselElements
      );
    } else {
      const summaryText =
        `🛒 ویترین محصولات ${matchedShowcase.title}:\n\n` +
        rawItems
          .slice(0, 3)
          .map((it) => `🔹 ${it.name}: ${it.buyUrl ?? ""}`)
          .join("\n");
      await sendDirectMessage({
        context,
        instagramAccountId,
        userId: senderId,
        message: summaryText,
      });
    }

    const defaultAuto = await prisma.automation.findFirst({
      where: { instagramAccountId: account.id },
      select: { id: true },
    });

    if (defaultAuto) {
      await prisma.dmLog.create({
        data: {
          workspaceId: account.workspaceId,
          automationId: defaultAuto.id,
          instagramAccountId: account.id,
          commenterId: senderId,
          commentText: messageText,
          commentId: dedupeId,
          matchedKeyword: matchedShowcase.triggerKeyword,
          status: "SENT",
          dmSentAt: new Date(),
        },
      });
    }
    return true;
  } catch (error) {
    console.error("[Product Showcase Send Error]:", error);
    await releaseWorkspaceDMReservation(account.workspaceId, usage.periodStart);
    return false;
  }
}

/**
 * Reply to an inbound DM whose text matches a campaign's keywords.
 *
 * The user has messaged us, so the conversation is already open: this path
 * skips the opening DM (which exists to work around private-reply limits from
 * comments) and delivers the reveal directly, honouring the follow gate.
 * Dedup is per inbound message id, so each message triggers at most one reply.
 */
async function processMessage(job: Job<ProcessMessageJob>): Promise<void> {
  const { instagramAccountId, messageId, messageText, senderId } = job.data;

  // Publish to Redis Pub/Sub for real-time inbox stream (T037)
  try {
    const account = await prisma.instagramAccount.findUnique({
      where: { instagramId: instagramAccountId },
      select: { workspaceId: true },
    });
    if (account?.workspaceId) {
      const redis = getRedisConnection();
      await redis.publish(
        `pubsub:inbox:${account.workspaceId}`,
        JSON.stringify({
          type: "NEW_MESSAGE",
          conversationId: senderId,
          senderId,
          messageId,
          text: messageText,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (pubSubError) {
    console.warn("[DM Worker] Redis Pub/Sub publish failed:", pubSubError);
  }

  // 1. Check if user is in an active conversational DM session (Form Submission)
  const isSessionHandled = await handleConversationalDmSession(
    instagramAccountId,
    senderId,
    messageText
  );
  if (isSessionHandled) {
    return;
  }

  // 2. Check if message triggers a new DmForm
  const isFormTriggered = await handleNewDmFormTrigger(
    instagramAccountId,
    senderId,
    messageText
  );
  if (isFormTriggered) {
    return;
  }

  // 3. Check if message triggers a Product Showcase Carousel (T035)
  const isShowcaseTriggered = await handleProductShowcaseTrigger(
    instagramAccountId,
    senderId,
    messageText,
    messageId
  );
  if (isShowcaseTriggered) {
    return;
  }

  const automations = await prisma.automation.findMany({
    where: {
      ...connectionScope(job.data),
      dmTriggerEnabled: true,
      isActive: true,
      instagramAccount: { instagramId: instagramAccountId },
    },
    include: {
      instagramAccount: true,
      workspace: true,
      trackedLinks: {
        select: { slug: true, label: true, destinationUrl: true },
        orderBy: TRACKED_LINK_ORDER,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const dedupeId = `dm:${messageId}`;

  let matchedAnyAutomation = false;

  for (const automation of automations) {
    const matchResult = automation.matchAnyWord
      ? { matched: true, matchedKeyword: null }
      : matchKeywords(
          messageText,
          automation.keywords,
          automation.wholeWordMatch
        );

    if (!matchResult.matched) continue;
    matchedAnyAutomation = true;

    const existingLog = await prisma.dmLog.findUnique({
      where: {
        automationId_commentId: {
          automationId: automation.id,
          commentId: dedupeId,
        },
      },
    });

    // Already replied to this message (or deliberately skipped it) — a retry
    // of the job must not send a second DM.
    if (
      existingLog?.status === "SENT" ||
      existingLog?.status === "SKIPPED_PLAN_LIMIT" ||
      existingLog?.dmDeliveryUnconfirmed
    ) {
      continue;
    }

    const logBase = {
      workspaceId: automation.workspaceId,
      automationId: automation.id,
      instagramAccountId: automation.instagramAccountId,
      commenterId: senderId,
      commentText: messageText,
      commentId: dedupeId,
      matchedKeyword: matchResult.matchedKeyword,
    };

    if (!hasInstagramCredentials(automation.instagramAccount)) {
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId: dedupeId,
          },
        },
        create: {
          ...logBase,
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
        update: {
          status: "FAILED",
          errorMessage: "No Instagram access token available",
        },
      });
      continue;
    }

    let accessToken: InstagramContext;
    try {
      accessToken = await createInstagramContext(
        automation.instagramAccount,
        `${job.id}:${automation.id}`
      );
    } catch {
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId: dedupeId,
          },
        },
        create: {
          ...logBase,
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
        update: {
          status: "FAILED",
          errorMessage: "Failed to decrypt Instagram access token",
        },
      });
      continue;
    }

    // Reuse a name captured on an earlier interaction so {username} still
    // renders — the messages webhook carries only the sender's IGSID.
    const priorLog = await prisma.dmLog.findFirst({
      where: { automationId: automation.id, commenterId: senderId },
      select: { commenterName: true },
    });
    const commenterName = priorLog?.commenterName ?? null;

    // Follow gate: anyone not confirmed as a follower gets the prompt instead of
    // the link, with the same `followcheck:` button that re-verifies on tap.
    // `null` (unverifiable) prompts too — this is first contact, exactly like a
    // comment, so it follows processComment's fail-closed rule rather than the
    // postback path's fail-open one. Fail-open is only safe after a tap, where
    // the user has already claimed to follow; here it would hand the link to
    // anyone whose status the API happens not to resolve.
    let sendFollowPrompt = false;
    if (automation.requireFollow) {
      const follows = await getUserFollowStatus({
        context: accessToken,
        recipientId: senderId,
      });
      sendFollowPrompt =
        accessToken.provider === "ZERNIO"
          ? follows === false
          : follows !== true;
    }

    const usage = await reserveWorkspaceDMSend(automation.workspaceId);
    if (!usage.allowed) {
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId: dedupeId,
          },
        },
        create: {
          ...logBase,
          status: "SKIPPED_PLAN_LIMIT",
          errorMessage: `Monthly DM limit reached (${usage.limit})`,
        },
        update: {
          status: "SKIPPED_PLAN_LIMIT",
          errorMessage: `Monthly DM limit reached (${usage.limit})`,
        },
      });
      continue;
    }

    try {
      if (sendFollowPrompt) {
        const promptText = renderMessageWithoutLink({
          message:
            automation.followPromptMessage ||
            "Almost there! Follow me and tap the button below to grab your link 💛",
          commenterName,
        });
        await sendDirectMessageWithButton({
          context: accessToken,
          instagramAccountId: automation.instagramAccount.instagramId,
          userId: senderId,
          text: promptText,
          buttonTitle: automation.followPromptButtonLabel || "I'm following ✅",
          payload: `followcheck:${automation.id}`,
        });
      } else {
        await sendRevealDirectMessage({
          accessToken: accessToken,
          automation: automation,
          userId: senderId,
          commenterName: commenterName,
          context: "message trigger",
        });

        // The link has been delivered, so the appreciation follow-up applies
        // here exactly as it does after a button tap. Not scheduled behind the
        // follow prompt — no link went out yet in that branch.
        if (automation.followUpEnabled && automation.followUpMessage?.trim()) {
          await getDMQueue().add(
            FOLLOWUP_JOB_NAME,
            {
              instagramAccountId: automation.instagramAccount.instagramId,
              accountConnectionId: automation.instagramAccountId,
              userId: senderId,
              automationId: automation.id,
              commenterName,
            },
            {
              delay: Math.max(0, automation.followUpDelayMinutes ?? 0) * 60_000,
              jobId: `followup_${automation.id}_${senderId}`,
            }
          );
        }
      }

      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId: dedupeId,
          },
        },
        create: {
          ...logBase,
          commenterName,
          status: "SENT",
          dmSentAt: new Date(),
        },
        update: {
          status: "SENT",
          dmSentAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      await releaseWorkspaceDMReservation(
        automation.workspaceId,
        usage.periodStart
      );
      await prisma.dmLog.upsert({
        where: {
          automationId_commentId: {
            automationId: automation.id,
            commentId: dedupeId,
          },
        },
        create: {
          ...logBase,
          commenterName,
          status: "FAILED",
          attempts: job.attemptsMade + 1,
          errorMessage: formatError(error),
          dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
        },
        update: {
          status: "FAILED",
          attempts: job.attemptsMade + 1,
          errorMessage: formatError(error),
          dmDeliveryUnconfirmed: error instanceof ZernioDeliveryUnconfirmedError,
        },
      });
      throw error;
    }
  }

  // 4. If no campaign or showcase matched, route to AI Sales Agent (T032, T033)
  if (!matchedAnyAutomation) {
    const account = await prisma.instagramAccount.findUnique({
      where: { instagramId: instagramAccountId },
      include: { workspace: true },
    });

    if (account && hasInstagramCredentials(account)) {
      const docsCount = await prisma.aiKnowledgeDoc.count({
        where: { workspaceId: account.workspaceId, isActive: true },
      });

      if (docsCount > 0) {
        const dedupeId = `ai:${messageId}`;
        const existingLog = await prisma.dmLog.findFirst({
          where: { commentId: dedupeId },
        });

        if (!existingLog) {
          const usage = await reserveWorkspaceDMSend(account.workspaceId);
          if (usage.allowed) {
            try {
              const aiReply = await generateAiReply(
                account.workspaceId,
                messageText
              );
              const context = await createInstagramContext(
                account,
                `ai:${messageId}`
              );

              await sendDirectMessage({
                context,
                instagramAccountId,
                userId: senderId,
                message: aiReply.answer,
              });

              const defaultAuto = await prisma.automation.findFirst({
                where: { instagramAccountId: account.id },
                select: { id: true },
              });

              if (defaultAuto) {
                await prisma.dmLog.create({
                  data: {
                    workspaceId: account.workspaceId,
                    automationId: defaultAuto.id,
                    instagramAccountId: account.id,
                    commenterId: senderId,
                    commentText: messageText,
                    commentId: dedupeId,
                    matchedKeyword: aiReply.needsHumanIntervention
                      ? "AI_HANDOFF"
                      : "AI_AGENT",
                    status: "SENT",
                    dmSentAt: new Date(),
                  },
                });
              }

              // T033: Record operational event for human intervention needed
              if (aiReply.needsHumanIntervention) {
                await prisma.operationalEvent.create({
                  data: {
                    workspaceId: account.workspaceId,
                    source: "WORKER",
                    level: "WARNING",
                    message: `کاربر اینستاگرام (${senderId}) در دایرکت نیاز به مداخله ادمین دارد: "${messageText.slice(0, 100)}"`,
                    payload: {
                      senderId,
                      messageText,
                      usedKnowledgeDocs: aiReply.usedKnowledgeDocs,
                    },
                  },
                });
              }
            } catch (aiError) {
              console.error("[AI Agent Processing Error]:", aiError);
              await releaseWorkspaceDMReservation(
                account.workspaceId,
                usage.periodStart
              );
            }
          }
        }
      }
    }
  }
}

async function dispatchJob(job: Job<DmQueueJob>): Promise<void> {
  if (job.name === POSTBACK_JOB_NAME) {
    return processPostback(job as Job<ProcessPostbackJob>);
  }
  if (job.name === FOLLOWUP_JOB_NAME) {
    return processFollowUp(job as Job<ProcessFollowUpJob>);
  }
  if (job.name === MESSAGE_JOB_NAME) {
    return processMessage(job as Job<ProcessMessageJob>);
  }
  if (job.name === STORY_MENTION_JOB_NAME) {
    return processStoryMention(job as Job<ProcessStoryMentionJob>);
  }
  return processComment(job as Job<ProcessCommentJob>);
}

async function processJob(job: Job<DmQueueJob>): Promise<void> {
  try {
    await dispatchJob(job);
  } catch (error) {
    if (error instanceof ZernioDeliveryUnconfirmedError)
      throw new UnrecoverableError(error.message);
    throw error;
  }
}

async function recordWorkerFailure(
  job: Job<DmQueueJob> | undefined,
  error: Error
) {
  try {
    const instagramAccountId = job?.data.instagramAccountId;
    const commentId =
      job && "commentId" in job.data ? job.data.commentId : null;
    const account = instagramAccountId
      ? await prisma.instagramAccount.findUnique({
          where: { instagramId: instagramAccountId },
          select: { workspaceId: true },
        })
      : null;

    await prisma.operationalEvent.create({
      data: {
        workspaceId: account?.workspaceId ?? null,
        source: "WORKER",
        level: "ERROR",
        message: `DM worker job ${job?.id ?? "unknown"} failed: ${error.message}`,
        payload: {
          jobId: job?.id ?? null,
          attemptsMade: job?.attemptsMade ?? null,
          instagramAccountId: instagramAccountId ?? null,
          commentId,
        },
      },
    });

    await recordWorkerAlert({
      level: "error",
      message: error.message,
      jobId: job?.id,
      instagramAccountId,
      commentId: commentId ?? undefined,
    });
  } catch (recordError) {
    console.error(
      "[DM Worker] Failed to record worker failure:",
      formatError(recordError)
    );
  }
}

export function createDMWorker(): Worker<DmQueueJob> {
  const worker = new Worker<DmQueueJob>("dm-processing", processJob, {
    connection: getRedisConnection(),
    concurrency: 5,
    settings: {
      backoffStrategy: (attemptsMade: number) =>
        BACKOFF_DELAYS[Math.min(attemptsMade - 1, BACKOFF_DELAYS.length - 1)],
    },
  });

  worker.on("completed", (job) => {
    console.log(`[DM Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[DM Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
    void recordWorkerFailure(job, err);
  });

  worker.on("error", (err) => {
    console.error("[DM Worker] Worker error:", err.message);
    void prisma.operationalEvent
      .create({
        data: {
          source: "WORKER",
          level: "ERROR",
          message: `DM worker process error: ${err.message}`,
          payload: { name: err.name },
        },
      })
      .catch((recordError) => {
        console.error(
          "[DM Worker] Failed to record worker process error:",
          formatError(recordError)
        );
      });
  });

  return worker;
}
