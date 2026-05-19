import type { Metadata } from "next";
import { headers } from "next/headers";

import { WAITLIST_MESSAGES } from "@/lib/waitlist-messages";
import { localeFromAcceptLanguage } from "@/lib/waitlist/locale-from-request";

import "./waitlist.css";

function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return new URL(explicit.replace(/\/$/, ""));
  const v = process.env.VERCEL_URL?.trim();
  if (v) return new URL(`https://${v.replace(/\/$/, "")}`);
  return new URL("http://localhost:3000");
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = localeFromAcceptLanguage(hdrs.get("accept-language"));
  const copy = WAITLIST_MESSAGES[locale];
  const base = metadataBaseUrl();
  return {
    metadataBase: base,
    title: copy.metaTitle,
    description: copy.metaDescription,
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      type: "website",
      url: "/waitlist",
      locale: locale === "zh" ? "zh_CN" : locale === "ar" ? "ar_SA" : locale,
    },
    alternates: {
      canonical: "/waitlist",
    },
  };
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
