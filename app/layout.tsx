import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "پیام‌بان (Payamban Pro) - پلتفرم هوشمند اتوماسیون اینستاگرام و فروش دایرکت",
  description:
    "پلتفرم پیشرفته اتوماسیون تعاملات اینستاگرام از کامنت به دایرکت با استفاده از API رسمی متا، فرم‌ساز لید و هوش مصنوعی ۲۴ ساعته.",
  keywords: [
    "پیام‌بان",
    "Payamban",
    "instagram automation",
    "comment to DM",
    "instagram private replies",
    "social commerce",
    "manychat alternative",
    "اتوماسیون اینستاگرام",
    "کامنت به دایرکت",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Payamban",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, direction } = await getI18n();

  return (
    <html lang={locale} dir={direction} className="h-full">
      <body
        className="min-h-full bg-background text-foreground font-sans antialiased"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
