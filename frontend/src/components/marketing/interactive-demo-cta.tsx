"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";

type InteractiveDemoCtaProps = {
  /** Marketing home vs waitlist cinematic surface. */
  variant?: "marketing" | "waitlist";
  className?: string;
  showSignIn?: boolean;
};

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7.25 4.8v10.4c0 .72.78 1.17 1.4.8l7.9-5.2a.95.95 0 0 0 0-1.6l-7.9-5.2c-.62-.37-1.4.08-1.4.8Z" />
    </svg>
  );
}

/** Tertiary hero card — product walkthrough at /demo (no API, no auto-apply). */
export function InteractiveDemoCta({
  variant = "marketing",
  className = "",
  showSignIn = true,
}: InteractiveDemoCtaProps) {
  const { t } = useTranslation();
  const rootClass = ["interactive-demo-cta-block", `interactive-demo-cta-block--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  const ariaLabel = `${t("home.ctaDemoSecondary")}. ${t("home.ctaDemoCardSubtitle")}. ${t("home.ctaDemoCardLead")}`;

  return (
    <div className={rootClass}>
      <Link
        href="/demo"
        className="interactive-demo-cta"
        aria-label={ariaLabel}
      >
        <span className="interactive-demo-cta__play" aria-hidden>
          <span className="interactive-demo-cta__play-ring" />
          <span className="interactive-demo-cta__play-icon">
            <PlayIcon />
          </span>
        </span>
        <span className="interactive-demo-cta__copy">
          <span className="interactive-demo-cta__title">{t("home.ctaDemoSecondary")}</span>
          <span className="interactive-demo-cta__subtitle">{t("home.ctaDemoCardSubtitle")}</span>
          <span className="interactive-demo-cta__lead">{t("home.ctaDemoCardLead")}</span>
        </span>
        <span className="interactive-demo-cta__chevron" aria-hidden>
          →
        </span>
      </Link>
      {showSignIn ? (
        <p className="interactive-demo-cta__signin">
          {t("home.logInPrompt")}{" "}
          <Link href="/login" className="interactive-demo-cta__signin-link">
            {t("home.logIn")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
