"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LinkedInLoginButton } from "@/components/linkedin-login-button";
import { useTranslation } from "@/components/language-provider";

type MvpOAuthFlags = {
  linkedin_oauth_configured: boolean;
};

type LinkedInLoginSectionProps = {
  emailLoginHref: string;
};

/** LinkedIn OIDC when configured; otherwise a clear CTA to email login (no broken redirect). */
export function LinkedInLoginSection({ emailLoginHref }: LinkedInLoginSectionProps) {
  const { t } = useTranslation();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpOAuthFlags;
        if (!cancelled) setConfigured(Boolean(json.linkedin_oauth_configured));
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (configured === null) {
    return (
      <p className="twin-muted mb-2 text-center text-xs" aria-live="polite">
        …
      </p>
    );
  }

  if (!configured) {
    return (
      <aside
        className="mb-2 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80 px-4 py-3 text-sm"
        aria-labelledby="linkedin-unavailable-title"
      >
        <p id="linkedin-unavailable-title" className="font-semibold text-[var(--foreground)]">
          {t("login.linkedInUnavailableTitle")}
        </p>
        <p className="twin-muted mt-1 text-xs leading-relaxed">{t("login.linkedInUnavailableLead")}</p>
        <Link href={emailLoginHref} className="twin-link mt-3 inline-block text-sm font-semibold">
          {t("login.useEmailLogin")} ↓
        </Link>
      </aside>
    );
  }

  return <LinkedInLoginButton label={t("login.linkedIn")} />;
}
