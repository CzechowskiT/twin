"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, hasActiveSession } from "@/lib/auth";
import { loginPathWithNext } from "@/lib/login-redirect";

type ClaimRow = {
  claim_id: string;
  claim_type: string;
  claim_key: string;
  claim_value: string;
  status: string;
  source_type: string;
  created_at: string | null;
};

type ClaimsList = {
  items: ClaimRow[];
  count: number;
};

export default function AiComplianceClaimsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subjectType, setSubjectType] = useState("candidate");
  const [subjectId, setSubjectId] = useState("me");
  const [claimType, setClaimType] = useState("skill");
  const [claimKey, setClaimKey] = useState("");
  const [claimValue, setClaimValue] = useState("");
  const [sourceType, setSourceType] = useState("self_declared");

  const loadClaims = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ClaimsList>("/api/v1/platform/ai-compliance/claims", {}, token);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiComplianceClaims.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const token = getToken();
    if (!hasActiveSession() || !token) {
      router.replace(loginPathWithNext("/dashboard/evidence/claims"));
      return;
    }
    void loadClaims(token);
  }, [loadClaims, router]);

  const createClaim = async () => {
    const token = getToken();
    if (!token || !claimKey.trim() || !claimValue.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/api/v1/platform/ai-compliance/claims", {
        method: "POST",
        body: JSON.stringify({
          subject_type: subjectType,
          subject_id: subjectId,
          claim_type: claimType,
          claim_key: claimKey.trim(),
          claim_value: claimValue.trim(),
          status: "DECLARED",
          source_type: sourceType,
          actor_type: "human",
        }),
      }, token);
      setSuccess(t("aiComplianceClaims.createSuccess"));
      setClaimKey("");
      setClaimValue("");
      await loadClaims(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiComplianceClaims.createError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell wide>
      <CandidateWorkspaceSubnav active="evidence" />
      <header className="mb-6 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("aiComplianceClaims.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("aiComplianceClaims.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("aiComplianceClaims.lead")}</p>
      </header>

      <Card variant="soft" className="mb-6 border-amber-500/30 p-4" data-testid="ai-compliance-claims-partial-banner">
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("aiComplianceClaims.partialBanner")}</p>
      </Card>

      {error ? <p className="mb-4 text-sm text-rose-500">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-emerald-600">{success}</p> : null}

      <Card variant="soft" className="mb-6 p-5" data-testid="ai-compliance-claims-list">
        <h2 className="text-lg font-semibold">{t("aiComplianceClaims.title")}</h2>
        {loading ? (
          <p className="twin-muted mt-3 text-sm">{t("aiComplianceClaims.loading")}</p>
        ) : items.length === 0 ? (
          <p className="twin-muted mt-3 text-sm">{t("aiComplianceClaims.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((row) => (
              <li key={row.claim_id} className="rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm">
                <span className="font-medium">{row.claim_key}</span>
                <span className="twin-muted ml-2">{row.claim_value}</span>
                <span className="ml-2 rounded-full bg-[var(--twin-accent-muted)]/40 px-2 py-0.5 text-xs">
                  {t("aiComplianceClaims.statusLabel")}: {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="soft" className="p-5" data-testid="ai-compliance-claims-create">
        <h2 className="text-lg font-semibold">{t("aiComplianceClaims.createTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.subjectType")}</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" value={subjectType} onChange={(e) => setSubjectType(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.subjectId")}</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.claimType")}</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" value={claimType} onChange={(e) => setClaimType(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.sourceType")}</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.claimKey")}</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" value={claimKey} onChange={(e) => setClaimKey(e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="twin-muted text-xs">{t("aiComplianceClaims.claimValue")}</span>
            <textarea className="mt-1 w-full rounded-lg border border-[var(--twin-border)] px-3 py-2" rows={3} value={claimValue} onChange={(e) => setClaimValue(e.target.value)} />
          </label>
        </div>
        <Button type="button" className="mt-4" disabled={saving} onClick={() => void createClaim()}>
          {saving ? t("aiComplianceClaims.creating") : t("aiComplianceClaims.createCta")}
        </Button>
      </Card>

      <Link href="/dashboard/evidence" className="twin-link mt-8 inline-block text-sm font-medium">
        ← {t("candidateEvidence.addTitle")}
      </Link>
    </Shell>
  );
}
