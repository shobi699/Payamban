/**
 * Zibal Payment Gateway Driver (REST API)
 * Handles payment initiation and transaction verification for Zibal.
 */

import { prisma } from "@/lib/db/client";

export interface ZibalRequestOptions {
  amountTomans: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
  merchantId?: string;
  orderId?: string;
}

export interface ZibalRequestResult {
  success: boolean;
  trackId?: number;
  paymentUrl?: string;
  result?: number;
  errorMessage?: string;
}

export interface ZibalVerifyOptions {
  trackId: number | string;
  merchantId?: string;
}

export interface ZibalVerifyResult {
  success: boolean;
  refNumber?: string;
  result?: number;
  paidAt?: string;
  cardNumber?: string;
  amountTomans?: number;
  errorMessage?: string;
}

const ZIBAL_RESULT_MESSAGES: Record<number, string> = {
  100: "با موفقیت تایید شد.",
  102: "مرچنت یافت نشد یا غیرفعال است.",
  103: "مرچنت غیرفعال است.",
  104: "نامعتبر بودن مرچنت.",
  201: "قبلا تایید شده است.",
  105: "مبلغ بایستی بیشتر از ۱,۰۰۰ ریال باشد.",
  106: "آدرس بازگشت (callbackUrl) نامعتبر است.",
  113: "مبلغ تراکنش بیش از سقف مجاز درگاه است.",
};

/**
 * Loads Zibal merchant from PlatformSetting with fallback.
 */
export async function getZibalConfig(): Promise<{ merchantId: string }> {
  let merchantId = process.env.ZIBAL_MERCHANT_ID || "zibal"; // "zibal" is the official mock/sandbox key
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "payment.zibal_merchant" },
    });
    if (setting?.value) {
      merchantId = setting.value;
    }
  } catch (err) {
    console.warn("[Zibal Config] Error loading merchant from database:", err);
  }
  return { merchantId };
}

/**
 * Initiates payment with Zibal API.
 */
export async function requestZibalPayment(
  options: ZibalRequestOptions
): Promise<ZibalRequestResult> {
  const config = await getZibalConfig();
  const merchant = options.merchantId || config.merchantId;
  const amountRials = options.amountTomans * 10;

  // Handle local demo/mock key
  if (merchant === "zibal" || merchant.startsWith("demo_")) {
    const mockTrackId = Math.floor(10000000 + Math.random() * 90000000);
    const mockUrl = `${options.callbackUrl}${
      options.callbackUrl.includes("?") ? "&" : "?"
    }trackId=${mockTrackId}&success=1&status=2`;
    return {
      success: true,
      trackId: mockTrackId,
      paymentUrl: mockUrl,
      result: 100,
    };
  }

  try {
    const res = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        amount: amountRials,
        callbackUrl: options.callbackUrl,
        description: options.description,
        mobile: options.mobile,
        orderId: options.orderId,
      }),
      signal: AbortSignal.timeout(10000),
    });

    interface ZibalApiRequestResponse {
      trackId?: number;
      result?: number;
      message?: string;
    }

    const data = (await res.json()) as ZibalApiRequestResponse;

    if (data.result === 100 && data.trackId) {
      return {
        success: true,
        trackId: data.trackId,
        paymentUrl: `https://gateway.zibal.ir/start/${data.trackId}`,
        result: data.result,
      };
    }

    const errorMsg =
      (data.result && ZIBAL_RESULT_MESSAGES[data.result]) ||
      data.message ||
      "خطا در برقراری ارتباط با درگاه زیبال";

    return {
      success: false,
      result: data.result,
      errorMessage: errorMsg,
    };
  } catch (error) {
    console.error("[Zibal Request Error]:", error);
    return {
      success: false,
      errorMessage: "خطای شبکه در اتصال به درگاه پرداخت زیبال.",
    };
  }
}

/**
 * Verifies transaction with Zibal API.
 */
export async function verifyZibalPayment(
  options: ZibalVerifyOptions
): Promise<ZibalVerifyResult> {
  const config = await getZibalConfig();
  const merchant = options.merchantId || config.merchantId;
  const trackIdNumber = Number(options.trackId);

  // Handle local mock/demo
  if (merchant === "zibal" || merchant.startsWith("demo_")) {
    return {
      success: true,
      refNumber: `ZIBAL_REF_${Date.now()}`,
      result: 100,
      paidAt: new Date().toISOString(),
      cardNumber: "603799******1122",
    };
  }

  try {
    const res = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        trackId: trackIdNumber,
      }),
      signal: AbortSignal.timeout(10000),
    });

    interface ZibalVerifyApiResponse {
      paidAt?: string;
      amount?: number;
      result?: number;
      status?: number;
      refNumber?: number | string;
      description?: string;
      cardNumber?: string;
      message?: string;
    }

    const data = (await res.json()) as ZibalVerifyApiResponse;

    if (data.result === 100 || data.result === 201) {
      return {
        success: true,
        refNumber: String(data.refNumber ?? trackIdNumber),
        result: data.result,
        paidAt: data.paidAt,
        cardNumber: data.cardNumber,
        amountTomans: data.amount ? Math.floor(data.amount / 10) : undefined,
      };
    }

    const errorMsg =
      (data.result && ZIBAL_RESULT_MESSAGES[data.result]) ||
      data.message ||
      "تراکنش توسط درگاه زیبال تایید نشد.";

    return {
      success: false,
      result: data.result,
      errorMessage: errorMsg,
    };
  } catch (error) {
    console.error("[Zibal Verify Error]:", error);
    return {
      success: false,
      errorMessage: "خطای ارتباط با سرور زیبال در هنگام اعتبارسنجی تراکنش.",
    };
  }
}
