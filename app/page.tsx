import type { Metadata } from "next";
import "./payamban-landing.css";
import { PayambanLandingClient } from "@/components/landing/PayambanLandingClient";

export const metadata: Metadata = {
  title: "پیام‌بان (Payamban Pro) | ادمین هوشمند ۲۴ ساعته اینستاگرام",
  description:
    "سامانه هوشمند پاسخگویی خودکار کامنت و دایرکت اینستاگرام با تاییدیه رسمی متا، فرم‌ساز لید، اتصال به درگاه‌های پرداخت شتاب و پیامک هوشمند کاوه‌نگار.",
  keywords: [
    "پیام‌بان",
    "Payamban",
    "اتوماسیون اینستاگرام",
    "دایرکت هوشمند",
    "پاسخ خودکار کامنت",
    "ربات اینستاگرام",
    "افزایش فروش اینستاگرام",
  ],
};

export default function Home() {
  return <PayambanLandingClient />;
}
