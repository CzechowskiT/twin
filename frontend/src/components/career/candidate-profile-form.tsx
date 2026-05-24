"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";

export function CandidateProfileForm({ profile }: { profile: CareerCandidateProfile }) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{t("careerDiscovery.profileTitle")}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.profileSkills")}</dt>
          <dd>{profile.skills.length ? profile.skills.join(", ") : "—"}</dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.profileExperience")}</dt>
          <dd>
            {profile.experienceYears} {t("dashboard.years")}
          </dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.profileDesiredSalary")}</dt>
          <dd>{profile.desiredSalary ?? "—"}</dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.profileLocation")}</dt>
          <dd>{profile.location ?? "—"}</dd>
        </div>
      </dl>
      <p className="twin-muted mt-3 text-xs">
        <Link href="/profile" className="twin-link">
          {t("careerDiscovery.profileEditHint")}
        </Link>
      </p>
    </Card>
  );
}
