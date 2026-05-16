import type { Metadata } from "next";

import "./beta.css";

function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return new URL(explicit.replace(/\/$/, ""));
  const v = process.env.VERCEL_URL?.trim();
  if (v) return new URL(`https://${v.replace(/\/$/, "")}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "TWIN Beta — waitlist",
  description:
    "Join the TWIN beta: live job matches from scraped boards, queue position, referral boosts — no fake press claims.",
  openGraph: {
    title: "TWIN — stop job-hunting alone",
    description: "Beta waitlist. Real matches from the database. Referrals move you up the queue.",
    type: "website",
    url: "/beta",
  },
  twitter: { card: "summary_large_image", title: "TWIN Beta waitlist" },
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <div className="beta-root">{children}</div>;
}
