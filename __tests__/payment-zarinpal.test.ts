import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  requestPayment,
  verifyPayment,
  getZarinpalConfig,
} from "@/lib/billing/zarinpal";

describe("T042: Zarinpal Payment Gateway Driver", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Configuration & Validation", () => {
    it("returns default sandbox/demo configuration safely", async () => {
      const config = await getZarinpalConfig();
      expect(config).toBeDefined();
      expect(typeof config.merchantId).toBe("string");
      expect(typeof config.sandbox).toBe("boolean");
    });

    it("rejects request if merchantId is empty", async () => {
      const result = await requestPayment({
        merchantId: "",
        amountTomans: 150000,
        description: "تست خرید پلن نقره‌ای",
        callbackUrl: "http://localhost:3000/api/billing/payment/callback",
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("مرچنت‌کد");
    });
  });

  describe("Sandbox & Demo Request Cycle", () => {
    it("generates a valid authority and startPay URL for sandbox requests", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            code: 100,
            message: "Success",
            authority: "A00000000000000000000000000000012345",
          },
        }),
      } as unknown as Response);

      const result = await requestPayment({
        merchantId: "test-merchant-id-12345",
        amountTomans: 250000,
        description: "خرید پلن طلایی دی‌رکت پرو",
        callbackUrl: "http://localhost:3000/api/billing/payment/callback",
        sandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.authority).toBe("A00000000000000000000000000000012345");
      expect(result.paymentUrl).toContain("https://sandbox.zarinpal.com/pg/StartPay/");
    });

    it("handles demo fallback when connection to external gateway fails in sandbox", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout to gateway"));

      const result = await requestPayment({
        merchantId: "zarinpal_demo_merchant",
        amountTomans: 100000,
        description: "خرید پلن برنزی",
        callbackUrl: "http://localhost:3000/api/billing/payment/callback",
        sandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.authority).toContain("DEMO_AUTH_");
      expect(result.paymentUrl).toContain("Authority=");
    });
  });

  describe("Verification Cycle", () => {
    it("successfully verifies valid transaction with code 100", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            code: 100,
            message: "Verified",
            ref_id: 987654321,
            card_pan: "502229******1234",
            card_hash: "mock_hash_abc",
          },
        }),
      } as unknown as Response);

      const result = await verifyPayment({
        authority: "A00000000000000000000000000000012345",
        amountTomans: 250000,
        merchantId: "test-merchant-id-12345",
        sandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.refId).toBe("987654321");
      expect(result.cardPan).toBe("502229******1234");
    });

    it("verifies demo authority smoothly in offline or demo mode", async () => {
      const result = await verifyPayment({
        authority: "DEMO_AUTH_12345678",
        amountTomans: 150000,
        merchantId: "zarinpal_demo_merchant",
        sandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.refId).toBeDefined();
      expect(result.code).toBe(100);
    });

    it("rejects verification when gateway returns error code", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            code: -51,
            message: "Session is not valid",
          },
          errors: [{ code: -51, message: "پرداخت ناموفق بود یا توسط کاربر لغو شد." }],
        }),
      } as unknown as Response);

      const result = await verifyPayment({
        authority: "A_FAILED_AUTH",
        amountTomans: 250000,
        merchantId: "real-merchant-uuid",
        sandbox: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });
});
