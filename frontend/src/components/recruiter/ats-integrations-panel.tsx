"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AtsProvider = {
  provider: string;
  display_name: string;
  webhook_path: string;
  webhook_url: string;
  secret_configured: boolean;
  signature_header: string;
};

type AtsSetup = {
  providers: AtsProvider[];
  linkage_note: string;
};

export function AtsIntegrationsPanel() {
  const { t } = useTranslation();
  const [setup, setSetup] = useState<AtsSetup | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setSetup(await apiFetch<AtsSetup>("/api/v1/integrations/ats/setup", {}, token));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("atsIntegrations.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("atsIntegrations.copied"));
    } catch {
      toast.error(url);
    }
  };

  if (err) return <p className="twin-muted text-sm">{err}</p>;
  if (!setup) return <p className="twin-muted text-sm">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <p className="twin-muted max-w-2xl text-sm leading-relaxed">{setup.linkage_note}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {setup.providers.map((p) => (
          <Card key={p.provider} className="flex flex-col p-5">
            <h2 className="text-lg font-semibold">{p.display_name}</h2>
            <p className="twin-muted mt-2 text-xs">
              {t("atsIntegrations.signatureHeader")}: <code>{p.signature_header}</code>
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {t("atsIntegrations.webhookUrl")}
            </p>
            <p className="mt-1 break-all text-xs">{p.webhook_url}</p>
            <button
              type="button"
              className="twin-link mt-2 text-left text-sm font-medium"
              onClick={() => void copy(p.webhook_url)}
            >
              {t("atsIntegrations.copyUrl")}
            </button>
            <p
              className={`mt-4 text-xs font-medium ${p.secret_configured ? "text-[var(--twin-accent)]" : "text-amber-700 dark:text-amber-400"}`}
            >
              {p.secret_configured ? t("atsIntegrations.secretOk") : t("atsIntegrations.secretMissing")}
            </p>
          </Card>
        ))}
      </div>
      <Card variant="soft" className="p-5">
        <h3 className="font-semibold">{t("atsIntegrations.linkageTitle")}</h3>
        <p className="twin-muted mt-2 text-sm leading-relaxed">{t("atsIntegrations.linkageBody")}</p>
        <a
          href="https://github.com/CzechowskiT/twin/blob/main/docs/ATS_WEBHOOKS.md"
          className="twin-link mt-3 inline-block text-sm font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("atsIntegrations.docsLink")}
        </a>
      </Card>
      <Link href="/workspace/recruiter" className="twin-link text-sm font-medium">
        ← {t("atsIntegrations.backRecruiter")}
      </Link>
    </div>
  );
}
