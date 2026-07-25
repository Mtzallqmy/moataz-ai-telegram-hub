import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/noto-kufi-arabic";
import "./globals.css";
import "./production.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://moatazalalqami.online"),
  title: { default: "معتز للذكاء الاصطناعي", template: "%s | معتز للذكاء الاصطناعي" },
  description: "منصة عربية متعددة المزودات للذكاء الاصطناعي والمحتوى التقني والأتمتة.",
  applicationName: "Moataz AI",
  authors: [{ name: "معتز العلقمي" }],
  creator: "معتز العلقمي",
  publisher: "معتز العلقمي",
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "ar_YE",
    siteName: "معتز للذكاء الاصطناعي",
    title: "معتز للذكاء الاصطناعي",
    description: "أدوات ذكاء اصطناعي متعددة المزودات ومحتوى عربي عملي.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
