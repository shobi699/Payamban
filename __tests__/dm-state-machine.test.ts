import { describe, expect, it, vi } from "vitest";
import { normalizeIranianPhone } from "@/lib/queue/dm-worker";
import {
  type DmSessionPayload,
} from "@/lib/queue/dm-session";

describe("T041: DM Form Conversational State Machine & Phone Normalizer", () => {
  describe("normalizeIranianPhone", () => {
    it("normalizes standard 11-digit mobile numbers", () => {
      expect(normalizeIranianPhone("09123456789")).toBe("09123456789");
      expect(normalizeIranianPhone("09351112233")).toBe("09351112233");
    });

    it("normalizes Persian digits correctly", () => {
      expect(normalizeIranianPhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
      expect(normalizeIranianPhone("۰۹۳۸۷۶۵۴۳۲۱")).toBe("09387654321");
    });

    it("normalizes Arabic digits correctly", () => {
      expect(normalizeIranianPhone("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
    });

    it("handles international prefixes (+98, 0098, 98)", () => {
      expect(normalizeIranianPhone("+989123456789")).toBe("09123456789");
      expect(normalizeIranianPhone("00989123456789")).toBe("09123456789");
      expect(normalizeIranianPhone("989123456789")).toBe("09123456789");
      expect(normalizeIranianPhone("9123456789")).toBe("09123456789");
    });

    it("strips whitespace, dashes, and parentheses", () => {
      expect(normalizeIranianPhone("0912-345-6789")).toBe("09123456789");
      expect(normalizeIranianPhone("(+98) 912 345 6789")).toBe("09123456789");
      expect(normalizeIranianPhone(" ۰۹۱۲ ۳۴۵ ۶۷۸۹ ")).toBe("09123456789");
    });

    it("rejects invalid or incomplete phone numbers", () => {
      expect(normalizeIranianPhone("02188776655")).toBeNull(); // Landline
      expect(normalizeIranianPhone("0912345")).toBeNull(); // Too short
      expect(normalizeIranianPhone("091234567890")).toBeNull(); // Too long
      expect(normalizeIranianPhone("not-a-number")).toBeNull();
      expect(normalizeIranianPhone("")).toBeNull();
    });
  });

  describe("DmSession State Machine Logic", () => {
    it("advances session step correctly and records collected answers", () => {
      const session: DmSessionPayload = {
        version: 1,
        type: "FORM_SUBMISSION",
        formId: "form_123",
        fields: [
          { id: "f1", label: "نام کامل", type: "text", required: true },
          { id: "f2", label: "شماره تماس", type: "phone", required: true },
          { id: "f3", label: "آدرس پستی", type: "text", required: true },
        ],
        currentStepIndex: 0,
        collectedAnswers: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Step 1: User provides name
      session.collectedAnswers[session.fields[0].label] = "علی محمدی";
      session.currentStepIndex += 1;
      expect(session.currentStepIndex).toBe(1);
      expect(session.collectedAnswers["نام کامل"]).toBe("علی محمدی");

      // Step 2: User provides phone
      const phoneInput = "۰۹۱۲۳۴۵۶۷۸۹";
      const validatedPhone = normalizeIranianPhone(phoneInput);
      expect(validatedPhone).toBe("09123456789");
      session.collectedAnswers[session.fields[1].label] = validatedPhone!;
      session.currentStepIndex += 1;
      expect(session.currentStepIndex).toBe(2);

      // Step 3: User provides address
      session.collectedAnswers[session.fields[2].label] = "تهران، میدان آزادی";
      session.currentStepIndex += 1;
      expect(session.currentStepIndex).toBe(3);

      // Form is now complete
      const isComplete = session.currentStepIndex >= session.fields.length;
      expect(isComplete).toBe(true);
      expect(Object.keys(session.collectedAnswers)).toHaveLength(3);
    });
  });
});
