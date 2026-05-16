"use client";

import type { ReactNode } from "react";

import { API_URL } from "@/lib/api";
import type { OAuthProviderStatus } from "@/lib/oauth-auth";

/** Light “Sign in with …” rows: white surface + neutral chrome (brand marks keep official colors). */
const ROW_ENABLED =
  "twin-touch-target mb-2 flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]";

const ROW_DISABLED =
  "twin-touch-target mb-2 flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-400";

const ICON_WRAP =
  "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-visible leading-none";

type Labels = {
  google: string;
  github: string;
  apple: string;
};

type OAuthWebButtonsProps = {
  status: OAuthProviderStatus;
  labels: Labels;
};

export function OAuthWebButtons({ status, labels }: OAuthWebButtonsProps) {
  return (
    <>
      <Row
        configured={status.google}
        href={`${API_URL}/api/v1/auth/google/login`}
        label={labels.google}
        icon={<GoogleIcon />}
      />
      <Row
        configured={status.github}
        href={`${API_URL}/api/v1/auth/github/login`}
        label={labels.github}
        icon={<GitHubIcon />}
      />
      <Row
        configured={status.apple}
        href={`${API_URL}/api/v1/auth/apple/login`}
        label={labels.apple}
        icon={<AppleIcon />}
      />
    </>
  );
}

function Row({
  configured,
  href,
  label,
  icon,
}: {
  configured: boolean;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  if (!configured) {
    return (
      <div className={ROW_DISABLED}>
        <span className={ICON_WRAP}>{icon}</span>
        <span className="min-w-0 leading-snug">{label}</span>
      </div>
    );
  }
  return (
    <a href={href} className={ROW_ENABLED}>
      <span className={ICON_WRAP}>{icon}</span>
      <span className="min-w-0 leading-snug">{label}</span>
    </a>
  );
}

/** Google “G” — official multi-color mark on white (brand guidelines). */
function GoogleIcon() {
  return (
    <svg className="block overflow-visible" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** GitHub Octocat — light-bg mark uses #24292f (GitHub logo guidelines). */
function GitHubIcon() {
  return (
    <svg
      className="block overflow-visible"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="#24292f"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/**
 * Apple logo silhouette — canonical fill path (widely used Apple mark on light backgrounds).
 * Matches the familiar “bitten apple + leaf” shape; black on white aligns with Sign in with Apple white-button style.
 */
function AppleIcon() {
  return (
    <svg
      className="block h-[19px] w-[15px] shrink-0 overflow-visible"
      viewBox="0 0 814 1000"
      aria-hidden="true"
      fill="#000000"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.4 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.3 40.8-165.9 40.8s-105.6-57-155.5-127.4C-8.6 622.8 42 367.7 42 236.2 42 112.3 121.7 16.5 229.8 16.5c74.7 0 127.7 49.4 152.9 49.4 23.5 0 91-52.6 162.4-52.6 28 0 84.6 2.4 129.3 39.2-115.2 67.5-97 243.4 33.9 243.4C722.4 349.4 788.1 340.9 788.1 340.9zM554.1 0c-4.5 79.8-43.5 147.1-119.4 199.3-4.5 3.2-10.2 6.4-15.3 9.6 1.3 3.2 2.6 6.4 4.5 9.6 20.7 43.5 65.9 127.4 150.7 127.4 4.5 0 9.6-.6 14.5-1.9C757.3 203.8 554.1 0 554.1 0z" />
    </svg>
  );
}
