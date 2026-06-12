"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

export type WorkspaceQuickAction = {
  href: string;
  labelKey: TranslationKey;
};

export function WorkspaceQuickActions({ actions }: { actions: readonly WorkspaceQuickAction[] }) {
  const { t } = useTranslation();
  if (actions.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label={t("workspaceModules.quickActionsAria")}
      data-testid="workspace-quick-actions"
    >
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)]/45 hover:bg-[var(--twin-accent-muted)]/35 hover:text-[var(--twin-accent)]"
        >
          {t(action.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
