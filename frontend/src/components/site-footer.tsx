"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { StoreDownloadLinks } from "@/components/store-download-links";

const SOCIAL_LINKEDIN = "https://www.linkedin.com";
const SOCIAL_X = "https://x.com";
const SOCIAL_GITHUB = "https://github.com/CzechowskiT/twin";

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGithub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();

  const company = [
    { href: "/about", label: t("nav.about") },
    { href: "/case-studies", label: t("nav.cases") },
    { href: "/careers", label: t("nav.careers") },
    { href: "/partners", label: t("nav.partners") },
    { href: "/media", label: t("nav.media") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const explore = [
    { href: "/", label: t("site.footerHome") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/calculator", label: t("nav.calculator") },
    { href: "/register", label: t("nav.register") },
    { href: "/login", label: t("nav.login") },
  ];

  return (
    <footer className="border-t border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80">
      <div className="twin-container py-10 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <Link href="/" className="twin-logo inline-block text-lg no-underline hover:opacity-90">
              TWIN<span className="twin-logo-accent">.</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted)]">{t("site.footerTagline")}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("site.footerCompany")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="twin-nav-link font-medium text-[var(--foreground)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("site.footerExplore")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {explore.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="twin-nav-link font-medium text-[var(--foreground)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("site.footerSocial")}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a
                href={SOCIAL_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--twin-accent)] transition hover:text-[var(--twin-accent-hover)]"
                aria-label={t("site.footerLinkedInAria")}
              >
                <IconLinkedIn className="h-6 w-6" />
              </a>
              <a
                href={SOCIAL_X}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--twin-accent)] transition hover:text-[var(--twin-accent-hover)]"
                aria-label={t("site.footerXAria")}
              >
                <IconX className="h-5 w-5" />
              </a>
              <a
                href={SOCIAL_GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--twin-accent)] transition hover:text-[var(--twin-accent-hover)]"
                aria-label={t("site.footerGithubAria")}
              >
                <IconGithub className="h-6 w-6" />
              </a>
            </div>
            <h3 className="mt-8 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("site.footerLegal")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="twin-link font-medium">
                  {t("site.footerPrivacy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 max-w-xl">
          <StoreDownloadLinks />
        </div>
        <p className="mt-10 border-t border-[var(--twin-border)] pt-6 text-center text-xs text-[var(--twin-muted)]">
          {t("site.footerRights")}
        </p>
      </div>
    </footer>
  );
}
