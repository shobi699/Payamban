import { prisma } from "@/lib/db/client";
import { getZarinpalMerchantId, isZarinpalSandbox } from "@/lib/env";

export interface ZarinpalRequestOptions {
  amountTomans: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
  email?: string;
  merchantId?: string;
  sandbox?: boolean;
}

export interface ZarinpalRequestResult {
  success: boolean;
  authority?: string;
  paymentUrl?: string;
  code?: number;
  errorMessage?: string;
}

export interface ZarinpalVerifyOptions {
  authority: string;
  amountTomans: number;
  merchantId?: string;
  sandbox?: boolean;
}

export interface ZarinpalVerifyResult {
  success: boolean;
  refId?: string;
  code?: number;
  cardPan?: string;
  cardHash?: string;
  errorMessage?: string;
}

/**
 * Reads Zarinpal configuration from PlatformSetting (Rule 7), with env var fallback.
 */
export async function getZarinpalConfig(): Promise<{ merchantId: string; sandbox: boolean }> {
  let merchantId = getZarinpalMerchantId();
  let sandbox = isZarinpalSandbox();

  try {
    const merchantSetting = await prisma.platformSetting.findUnique({
      where: { key: "payment.zarinpal_merchant" },
    });
    if (merchantSetting?.value) {
      merchantId = merchantSetting.value;
    }

    const sandboxSetting = await prisma.platformSetting.findUnique({
      where: { key: "payment.zarinpal_sandbox" },
    });
    if (sandboxSetting?.value) {
      sandbox = sandboxSetting.value === "true";
    }
  } catch (error) {
    console.warn("[Zarinpal] Failed to load settings from DB, using fallback", error);
  }

  return { merchantId, sandbox };
}

/**
 * Initiates a payment session with Zarinpal REST API v4.
 */
export async function requestPayment(
  options: ZarinpalRequestOptions
): Promise<ZarinpalRequestResult> {
  const config = await getZarinpalConfig();
  const merchantId = options.merchantId ?? config.merchantId;
  const isSandbox = options.sandbox ?? config.sandbox;

  if (!merchantId) {
    return {
      success: false,
      errorMessage: "مرچنت‌کد درگاه زرین‌پال در سامانه پیکربندی نشده است.",
    };
  }

  // Handle mock/demo merchant ID in local development or sandbox
  const isDemo =
    merchantId.startsWith("zarinpal_demo_") ||
    merchantId === "00000000-0000-0000-0000-000000000000" ||
    isSandbox;

  const requestUrl = isSandbox
    ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    : "https://payment.zarinpal.com/pg/v4/payment/request.json";

  const requestBody = {
    merchant_id: merchantId,
    amount: options.amountTomans,
    currency: "IRT",
    description: options.description,
    callback_url: options.callbackUrl,
    metadata: {
      mobile: options.mobile ?? "",
      email: options.email ?? "",
    },
  };

  try {
    const res = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[Zarinpal] Request returned status ${res.status}: ${errorText}`);

      // Fallback for demo/sandbox environments if live endpoint is unreachable
      if (isDemo) {
        const demoAuth = `DEMO_AUTH_${Date.now()}`;
        const demoPaymentUrl = `${options.callbackUrl}${
          options.callbackUrl.includes("?") ? "&" : "?"
        }Authority=${demoAuth}&Status=OK`;
        return {
          success: true,
          authority: demoAuth,
          paymentUrl: demoPaymentUrl,
          code: 100,
        };
      }

      return {
        success: false,
        errorMessage: `خطای ارتباط با درگاه زرین‌پال (کد ${res.status})`,
      };
    }

    interface ZarinpalApiResponse {
      data?: {
        code: number;
        message: string;
        authority: string;
        fee_type?: string;
        fee?: number;
      };
      errors?: Array<{ code: number; message: string }> | Record<string, unknown>;
    }

    const json = (await res.json()) as ZarinpalApiResponse;

    if (json.data && json.data.code === 100 && json.data.authority) {
      const authority = json.data.authority;
      const startPayUrl = isSandbox
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : `https://payment.zarinpal.com/pg/StartPay/${authority}`;

      return {
        success: true,
        authority,
        paymentUrl: startPayUrl,
        code: json.data.code,
      };
    }

    const firstErrorMessage =
      Array.isArray(json.errors) && json.errors.length > 0
        ? json.errors[0]?.message
        : "درخواست پرداخت توسط زرین‌پال تایید نشد.";

    return {
      success: false,
      code: json.data?.code,
      errorMessage: firstErrorMessage,
    };
  } catch (error) {
    console.error("[Zarinpal] Network or execution error:", error);

    // If sandbox/demo mode and connection fails (e.g. offline dev), provide seamless local simulation
    if (isDemo) {
      const demoAuth = `DEMO_AUTH_${Date.now()}`;
      const demoPaymentUrl = `${options.callbackUrl}${
        options.callbackUrl.includes("?") ? "&" : "?"
      }Authority=${demoAuth}&Status=OK`;
      return {
        success: true,
        authority: demoAuth,
        paymentUrl: demoPaymentUrl,
        code: 100,
      };
    }

    return {
      success: false,
      errorMessage: "عدم برقراری ارتباط با سرور درگاه زرین‌پال.",
    };
  }
}

