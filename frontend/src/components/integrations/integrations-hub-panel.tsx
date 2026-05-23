"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { AtsIntegrationsPanel } from "@/components/recruiter/ats-integrations-panel";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  INTEGRATION_CATEGORY_ORDER,
  type IntegrationCatalogItem,
  type IntegrationHubSection,
  type IntegrationPersona,
  integrationsForPersona,
} from "@/lib/integration-catalog";
import type { TranslationKey } from "@/lib/i18n";

type HubStatus = {
  connections: Record<string, { status: string; external_account_id?: string | null }>;
};

type Props = {
  persona: IntegrationPersona;
  showLegacyAts?: boolean;
  backHref?: string;
  backLabelKey?: TranslationKey;
};

const SECTIONS: IntegrationHubSection[] = ["pracuj", "linkedin", "other_ats"];

function categoryLabelKey(category: IntegrationCatalogItem["category"]): TranslationKey {
  return `integrationsHub.category.${category}` as TranslationKey;
}

function providerLabelKey(provider: IntegrationCatalogItem["provider"]): TranslationKey {
  if (provider === "pracuj") return "integrationsHub.providerPracuj";
  if (provider === "linkedin") return "integrationsHub.providerLinkedin";
  if (provider === "twin") return "integrationsHub.providerTwin";
  return "integrationsHub.providerOther";
}

