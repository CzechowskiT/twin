"use client";

import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import type { TranslationKey } from "@/lib/i18n";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

type WorkspacePilotPageHeaderProps = {
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  status: WorkspaceModuleStatus;
  testId?: string;
};

/** Shared pilot/preview submodule header — one status badge, calm hierarchy. */
export function WorkspacePilotPageHeader({
  eyebrowKey,
  titleKey,
  leadKey,
  status,
  testId,
}: WorkspacePilotPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="mb-6 space-y-3" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t(eyebrowKey)}
        </p>
        <WorkspaceStatusBadge status={status} />
      </div>
      <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t(titleKey)}</h1>
      <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t(leadKey)}</p>
    </header>
  );
}
