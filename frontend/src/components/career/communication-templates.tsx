"use client";

import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

const TEMPLATES: { key: TranslationKey; body: string }[] = [
  {
    key: "careerDiscovery.commTemplateInvite",
    body: "Hi {{name}}, we reviewed your profile and would like to invite you to a 30-minute conversation about {{role}}.",
  },
  {
    key: "careerDiscovery.commTemplateDecline",
    body: "Thank you for your interest in {{role}}. We will not move forward at this time but encourage you to stay in touch.",
  },
  {
    key: "careerDiscovery.commTemplateReschedule",
    body: "Could we move our conversation to {{slot}}? Please confirm or suggest another time.",
  },
];

export function CommunicationTemplates() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">{t("careerDiscovery.commTemplatesTitle")}</h2>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.commTemplatesLead")}</p>
      <ul className="mt-3 space-y-3">
        {TEMPLATES.map((tpl) => (
          <li key={tpl.key} className="rounded border border-[var(--twin-border)] p-3 text-sm">
            <p className="font-medium">{t(tpl.key)}</p>
            <p className="twin-muted mt-1 text-xs">{tpl.body}</p>
            <ButtonChip
              type="button"
              className="mt-2"
              onClick={() => void copy(tpl.key, tpl.body)}
            >
              {copied === tpl.key ? t("careerDiscovery.commCopied") : t("careerDiscovery.commCopy")}
            </ButtonChip>
          </li>
        ))}
      </ul>
    </Card>
  );
}
