"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  CANDIDATE_EVIDENCE_ROUTE,
  EVIDENCE_TYPE_KEYS,
  type EvidenceType,
  type EvidenceVaultItem,
} from "@/lib/candidate-evidence-vault";
import type { TranslationKey } from "@/lib/i18n";

type ListOut = { items: EvidenceVaultItem[]; total: number };

const typeLabelKey = (t: EvidenceType): TranslationKey => `candidateEvidence.type_${t}` as TranslationKey;

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

  return (
    <Shell wide>
      <CandidateWorkspaceSubnav ariaLabel={t("candidateEvidence.title")} />
      <header className="mb-8 mt-6 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("candidateEvidence.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("candidateEvidence.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("candidateEvidence.lead")}</p>
      </header>

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
