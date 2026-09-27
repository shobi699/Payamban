import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
  });

  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }

  const channel = `pubsub:inbox:${workspace.id}`;
  const subscriber = new Redis(process.env.REDIS_URL!, {
    lazyConnect: false,
  });

  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(event: string, data: unknown) {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      }

      // Initial connection greeting
      sendEvent("connected", { workspaceId: workspace.id, time: Date.now() });

      // Subscribe to Redis Pub/Sub channel
      await subscriber.subscribe(channel);
      subscriber.on("message", (chan, message) => {
        if (chan === channel) {
          try {
            const parsed = JSON.parse(message);
            sendEvent("new-message", parsed);
          } catch {
            sendEvent("new-message", { raw: message });
          }
        }
      });

      // Keep connection alive with periodic heartbeat
      heartbeatInterval = setInterval(() => {
        sendEvent("heartbeat", { time: Date.now() });
      }, 25_000);

      // Clean cleanup on abort
      req.signal.addEventListener("abort", async () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        try {
          await subscriber.unsubscribe(channel);
          subscriber.quit();
        } catch {}
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      try {
        subscriber.unsubscribe(channel);
        subscriber.quit();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
