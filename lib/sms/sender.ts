import { prisma } from "@/lib/db/client";

export interface SendSmsParams {
  workspaceId: string;
  recipientPhone: string;
  messageText: string;
  userId?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status: "SENT" | "FAILED";
  providerResponse?: string;
  error?: string;
}

/**
 * Sends an SMS message using the configured provider for the workspace (or falls back to simulator).
 */
export async function sendSmsNotification(
  params: SendSmsParams
): Promise<SendSmsResult> {
  const { workspaceId, recipientPhone, messageText, userId } = params;

  if (!recipientPhone || !messageText) {
    return {
      success: false,
      status: "FAILED",
      error: "شماره گیرنده یا متن پیامک خالی است.",
    };
  }

  // 1. Fetch SMS configuration
  const config = await prisma.smsConfiguration.findUnique({
    where: { workspaceId },
  });

  const provider = config?.provider ?? "SIMULATOR";
  const apiKey = config?.apiKey?.trim() ?? "";
  const senderLine = config?.senderLine?.trim() ?? "10008585";
  const isActive = config?.isActive ?? true;

  if (!isActive) {
    return {
      success: false,
      status: "FAILED",
      error: "سامانه پیامک این ورک‌اسپیس غیرفعال است.",
    };
  }

  let status: "SENT" | "FAILED" = "SENT";
  let providerResponse = "";
  let messageId = `msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    if (provider === "KAVENEGAR" && apiKey) {
      const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
      const body = new URLSearchParams({
        receptor: recipientPhone,
        sender: senderLine,
        message: messageText,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(8000),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.return?.status === 200) {
        status = "SENT";
        messageId = String(json.entries?.[0]?.messageid ?? messageId);
        providerResponse = JSON.stringify(json);
      } else {
        status = "FAILED";
        providerResponse = JSON.stringify(json ?? { status: res.status });
      }
    } else if (provider === "FARAZ_SMS" && apiKey) {
      const url = "https://api2.ippanel.com/api/v1/sms/send/webservice/single";
      const body = {
        recipient: [recipientPhone],
        sender: senderLine,
        message: messageText,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });

      const json = await res.json().catch(() => null);
      if (res.ok) {
        status = "SENT";
        providerResponse = JSON.stringify(json);
      } else {
        status = "FAILED";
        providerResponse = JSON.stringify(json ?? { status: res.status });
      }
    } else {
      // SIMULATOR or unconfigured API key
      status = "SENT";
      providerResponse = `SIMULATOR_SUCCESS: msg_${Date.now()}`;
    }
  } catch (err) {
    status = "FAILED";
    providerResponse = err instanceof Error ? err.message : "Network/Timeout error";
  }

  // 2. Record SMS log in database
  try {
    await prisma.smsLog.create({
      data: {
        workspaceId,
        recipientPhone,
        messageText,
        status,
        providerResponse,
      },
    });

    // 3. Increment quota if successful and userId provided
    if (status === "SENT" && userId) {
      await prisma.subscription.updateMany({
        where: { userId },
        data: { smsUsed: { increment: 1 } },
      });
    }
  } catch (dbErr) {
    console.error("[SmsSender] Failed to log SMS record in DB:", dbErr);
  }

  return {
    success: status === "SENT",
    status,
    messageId,
    providerResponse,
  };
}
