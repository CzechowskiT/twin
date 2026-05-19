import type { Metadata } from "next";

import "./waitlist.css";

function metadataBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return new URL(explicit.replace(/\/$/, ""));
  const v = process.env.VERCEL_URL?.trim();
  if (v) return new URL(`https://${v.replace(/\/$/, "")}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "TWIN Wishlist — dołącz do pierwszych 1000",
  description:
    "Twój cyfrowy bliźniak przejmuje szukanie pracy. Zapisz się na listę — darmowy dostęp dla Early Adopters.",
  openGraph: {
    title: "TWIN — zwolnij się z szukania pracy",
    description: "Waitlist dla developerów. Zero CV. Gotowe rozmowy w kalendarzu.",
    type: "website",
    url: "/waitlist",
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
