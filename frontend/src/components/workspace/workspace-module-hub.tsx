"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

import { WorkspaceModuleGrid } from "./workspace-module-grid";
import { WorkspaceQuickActions, type WorkspaceQuickAction } from "./workspace-quick-actions";

export function WorkspaceModuleHub({
  eyebrowKey = "workspaceModules.hubEyebrow",
  titleKey,
  leadKey,
  modules,
  quickActions = [],
  switchContextHref = "/workspace",
  children,
}: {
  eyebrowKey?: TranslationKey;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  modules: readonly WorkspaceModuleDef[];
  quickActions?: readonly WorkspaceQuickAction[];
  switchContextHref?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-6xl" data-testid="workspace-module-hub">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t(eyebrowKey)}
        </p>
        <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t(titleKey)}</h1>
        <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t(leadKey)}</p>

        {quickActions.length > 0 ? (
          <div className="mt-6">
            <WorkspaceQuickActions actions={quickActions} />
          </div>
        ) : null}

        <div className="mt-8">
          <WorkspaceModuleGrid modules={modules} />
        </div>

        {children}

        <p className="twin-muted mt-8 text-sm">
          <Link href={switchContextHref} className="twin-link font-medium">
            {t("workspace.switchContext")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
