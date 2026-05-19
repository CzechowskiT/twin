"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";

/** Points classic beta visitors to the immersive multilingual wishlist landing. */
export function WaitlistBetaBanner() {
  const { t } = useTranslation();
  return (
    <div className="mb-8 rounded-xl border border-[var(--beta-blue)]/40 bg-[var(--beta-blue)]/10 px-4 py-3 text-sm leading-relaxed text-[var(--foreground)]">
      <strong className="text-[var(--beta-blue)]">{t("home.joinWishlist")}</strong>
      {" — "}
      <Link href="/waitlist" className="font-semibold text-[var(--beta-blue)] underline">
        {t("site.footerWishlist")}
      </Link>
    </div>
  );
}
