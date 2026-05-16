"use client";

import { API_URL } from "@/lib/api";

const LINKEDIN_LOGIN_URL = `${API_URL}/api/v1/auth/linkedin/login`;

const ENABLED =
  "twin-touch-target mb-2 flex w-full items-center justify-center gap-3 rounded-lg border border-[#0A66C2] bg-[#0A66C2] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:border-[#004182] hover:bg-[#004182] hover:text-white";

const DISABLED =
  "twin-touch-target mb-2 flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-dashed border-[#0A66C2]/50 bg-[#0A66C2]/90 px-4 py-3 text-sm font-semibold text-white opacity-65";

const ICON_WRAP = "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-visible leading-none text-white";

type LinkedInLoginButtonProps = {
  label: string;
  configured: boolean;
  comingSoonMessage: string;
};

export function LinkedInLoginButton({
  label,
  configured,
  comingSoonMessage,
}: LinkedInLoginButtonProps) {
  if (!configured) {
    return (
      <div className={DISABLED}>
        <span className={ICON_WRAP}>
          <LinkedInIcon />
        </span>
        <span className="min-w-0 text-left leading-snug">{comingSoonMessage}</span>
      </div>
    );
  }

  return (
    <a href={LINKEDIN_LOGIN_URL} className={ENABLED}>
      <span className={ICON_WRAP}>
        <LinkedInIcon />
      </span>
      <span className="min-w-0 leading-snug">{label}</span>
    </a>
  );
}

function LinkedInIcon() {
  return (
    <svg className="block overflow-visible" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
