"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Portfolio = {
  is_public?: boolean;
  projects?: { id: number; title: string; status: string; confidentiality: string }[];
  stories?: { id: number; title: string; theme: string; framework: string }[];
  evidence?: { id: number; title: string; claim_kind: string; quality: string }[];
  readiness?: Record<string, string | boolean | object>;
  safety?: { public_portfolio?: boolean; fabricated_achievements?: boolean };
};

type EvidenceAgg = {
  sources?: { id: number; title: string; source_kind: string; content_hash?: string }[];
  evidence?: { id: number; title: string; claim_kind: string; quality: string; metrics?: unknown[] }[];
  fields?: { id: number; field_name: string; confirmation: string; claim_kind: string }[];
  completeness?: { tasks?: { title: string }[]; weak?: number };
  safety?: { public_portfolio?: boolean };
};

export default function PortfolioPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [evidence, setEvidence] = useState<EvidenceAgg | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceText, setSourceText] = useState(
    "Built APIs with FastAPI and PostgreSQL.\nLed migration of billing service.\nImproved test coverage for payment flows.",
  );

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      const [p, e] = await Promise.all([
        apiFetch<Portfolio>("/api/v1/candidates/me/portfolio", {}, token),
        apiFetch<EvidenceAgg>("/api/v1/candidates/me/career-evidence", {}, token),
      ]);
      setPortfolio(p);
      setEvidence(e);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerEvidence.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function registerAndExtract() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const src = await apiFetch<{ source: { id: number } }>(
        "/api/v1/candidates/me/career-evidence/sources",
        {
          method: "POST",
          body: JSON.stringify({
            source_kind: "manual",
            title: "Synthetic notes",
            content_text: sourceText,
            is_synthetic: true,
            mime_type: "text/plain",
          }),
        },
        token,
      );
      await apiFetch(
        "/api/v1/candidates/me/career-evidence/extract",
        {
          method: "POST",
          body: JSON.stringify({ source_id: src.source.id, text: sourceText }),
        },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerEvidence.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmField(id: number) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-evidence/fields/${id}/action`,
        { method: "POST", body: JSON.stringify({ action: "confirm" }) },
        token,
      );
      await load();
    } catch {
      setErr(t("careerEvidence.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function exportEvidence() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch("/api/v1/candidates/me/career-evidence/export", {}, token);
      await load();
    } catch {
      setErr(t("careerEvidence.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteHistory() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        "/api/v1/candidates/me/career-evidence/history/delete",
        { method: "POST", body: JSON.stringify({}) },
        token,
      );
      await load();
    } catch {
      setErr(t("careerEvidence.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function addAchievement() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const srcId = evidence?.sources?.[0]?.id;
      await apiFetch(
        "/api/v1/candidates/me/career-evidence/achievements",
        {
          method: "POST",
          body: JSON.stringify({
            framework: "STAR",
            title: "Delivered API migration",
            parts: {
              situation: "Legacy billing service",
              action: "Led FastAPI migration",
              result: "UNKNOWN",
              metric: "UNKNOWN",
            },
            source_ids: srcId ? [srcId] : [],
            skills: ["Python", "FastAPI"],
          }),
        },
        token,
      );
      await load();
    } catch {
      setErr(t("careerEvidence.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{t("careerEvidence.eyebrow")}</p>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("careerEvidence.portfolioTitle")}</h1>
          <p className="twin-muted mt-1 max-w-2xl text-sm">{t("careerEvidence.lead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("careerEvidence.portfolioTitle")} />
      </div>

      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <IaActionableEmpty
        areaId="evidence"
        show={!err && (evidence?.evidence?.length ?? 0) === 0 && (portfolio?.evidence?.length ?? 0) === 0}
        isLoading={portfolio === null && !err}
        isError={Boolean(err)}
      />

      <Card className="mb-4">
        <p className="text-xs text-neutral-500">{t("careerEvidence.privacyBanner")}</p>
        <p className="mt-1 text-sm font-medium">
          {t("careerEvidence.privateOnly")} · public={String(portfolio?.is_public ?? false)}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-[var(--twin-border)] p-2 text-sm">
            <p className="text-xs text-neutral-500">{t("careerEvidence.evidenceReadiness")}</p>
            <p className="font-medium">{String((portfolio?.readiness as Record<string, string>)?.evidence_readiness || "—")}</p>
          </div>
          <div className="rounded border border-[var(--twin-border)] p-2 text-sm">
            <p className="text-xs text-neutral-500">{t("careerEvidence.portfolioReadiness")}</p>
            <p className="font-medium">{String((portfolio?.readiness as Record<string, string>)?.portfolio_readiness || "—")}</p>
          </div>
          <div className="rounded border border-[var(--twin-border)] p-2 text-sm">
            <p className="text-xs text-neutral-500">{t("careerEvidence.weakEvidence")}</p>
            <p className="font-medium">{evidence?.completeness?.weak ?? "—"}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-semibold">{t("careerEvidence.uploadExtract")}</h2>
        <textarea
          className="mt-2 w-full rounded border border-[var(--twin-border)] bg-transparent p-2 text-sm"
          rows={4}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          aria-label={t("careerEvidence.sourceLabel")}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void registerAndExtract()}>
            {t("careerEvidence.runExtract")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void addAchievement()}
          >
            {t("careerEvidence.addAchievement")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void load()}
          >
            {t("careerEvidence.refresh")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void exportEvidence()}
          >
            {t("careerEvidence.export")}
          </Button>
          <Button
            type="button"
            className="border border-[var(--twin-border)] bg-transparent"
            disabled={busy}
            onClick={() => void deleteHistory()}
          >
            {t("careerEvidence.deleteHistory")}
          </Button>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-base font-semibold">{t("careerEvidence.sourceViewer")}</h2>
        <ul className="mt-2 space-y-2">
          {(evidence?.sources || []).slice(0, 6).map((s) => (
            <li key={s.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
              <p className="font-medium">{s.title}</p>
              <p className="twin-muted text-xs">
                {s.source_kind} · hash={(s.content_hash || "—").slice(0, 12)}
              </p>
            </li>
          ))}
          {(evidence?.sources || []).length === 0 ? (
            <li className="twin-muted text-sm">{t("careerEvidence.emptySources")}</li>
          ) : null}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">{t("careerEvidence.evidenceList")}</h2>
          <ul className="mt-2 space-y-2">
            {(evidence?.evidence || []).slice(0, 8).map((item) => (
              <li key={item.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="twin-muted text-xs">
                  {item.claim_kind} · {item.quality}
                </p>
              </li>
            ))}
            {(evidence?.evidence || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("careerEvidence.emptyEvidence")}</li>
            ) : null}
          </ul>
          <h3 className="mt-4 text-sm font-medium">{t("careerEvidence.confirmFields")}</h3>
          <ul className="mt-2 space-y-2">
            {(evidence?.fields || [])
              .filter((f) => f.confirmation === "pending")
              .slice(0, 5)
              .map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {f.field_name} · {f.claim_kind}
                  </span>
                  <Button
                    type="button"
                    className="text-xs"
                    disabled={busy}
                    onClick={() => void confirmField(f.id)}
                  >
                    {t("careerEvidence.confirm")}
                  </Button>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">{t("careerEvidence.projects")}</h2>
          <ul className="mt-2 space-y-2">
            {(portfolio?.projects || []).map((p) => (
              <li key={p.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="twin-muted text-xs">
                  {p.status} · {p.confidentiality}
                </p>
              </li>
            ))}
            {(portfolio?.projects || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("careerEvidence.emptyProjects")}</li>
            ) : null}
          </ul>
          <h2 className="mt-4 text-base font-semibold">{t("careerEvidence.stories")}</h2>
          <ul className="mt-2 space-y-2">
            {(portfolio?.stories || []).map((s) => (
              <li key={s.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                <p className="font-medium">{s.title}</p>
                <p className="twin-muted text-xs">
                  {s.framework} · {s.theme}
                </p>
              </li>
            ))}
            {(portfolio?.stories || []).length === 0 ? (
              <li className="twin-muted text-sm">{t("careerEvidence.emptyStories")}</li>
            ) : null}
          </ul>
        </Card>
      </div>

      <p className="twin-muted mt-4 text-[11px]">{t("careerEvidence.disclaimer")}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/evidence" className="twin-link">
          {t("careerEvidence.openVault")} →
        </Link>
        <Link href="/dashboard/career-pack" className="twin-link">
          {t("careerPack.nav")} →
        </Link>
      </div>
    </Shell>
  );
}
