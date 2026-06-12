"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

import { WorkspaceStatusBadge } from "./workspace-status-badge";

export function WorkspaceModuleCard({ module: mod }: { module: WorkspaceModuleDef }) {
  const { t } = useTranslation();
  const href = mod.anchor ? `${mod.href}${mod.anchor}` : mod.href;
  const isExternal = href.startsWith("mailto:");

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{t(mod.titleKey)}</h3>
        <WorkspaceStatusBadge status={mod.status} />
      </div>
      <p className="twin-muted mt-2 flex-1 text-sm leading-relaxed">{t(mod.valuePropKey)}</p>
      {mod.hintKey ? (
        <p className="twin-muted mt-2 text-xs leading-relaxed opacity-90">{t(mod.hintKey)}</p>
      ) : null}
      <span className="twin-btn-primary twin-touch-target mt-4 inline-flex w-full items-center justify-center text-sm text-[var(--twin-on-cta)] group-hover:text-[var(--twin-on-cta)]">
        {t(mod.ctaKey)}
      </span>
    </>
  );

  return (
    <Card
      variant="soft"
      className="group flex h-full flex-col border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/60 p-5 transition hover:border-[var(--twin-accent)]/35 hover:bg-[var(--twin-accent-muted)]/15"
      data-workspace-module={mod.id}
    >
      {isExternal ? (
        <a href={href} className="flex h-full flex-col">
          {cardBody}
        </a>
      ) : (
        <Link href={href} className="flex h-full flex-col">
          {cardBody}
        </Link>
      )}
    </Card>
  );
}
