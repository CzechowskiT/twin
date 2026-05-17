"use client";

import type { ReactElement } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
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

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  );
}

type Net = {
  href: string | undefined;
  Icon: (p: { className?: string }) => ReactElement;
  aria: TranslationKey;
};

function readNetworks(): Net[] {
  return [
    { href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE?.trim() || undefined, Icon: IconYouTube, aria: "site.footerYoutubeAria" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM?.trim() || undefined, Icon: IconInstagram, aria: "site.footerInstagramAria" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_X?.trim() || undefined, Icon: IconX, aria: "site.footerXAria" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK?.trim() || undefined, Icon: IconFacebook, aria: "site.footerFacebookAria" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_TWITTER?.trim() || undefined, Icon: IconTwitter, aria: "site.footerTwitterAria" },
  ];
}

const footerBtn =
  "twin-touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]/80 text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent)]";

const headerBtn =
  "twin-touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card-solid)] text-[var(--foreground)] shadow-sm transition hover:border-[var(--twin-accent)]/45 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent)]";

const placeholderFooter = `${footerBtn} cursor-not-allowed opacity-45`;
const placeholderHeader = `${headerBtn} cursor-default border-dashed text-[var(--foreground)]/90`;

type SocialIconRowProps = {
  variant: "header" | "footer";
  /** When true, always `flex` (e.g. mobile menu). */
  inline?: boolean;
  className?: string;
};

/** YouTube, Instagram, X, Facebook, Twitter — same env vars in header and footer. */
export function SocialIconRow({ variant, inline = false, className = "" }: SocialIconRowProps) {
  const { t } = useTranslation();
  const soon = t("site.footerSocialSoonHint");
  const networks = readNetworks();
  const btn = variant === "header" ? headerBtn : footerBtn;
  const ph = variant === "header" ? placeholderHeader : placeholderFooter;
  const gap = variant === "header" ? "gap-1.5" : "gap-3";
  const flex = inline ? "flex" : variant === "header" ? "hidden md:flex" : "flex";
  const justify = variant === "header" ? "justify-end" : "justify-center sm:justify-start";

  return (
    <div
      className={`${flex} flex-wrap items-center ${justify} ${gap} ${className}`}
      role="list"
      aria-label={variant === "header" ? t("site.headerSocialAria") : undefined}
    >
      {networks.map(({ href, Icon, aria }) =>
        href ? (
          <a
            key={aria}
            role="listitem"
            href={href}
            target="_blank"
            rel="noopener noreferrer me"
            className={btn}
            aria-label={t(aria)}
          >
            <Icon className="h-5 w-5" />
          </a>
        ) : (
          <span key={aria} role="listitem" className={ph} title={soon} aria-label={t(aria)}>
            <Icon className="h-5 w-5" />
          </span>
        ),
      )}
    </div>
  );
}