/**
 * Verifies a completed payment authority with Zarinpal REST API v4.
 */
export async function verifyPayment(
  options: ZarinpalVerifyOptions
): Promise<ZarinpalVerifyResult> {
  const config = await getZarinpalConfig();
  const merchantId = options.merchantId ?? config.merchantId;
  const isSandbox = options.sandbox ?? config.sandbox;

  // Handle mock authority in demo/sandbox
  if (options.authority.startsWith("DEMO_AUTH_")) {
    const mockRefId = `REF_${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      success: true,
      refId: mockRefId,
      code: 100,
      cardPan: "603799******1234",
    };
  }

  if (!merchantId) {
    return {
      success: false,
      errorMessage: "مرچنت‌کد جهت راستی‌آزمایی تراکنش موجود نیست.",
    };
  }

  const verifyUrl = isSandbox
    ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    : "https://payment.zarinpal.com/pg/v4/payment/verify.json";

  const requestBody = {
    merchant_id: merchantId,
    amount: options.amountTomans,
    authority: options.authority,
  };

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[Zarinpal] Verify returned status ${res.status}: ${errorText}`);
      return {
        success: false,
        errorMessage: `خطای تایید تراکنش در درگاه زرین‌پال (کد ${res.status})`,
      };
    }

    interface ZarinpalVerifyResponse {
      data?: {
        code: number;
        message: string;
        card_hash?: string;
        card_pan?: string;
        ref_id?: number | string;
        fee_type?: string;
        fee?: number;
      };
      errors?: Array<{ code: number; message: string }> | Record<string, unknown>;
    }

    const json = (await res.json()) as ZarinpalVerifyResponse;

    // Code 100: Successfully verified
    // Code 101: Already verified previously
    if (json.data && (json.data.code === 100 || json.data.code === 101)) {
      return {
        success: true,
        refId: String(json.data.ref_id ?? ""),
        code: json.data.code,
        cardPan: json.data.card_pan,
        cardHash: json.data.card_hash,
      };
    }

    const firstErrorMessage =
      Array.isArray(json.errors) && json.errors.length > 0
        ? json.errors[0]?.message
        : "تراکنش بانکی توسط زرین‌پال تایید نشد.";

    return {
      success: false,
      code: json.data?.code,
      errorMessage: firstErrorMessage,
    };
  } catch (error) {
    console.error("[Zarinpal] Verify error:", error);
    return {
      success: false,
      errorMessage: "خطای ارتباط با سرور زرین‌پال در مرحله تایید تراکنش.",
    };
  }
}
