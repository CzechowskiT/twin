import { ImageResponse } from "next/og";
import { headers } from "next/headers";

import {
  WAITLIST_OG_COPY,
  ogLocaleFromAcceptLanguage,
} from "@/lib/og/waitlist-og-copy";

export const runtime = "edge";
export const alt = "TWIN — Wishlist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const hdrs = await headers();
  const locale = ogLocaleFromAcceptLanguage(hdrs.get("accept-language"));
  const copy = WAITLIST_OG_COPY[locale];
  const title = copy.metaTitle.length > 72 ? `${copy.metaTitle.slice(0, 69)}…` : copy.metaTitle;
  const description =
    copy.metaDescription.length > 140 ? `${copy.metaDescription.slice(0, 137)}…` : copy.metaDescription;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #020617 0%, #0f172a 45%, #042f2e 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.2em", color: "#22d3ee" }}>TWIN</div>
        <div style={{ marginTop: 28, fontSize: 52, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>{title}</div>
        <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.4, color: "#94a3b8", maxWidth: 960 }}>{description}</div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            color: "#5eead4",
          }}
        >
          twin-sooty.vercel.app/waitlist
        </div>
      </div>
    ),
    { ...size },
  );
}
