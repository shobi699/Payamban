import "dotenv/config";
import { createDMWorker } from "@/lib/queue/dm-worker";
import { recordWorkerHeartbeat } from "@/lib/ops/worker-health";
import { reconcileComments } from "@/lib/polling/comment-reconciler";
import { attachPendingNextReels } from "@/lib/automation/attach-next-reel";
import { refreshExpiringTokens } from "@/lib/queue/token-refresher";
import os from "node:os";

const worker = createDMWorker();
const startedAt = new Date().toISOString();
const HEARTBEAT_INTERVAL_MS = 30_000;
// Polling safety net for comments that webhooks miss. Runs in the worker because
// it must fire every few minutes and Vercel's free crons only run once a day.
const POLL_INTERVAL_MS = Number(
  process.env.COMMENT_POLL_INTERVAL_MS ?? 5 * 60_000
);
// Token refresh check interval: twice daily (every 12 hours)
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 60_000;

let isShuttingDown = false;
let heartbeatTimeoutId: NodeJS.Timeout | null = null;
let pollTimeoutId: NodeJS.Timeout | null = null;
let tokenRefreshTimeoutId: NodeJS.Timeout | null = null;

let isPolling = false;
let isRefreshingTokens = false;

console.log("[DM Worker] Started in resilient mode");

async function runHeartbeatLoop() {
  if (isShuttingDown) return;
  try {
    await recordWorkerHeartbeat({
      pid: process.pid,
      hostname: os.hostname(),
      startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Heartbeat failed:", message);
  } finally {
    if (!isShuttingDown) {
      heartbeatTimeoutId = setTimeout(() => void runHeartbeatLoop(), HEARTBEAT_INTERVAL_MS);
    }
  }
}

async function runPollLoop() {
  if (isShuttingDown) return;
  if (isPolling) return;
  isPolling = true;
  try {
    const attached = await attachPendingNextReels();
    if (attached.bound > 0 || attached.failedAccounts > 0) {
      console.log("[DM Worker] Next-reel attachment:", attached);
    }
    await reconcileComments();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Comment reconciliation failed:", message);
  } finally {
    isPolling = false;
    if (!isShuttingDown) {
      pollTimeoutId = setTimeout(() => void runPollLoop(), POLL_INTERVAL_MS);
    }
  }
}

async function runTokenRefreshLoop() {
  if (isShuttingDown) return;
  if (isRefreshingTokens) return;
  isRefreshingTokens = true;
  try {
    console.log("[DM Worker] Running scheduled token refresh check...");
    const result = await refreshExpiringTokens();
    if (result.totalProcessed > 0) {
      console.log("[DM Worker] Token refresh finished:", result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Token refresh failed:", message);
  } finally {
    isRefreshingTokens = false;
    if (!isShuttingDown) {
      tokenRefreshTimeoutId = setTimeout(() => void runTokenRefreshLoop(), TOKEN_REFRESH_INTERVAL_MS);
    }
  }
}

// Initial execution
void runHeartbeatLoop();
pollTimeoutId = setTimeout(() => void runPollLoop(), 10_000);
tokenRefreshTimeoutId = setTimeout(() => void runTokenRefreshLoop(), 15_000);

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[DM Worker] ${signal} received, closing worker gracefully`);

  if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
  if (pollTimeoutId) clearTimeout(pollTimeoutId);
  if (tokenRefreshTimeoutId) clearTimeout(tokenRefreshTimeoutId);

  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
