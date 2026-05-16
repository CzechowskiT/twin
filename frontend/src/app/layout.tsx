import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FuturisticBackground } from "@/components/futuristic-background";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TWIN — Career Agent",
  description: "Global career platform: AI job matching, pipeline, and autonomous workflows.",
  appleWebApp: { capable: true, title: "TWIN" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0066cc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full min-h-[100dvh] flex-col text-[var(--foreground)]">
        <Providers>
          <FuturisticBackground />
          <Header />
          <main className="relative z-0 flex-1 pb-[env(safe-area-inset-bottom,0)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
