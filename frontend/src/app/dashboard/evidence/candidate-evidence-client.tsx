"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  EVIDENCE_TYPE_KEYS,
  type EvidenceType,
  type EvidenceVaultItem,
} from "@/lib/candidate-evidence-vault";
import type { TranslationKey } from "@/lib/i18n";
import { EVIDENCE_VAULT_SHIP_STATUS } from "@/lib/seven-day-d2-candidate";

type ListOut = { items: EvidenceVaultItem[]; total: number };

const typeLabelKey = (t: EvidenceType): TranslationKey => `candidateEvidence.type_${t}` as TranslationKey;

const READINESS_TYPES: EvidenceType[] = ["project", "case_study", "certificate", "github"];

function evidenceReadiness(items: EvidenceVaultItem[]) {
  const typesPresent = new Set(items.map((i) => i.evidence_type));
  const filled = READINESS_TYPES.filter((type) => typesPresent.has(type)).length;
  const hasNote = items.some((i) => Boolean(i.note?.trim()));
  const hasUrl = items.some((i) => Boolean(i.source_url?.trim()));
  return { filled, total: READINESS_TYPES.length, hasNote, hasUrl, typesPresent };
}

export default function CandidateEvidenceClient() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<EvidenceVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("project");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const loc = locale === "pl" ? "pl-PL" : "en-US";

  const readiness = useMemo(() => evidenceReadiness(items), [items]);

  const recruiterSummary = useMemo(() => {
    if (items.length === 0) return null;
    const highlights = items
      .filter((i) => i.title || i.note)
      .slice(0, 4)
      .map((i) => {
        const label = i.title?.trim() || i.skill_name;
        const detail = i.note?.trim();
        return detail ? `${label}: ${detail}` : label;
      });
    if (highlights.length === 0) return null;
    return highlights.join(" · ");
  }, [items]);

  const missingChecks = useMemo(() => {
    const checks: TranslationKey[] = [];
    if (!readiness.typesPresent.has("project") && !readiness.typesPresent.has("case_study")) {
      checks.push("candidateEvidence.missingProject");
    }
    if (!readiness.typesPresent.has("certificate") && !readiness.typesPresent.has("assessment")) {
      checks.push("candidateEvidence.missingCertificate");
    }
    if (!readiness.typesPresent.has("github")) {
      checks.push("candidateEvidence.missingGithub");
    }
    if (!readiness.hasNote) {
      checks.push("candidateEvidence.missingNote");
    }
    return checks;
  }, [readiness]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login/candidate");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ListOut>("/api/v1/candidates/me/evidence", {}, token);
      setItems(data.items ?? []);
    } catch {
      clearToken();
      router.push("/login/candidate");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = async () => {
    const token = getToken();
    if (!token || !skillName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(
        "/api/v1/candidates/me/evidence",
        {
          method: "POST",
          body: JSON.stringify({
            skill_name: skillName.trim(),
            evidence_type: evidenceType,
            title: title.trim() || null,
            note: note.trim() || null,
            source_url: sourceUrl.trim() || null,
          }),
        },
        token,
      );
      setSkillName("");
      setTitle("");
      setNote("");
      setSourceUrl("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: number) => {
    const token = getToken();
    if (!token) return;
    await apiFetch(`/api/v1/candidates/me/evidence/${id}`, { method: "DELETE" }, token);
    await load();
  };

  const readinessReady = readiness.filled >= 2 && readiness.hasNote && readiness.hasUrl;

  return (
    <Shell wide>
      <CandidateWorkspaceSubnav ariaLabel={t("candidateEvidence.title")} />
      <header className="mb-8 mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("candidateEvidence.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("candidateEvidence.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("candidateEvidence.lead")}</p>
        </div>
        <WorkspaceStatusBadge status={EVIDENCE_VAULT_SHIP_STATUS} />
      </header>

      <div className="mb-6 grid gap-4 lg:grid-cols-2" data-seven-day-evidence-readiness>
        <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
          <h2 className="text-sm font-semibold">{t("candidateEvidence.readinessTitle")}</h2>
          <p className="twin-muted mt-2 text-sm">{t("candidateEvidence.readinessLead")}</p>
          <p className="mt-3 text-sm font-medium">
            {t("candidateEvidence.readinessScore")
              .replace("{filled}", String(readiness.filled))
              .replace("{total}", String(readiness.total))}
          </p>
          <p className="twin-muted mt-2 text-xs">
            {readinessReady
              ? t("candidateEvidence.readinessReady")
              : t("candidateEvidence.readinessNeedsWork")}
          </p>
        </Card>
        <Card variant="soft" className="border-[var(--twin-border)]/80 p-4">
          <h2 className="text-sm font-semibold">{t("candidateEvidence.recruiterSummaryTitle")}</h2>
          <p className="twin-muted mt-2 text-sm">{t("candidateEvidence.recruiterSummaryLead")}</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
            {recruiterSummary ?? t("candidateEvidence.recruiterSummaryEmpty")}
          </p>
        </Card>
      </div>

      {missingChecks.length > 0 ? (
        <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
          <h2 className="text-sm font-semibold">{t("candidateEvidence.missingChecklistTitle")}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--twin-muted-strong)]">
            {missingChecks.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-4">
        <h2 className="text-sm font-semibold">{t("candidateEvidence.addTitle")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-[var(--twin-muted)]">{t("candidateEvidence.fieldSkill")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="text-[var(--twin-muted)]">{t("candidateEvidence.fieldType")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
            >
              {EVIDENCE_TYPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(typeLabelKey(key))}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="text-[var(--twin-muted)]">{t("candidateEvidence.fieldTitle")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="text-[var(--twin-muted)]">{t("candidateEvidence.fieldNote")}</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="text-[var(--twin-muted)]">{t("candidateEvidence.fieldUrl")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--twin-border)] bg-transparent px-3 py-2 text-sm"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </label>
        </div>
        <Button className="mt-4" disabled={saving || !skillName.trim()} onClick={() => void addItem()}>
          {saving ? t("candidateEvidence.saving") : t("candidateEvidence.addCta")}
        </Button>
      </Card>

      {loading ? <p className="twin-muted text-sm">{t("candidateEvidence.loading")}</p> : null}
      {!loading && items.length === 0 ? <p className="twin-muted text-sm">{t("candidateEvidence.empty")}</p> : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} variant="soft" className="border-[var(--twin-border)]/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.skill_name}</p>
                {item.title ? <p className="text-sm text-[var(--twin-muted-strong)]">{item.title}</p> : null}
              </div>
              <span className="rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs font-medium">
                {t(typeLabelKey(item.evidence_type))}
              </span>
            </div>
            {item.note ? <p className="twin-muted mt-2 text-sm">{item.note}</p> : null}
            {item.source_url ? (
              <a href={item.source_url} className="twin-link mt-2 inline-block text-xs" target="_blank" rel="noreferrer">
                {t("candidateEvidence.sourceLink")}
              </a>
            ) : null}
            <p className="twin-muted mt-2 text-xs">
              {t("candidateEvidence.added")} {new Date(item.created_at).toLocaleString(loc)}
            </p>
            <button
              type="button"
              className="twin-link mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium"
              onClick={() => void removeItem(item.id)}
            >
              {t("candidateEvidence.remove")}
            </button>
          </Card>
        ))}
      </ul>

      <p className="twin-muted mt-8 text-xs leading-relaxed">{t("candidateEvidence.scopeNote")}</p>
      <Link href="/dashboard" className="twin-link mt-4 inline-block text-sm font-medium">
        {t("candidateEvidence.backDashboard")}
      </Link>
    </Shell>
  );
}
