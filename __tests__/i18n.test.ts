import { describe, expect, it } from "vitest";
import { createI18n, resolveLocale, resolveDirection } from "../lib/i18n";

describe("Persian & English interface translations", () => {
  it("defaults to Persian (fa) for absent or unsupported preferences", () => {
    for (const value of [undefined, null, "", "fr", "ar", "../fa"]) {
      expect(resolveLocale(value)).toBe("fa");
    }
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("fa")).toBe("fa");
  });

  it("resolves correct text direction (rtl for fa, ltr for en)", () => {
    expect(resolveDirection("fa")).toBe("rtl");
    expect(resolveDirection("en")).toBe("ltr");
  });

  it("renders both interface languages properly", () => {
    expect(createI18n("en").t("Campaigns")).toBe("Campaigns");
    expect(createI18n("fa").t("Campaigns")).toBe("کمپین‌ها");
  });

  it("allows interpolation values in Persian and English", () => {
    const values = { count: 2 };
    expect(createI18n("en").t("{count} accounts", values)).toBe("2 accounts");
    // In Persian, numbers can be formatted in Persian numerals: ۲ اکانت
    expect(createI18n("fa").t("{count} accounts", values)).toContain("اکانت");
  });

  it("translates display labels with label() helper", () => {
    const i18nFa = createI18n("fa");
    expect(i18nFa.label("SENT")).toBe("ارسال شد");
    expect(i18nFa.label("Active")).toBe("فعال");
    expect(i18nFa.label("Dashboard")).toBe("پیشخوان");
  });
});
