"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { TrackerApplication } from "@/lib/career/application-tracker-types";

export function ApplicationTracker({
  applications,
}: {
  applications: TrackerApplication[];
}) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{t("careerDiscovery.trackerTitle")}</h3>
      {!applications.length ? (
        <p className="twin-muted mt-2 text-sm">{t("careerDiscovery.trackerEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--twin-border)] text-sm">
          {applications.map((app) => (
            <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{app.title}</p>
                <p className="twin-muted text-xs">{app.company}</p>
              </div>
              <div className="text-right text-xs">
                <p>{t("careerDiscovery.trackerStatus")}: {app.status}</p>
                <Link href={app.url} className="twin-link" target="_blank" rel="noopener noreferrer">
                  {t("careerDiscovery.viewListing")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
