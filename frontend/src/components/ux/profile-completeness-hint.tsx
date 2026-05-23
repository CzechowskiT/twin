"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ButtonCta } from "@/components/ui";
import { profileIsComplete, type ProfileCompletenessInput } from "@/lib/profile-completeness";

type ProfileCompletenessHintProps = {
  profile: ProfileCompletenessInput | null | undefined;
  className?: string;
};

/** Step 2 nudge when profile is missing skills or target roles. */
export function ProfileCompletenessHint({ profile, className = "" }: ProfileCompletenessHintProps) {
  const { t } = useTranslation();

  if (profileIsComplete(profile)) return null;

  const message = profile ? t("ux.profileIncompleteLead") : t("ux.profileMissingLead");

  return (
    <section
      className={`mb-4 rounded-xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/50 px-4 py-4 sm:mb-6 sm:px-5 ${className}`}
      aria-labelledby="profile-completeness-heading"
    >
      <p
        id="profile-completeness-heading"
        className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]"
      >
        {t("ux.profileStepEyebrow")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{message}</p>
      <Link href="/profile" className="mt-4 inline-block">
        <ButtonCta type="button" className="!w-auto">
          {t("ux.profileIncompleteCta")}
        </ButtonCta>
      </Link>
    </section>
  );
}
