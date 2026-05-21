"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type ToolLink = { href: string; label: TranslationKey; description: TranslationKey };

export function WorkspaceLaneHome({
  title,
  lead,
  tools,
}: {
  title: TranslationKey;
  lead: TranslationKey;
  tools: ToolLink[];
}) {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("workspace.signedInEyebrow")}
        </p>
        <h1 className="twin-section-title mt-2 text-2xl sm:text-3xl">{t(title)}</h1>
        <p className="twin-muted mt-3 text-sm leading-relaxed">{t(lead)}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.href} variant="soft" className="p-5">
              <Link href={tool.href} className="block">
                <p className="font-semibold text-[var(--foreground)]">{t(tool.label)}</p>
                <p className="twin-muted mt-2 text-sm leading-relaxed">{t(tool.description)}</p>
              </Link>
            </Card>
          ))}
        </div>
        <p className="twin-muted mt-8 text-sm">
          <Link href="/workspace" className="twin-link font-medium">
            {t("workspace.switchContext")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