function IntegrationCard({
  item,
  status,
  onConnect,
  busy,
}: {
  item: IntegrationCatalogItem;
  status?: string;
  onConnect: (item: IntegrationCatalogItem) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const connected = status === "connected";
  const isComingSoon =
    item.availability === "coming_soon" || item.connectionType === "coming_soon";

  const actionLabel = connected
    ? t("integrationsHub.actionConnected")
    : item.connectionType === "link_out"
      ? t("integrationsHub.actionLearnMore")
      : isComingSoon
        ? t("integrationsHub.actionComingSoon")
        : item.connectionType === "api_key"
          ? t("integrationsHub.actionConfigure")
          : t("integrationsHub.actionConnect");

  const badge =
    item.availability === "beta"
      ? t("integrationsHub.badgeBeta")
      : isComingSoon
        ? t("integrationsHub.badgeComingSoon")
        : connected
          ? t("integrationsHub.badgeConnected")
          : t("integrationsHub.badgeAvailable");

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
            {t(providerLabelKey(item.provider))} · {t(categoryLabelKey(item.category))}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{t(item.nameKey)}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
          {badge}
        </span>
      </div>
      <p className="twin-muted mt-2 flex-1 text-sm leading-relaxed">{t(item.descriptionKey)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-sm disabled:opacity-50"
          disabled={busy || (isComingSoon && item.connectionType !== "link_out")}
          onClick={() => onConnect(item)}
        >
          {busy ? t("common.loading") : actionLabel}
        </button>
        <a
          href={item.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="twin-link twin-touch-target inline-flex items-center text-sm font-medium"
        >
          {t("integrationsHub.actionOfficialSite")}
        </a>
      </div>
    </Card>
  );
}

function ConnectModal({
  item,
  apiKey,
  setApiKey,
  accountId,
  setAccountId,
  gdprConsent,
  setGdprConsent,
  busy,
  onClose,
  onSubmit,
}: {
  item: IntegrationCatalogItem;
  apiKey: string;
  setApiKey: (v: string) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  gdprConsent: boolean;
  setGdprConsent: (v: boolean) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const needsGdpr = item.id === "pracuj-strefa" || item.id === "pracuj-erecruiter";
  const canSubmit = Boolean(apiKey.trim() && accountId.trim() && (!needsGdpr || gdprConsent));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-lg font-semibold">{t(item.nameKey)}</h3>
        <p className="twin-muted mt-2 text-sm">{t("integrationsHub.connectModalLead")}</p>
        <label className="mt-4 block text-sm font-medium">
          {t("integrationsHub.connectAccountId")}
          <input
            className="twin-input mt-1 w-full"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder={t("integrationsHub.connectAccountIdPlaceholder")}
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t("integrationsHub.connectApiKey")}
          <input
            type="password"
            className="twin-input mt-1 w-full"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("integrationsHub.connectApiKeyPlaceholder")}
          />
        </label>
        {needsGdpr ? (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
            />
            <span>{t("integrationsHub.connectGdprConsent")}</span>
          </label>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button type="button" className="twin-btn-secondary flex-1 text-sm" onClick={onClose}>
            {t("integrationsHub.cancelButton")}
          </button>
          <button
            type="button"
            className="twin-btn-primary flex-1 text-sm disabled:opacity-50"
            disabled={busy || !canSubmit}
            onClick={onSubmit}
          >
            {busy ? t("common.loading") : t("integrationsHub.actionConnect")}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function IntegrationsHubPanel({
  persona,
  showLegacyAts = false,
  backHref = "/workspace/recruiter",
  backLabelKey = "integrationsHub.backRecruiter",
}: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<IntegrationHubSection>("pracuj");
  const [statusMap, setStatusMap] = useState<HubStatus["connections"]>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<IntegrationCatalogItem | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const raw = await apiFetch<HubStatus>("/api/v1/integrations/hub/status", {}, token);
      setStatusMap(raw.connections ?? {});
    } catch {
      setStatusMap({});
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const visibleSections = useMemo(() => {
    const out: IntegrationHubSection[] = [];
    for (const s of SECTIONS) {
      if (s === "other_ats") {
        if (showLegacyAts) out.push(s);
        continue;
      }
      if (integrationsForPersona(persona, s).length > 0) out.push(s);
    }
    return out;
  }, [persona, showLegacyAts]);

  useEffect(() => {
    if (!visibleSections.includes(section)) {
      setSection(visibleSections[0] ?? "pracuj");
    }
  }, [section, visibleSections]);

  const grouped = useMemo(() => {
    const rows = section === "other_ats" ? [] : integrationsForPersona(persona, section);
    const map = new Map<IntegrationCatalogItem["category"], IntegrationCatalogItem[]>();
    for (const cat of INTEGRATION_CATEGORY_ORDER) map.set(cat, []);
    for (const row of rows) map.get(row.category)?.push(row);
    return INTEGRATION_CATEGORY_ORDER.filter((cat) => (map.get(cat)?.length ?? 0) > 0).map(
      (cat) => ({ category: cat, items: map.get(cat) ?? [] }),
    );
  }, [persona, section]);

  const submitConnect = async (
    item: IntegrationCatalogItem,
    body: { api_key?: string; account_id?: string; gdpr_consent?: boolean },
  ) => {
    const token = getToken();
    if (!token || !item.connectEndpoint) return;
    setBusyId(item.id);
    try {
      const res = await apiFetch<{ status: string; message: string; authorize_url?: string | null }>(
        item.connectEndpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration_id: item.id, ...body }),
        },
        token,
      );
      if (res.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
      toast.success(res.message || t("integrationsHub.toastConnected"));
      setConnectTarget(null);
      await loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("integrationsHub.toastFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleConnect = async (item: IntegrationCatalogItem) => {
    if (item.connectionType === "link_out") {
      window.open(item.officialUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.connectionType === "embedded" && item.provider === "twin") {
      window.location.href = persona === "candidate" ? "/dashboard" : "/recruiter/jobs";
      return;
    }
    if (item.connectionType === "coming_soon" || item.availability === "coming_soon") {
      toast(t("integrationsHub.toastComingSoon"), { icon: "ℹ️" });
      return;
    }
    if (item.connectionType === "api_key") {
      setConnectTarget(item);
      setApiKey("");
      setAccountId("");
      setGdprConsent(false);
      return;
    }
    if (item.connectionType === "oauth" && item.connectEndpoint) {
      await submitConnect(item, {});
    }
  };

  const sectionLabel = (s: IntegrationHubSection): TranslationKey => {
    if (s === "pracuj") return "integrationsHub.tabPracuj";
    if (s === "linkedin") return "integrationsHub.tabLinkedin";
    return "integrationsHub.tabOtherAts";
  };

  return (
    <div className="space-y-8">
      {persona !== "candidate" && (
        <p className="twin-muted max-w-3xl text-sm leading-relaxed">{t("integrationsHub.gdprNote")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {visibleSections.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              section === s
                ? "bg-[var(--twin-accent)] text-white"
                : "bg-[var(--twin-surface-soft)] text-[var(--foreground)]"
            }`}
            onClick={() => setSection(s)}
          >
            {t(sectionLabel(s))}
          </button>
        ))}
      </div>

      {section === "other_ats" && showLegacyAts ? (
        <AtsIntegrationsPanel embedded />
      ) : (
        grouped.map(({ category, items }) => (
          <section key={category} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t(categoryLabelKey(category))}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  status={statusMap[item.id]?.status}
                  onConnect={handleConnect}
                  busy={busyId === item.id}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {connectTarget ? (
        <ConnectModal
          item={connectTarget}
          apiKey={apiKey}
          setApiKey={setApiKey}
          accountId={accountId}
          setAccountId={setAccountId}
          gdprConsent={gdprConsent}
          setGdprConsent={setGdprConsent}
          busy={busyId === connectTarget.id}
          onClose={() => setConnectTarget(null)}
          onSubmit={() =>
            void submitConnect(connectTarget, {
              api_key: apiKey.trim(),
              account_id: accountId.trim(),
              gdpr_consent: gdprConsent,
            })
          }
        />
      ) : null}

      <Link href={backHref} className="twin-link inline-block text-sm font-medium">
        ← {t(backLabelKey)}
      </Link>
    </div>
  );
}
