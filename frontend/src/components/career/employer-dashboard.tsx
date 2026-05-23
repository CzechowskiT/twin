"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

export function EmployerDashboard({
  stats,
}: {
  stats: { openRoles: number; applications: number; interviews: number };
}) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">{t("careerDiscovery.employerDashboardTitle")}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.employerOpenRoles")}</dt>
          <dd className="text-2xl font-semibold">{stats.openRoles}</dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.employerApplications")}</dt>
          <dd className="text-2xl font-semibold">{stats.applications}</dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("careerDiscovery.employerInterviews")}</dt>
          <dd className="text-2xl font-semibold">{stats.interviews}</dd>
        </div>
      </dl>
    </Card>
  );
}
