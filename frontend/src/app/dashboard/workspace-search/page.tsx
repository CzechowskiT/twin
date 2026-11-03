"use client";

import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Card, Shell } from "@/components/ui";

/** Full-page entry for unified workspace search (palette is global via Cmd/Ctrl+K). */
export default function WorkspaceSearchPage() {
  const { t } = useTranslation();
  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("workspaceSearch.nav")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8" data-testid="workspace-search-page">
        <h1 className="text-3xl font-semibold">{t("workspaceSearch.title")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("workspaceSearch.lead")}</p>
        <Card>
          <p className="text-sm">{t("workspaceSearch.openShortcut")}</p>
          <p className="mt-2 text-sm opacity-80">{t("workspaceSearch.noHistory")}</p>
          <p className="mt-2 text-xs opacity-60">{t("workspaceSearch.notFirstValue")}</p>
          <p className="mt-2 text-xs opacity-60">{t("workspaceSearch.truthNote")}</p>
        </Card>
      </main>
    </Shell>
  );
}
