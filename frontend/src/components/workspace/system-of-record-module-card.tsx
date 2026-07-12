"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  activationStatusToBadgeStatus,
  getWorkspaceModuleActivationStatus,
} from "@/lib/all-workspace-modules-activation";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";
import type { SystemOfRecordRouteEntry } from "@/lib/system-of-record-routes";

import { SystemOfRecordBoundaryBadge } from "./system-of-record-boundary-badge";
import { WorkspaceStatusBadge } from "./workspace-status-badge";

export function SystemOfRecordModuleCard({ route }: { route: SystemOfRecordRouteEntry }) {
  const { t } = useTranslation();
  const href = route.href;
  const isExternal = href.startsWith("mailto:");
  const activationStatus = getWorkspaceModuleActivationStatus(route.id);
  const badgeStatus = activationStatusToBadgeStatus(activationStatus);

  const cardBody = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{t(route.titleKey)}</h3>
        <WorkspaceStatusBadge status={badgeStatus} />
      </div>
      <p className="twin-muted mt-2 flex-1 text-sm leading-relaxed">{t(route.descriptionKey)}</p>
      {route.hintKey ? (
        <p className="twin-muted mt-2 text-xs leading-relaxed opacity-90">{t(route.hintKey)}</p>
      ) : null}
      {route.boundaryTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5" data-sor-boundary-row>
          {route.boundaryTags.map((tag) => (
            <SystemOfRecordBoundaryBadge key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
      <span className="twin-btn-primary twin-touch-target mt-4 inline-flex w-full items-center justify-center text-sm text-[var(--twin-on-cta)] group-hover:text-[var(--twin-on-cta)]">
        {t(route.ctaKey)}
      </span>
    </>
  );

  return (
    <Card
      variant="soft"
      className="group flex h-full flex-col border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/60 p-5 transition hover:border-[var(--twin-accent)]/35 hover:bg-[var(--twin-accent-muted)]/15"
      data-sor-module={route.id}
      data-sor-module-family={route.moduleFamily}
    >
      {isExternal ? (
        <a href={href} className="flex h-full flex-col">
          {cardBody}
        </a>
      ) : (
        <Link
          href={href}
          className="flex h-full flex-col"
          prefetch={false}
          onClick={href.includes("#") ? scrollToDashboardHash : undefined}
        >
          {cardBody}
        </Link>
      )}
    </Card>
  );
}
