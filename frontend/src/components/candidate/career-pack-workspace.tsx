"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Artifact = {
  artifact_kind: string;
  artifact_ref: string;
  label: string;
  approved?: boolean;
};

type FieldMeta = {
  field_key: string;
  sensitive: boolean;
  default_on: boolean;
  internal_only: boolean;
  selectable: boolean;
};

type Pack = {
  pack_key: string;
  pack_type: string;
  state: string;
  title: string;
  preview_hash?: string | null;
  disclosure?: Record<string, boolean>;
  artifact_refs?: { artifact_kind: string; artifact_ref: string }[];
  preview?: { sections?: unknown[]; warnings?: string[] };
  requires_stale_confirmation?: boolean;
  warnings?: string[];
  has_pdf?: boolean;
  has_zip?: boolean;
  first_value_satisfied?: boolean;
};

export function CareerPackWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [active, setActive] = useState<Pack | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [disclosure, setDisclosure] = useState<Record<string, boolean>>({});
  const [packType, setPackType] = useState("GENERAL_EVIDENCE_PORTFOLIO_PACK");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [cat, arts, list] = await Promise.all([
        apiFetch<{ disclosure_fields?: FieldMeta[] }>(
          "/api/v1/candidates/me/career-packs/catalog",
          {},
          token,
        ),
        apiFetch<{ artifacts?: Artifact[] }>(
          "/api/v1/candidates/me/career-packs/artifacts",
          {},
          token,
        ),
        apiFetch<{ packs?: Pack[] }>("/api/v1/candidates/me/career-packs", {}, token),
      ]);
      setFields((cat.disclosure_fields || []).filter((f) => f.selectable));
      setArtifacts(arts.artifacts || []);
      setPacks(list.packs || []);
      const disc: Record<string, boolean> = {};
      for (const f of cat.disclosure_fields || []) {
        if (!f.selectable) continue;
        disc[f.field_key] = Boolean(f.default_on) && !f.sensitive;
      }
      setDisclosure(disc);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function createDraft() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Pack>(
        "/api/v1/candidates/me/career-packs",
        { method: "POST", body: JSON.stringify({ pack_type: packType }) },
        token,
      );
      setActive(data);
      setDisclosure(data.disclosure || disclosure);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function saveSelection() {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const refs = artifacts
        .filter((a) => selected[`${a.artifact_kind}:${a.artifact_ref}`])
        .map((a) => ({ artifact_kind: a.artifact_kind, artifact_ref: a.artifact_ref }));
      const data = await apiFetch<Pack>(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/selection`,
        {
          method: "POST",
          body: JSON.stringify({ artifact_refs: refs, disclosure }),
        },
        token,
      );
      setActive(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function runPreview(staleConfirmed: boolean) {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await saveSelectionQuiet(token);
      const data = await apiFetch<Pack>(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/preview`,
        { method: "POST", body: JSON.stringify({ stale_confirmed: staleConfirmed }) },
        token,
      );
      setActive(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function saveSelectionQuiet(token: string) {
    if (!active) return;
    const refs = artifacts
      .filter((a) => selected[`${a.artifact_kind}:${a.artifact_ref}`])
      .map((a) => ({ artifact_kind: a.artifact_kind, artifact_ref: a.artifact_ref }));
    const data = await apiFetch<Pack>(
      `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/selection`,
      {
        method: "POST",
        body: JSON.stringify({ artifact_refs: refs, disclosure }),
      },
      token,
    );
    setActive(data);
  }

  async function confirmGenerate() {
    if (!active?.preview_hash) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Pack>(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ preview_hash: active.preview_hash }),
        },
        token,
      );
      setActive(data);
      await load();
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function download(fmt: "zip" | "pdf") {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const blob = await apiFetchBlob(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/download?format=${fmt}`,
        { cache: "no-store" },
        token,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${active.pack_key}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Pack>(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}/revoke`,
        { method: "POST", body: "{}" },
        token,
      );
      setActive(data);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-packs/${encodeURIComponent(active.pack_key)}`,
        { method: "DELETE" },
        token,
      );
      setActive(null);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerPack.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerPack.nav")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerPack.title")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerPack.lead")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted)]">
          <li>{t("careerPack.markerNoSend")}</li>
          <li>{t("careerPack.markerNoLlm")}</li>
          <li>{t("careerPack.markerNotFirstValue")}</li>
          <li>{t("careerPack.noExternal")}</li>
        </ul>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/privacy-center">{t("careerPack.backSettings")}</Link>
          <Link href="/dashboard/application-studio">{t("careerPack.openStudio")}</Link>
          <Link href="/dashboard/portfolio">{t("careerPack.openEvidence")}</Link>
        </div>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}

        <Card>
          <h2 className="mb-3 text-lg font-medium">{t("careerPack.packs")}</h2>
          {(packs || []).length === 0 ? (
            <p className="text-sm text-[var(--twin-muted)]">{t("careerPack.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {packs.map((p) => (
                <li key={p.pack_key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {p.pack_type} — {t("careerPack.state")}: {p.state}
                  </span>
                  <Button
                    type="button"
                    className="border border-[var(--twin-border)] bg-transparent"
                    onClick={() => setActive(p)}
                  >
                    {p.pack_key.slice(0, 18)}…
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="block text-xs">{t("careerPack.create")}</span>
              <select
                className="mt-1 rounded border border-[var(--twin-border)] bg-transparent px-2 py-1"
                value={packType}
                onChange={(e) => setPackType(e.target.value)}
              >
                <option value="OPPORTUNITY_APPLICATION_PACK">
                  {t("careerPack.typeOpportunity")}
                </option>
                <option value="GENERAL_EVIDENCE_PORTFOLIO_PACK">
                  {t("careerPack.typePortfolio")}
                </option>
              </select>
            </label>
            <Button type="button" disabled={busy} onClick={() => void createDraft()}>
              {t("careerPack.create")}
            </Button>
          </div>
        </Card>

        {active ? (
          <Card data-career-pack-active>
            <p className="text-sm">
              {t("careerPack.state")}: <strong>{active.state}</strong>
            </p>
            <h3 className="mt-3 font-medium">{t("careerPack.artifacts")}</h3>
            {(artifacts || []).length === 0 ? (
              <p className="text-sm text-[var(--twin-muted)]">{t("careerPack.emptyArtifacts")}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {artifacts.map((a) => {
                  const key = `${a.artifact_kind}:${a.artifact_ref}`;
                  return (
                    <li key={key}>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[key])}
                          onChange={(e) =>
                            setSelected((s) => ({ ...s, [key]: e.target.checked }))
                          }
                        />
                        <span>
                          {a.label} ({a.artifact_kind})
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3 className="mt-4 font-medium">{t("careerPack.disclosure")}</h3>
            <p className="text-xs text-[var(--twin-muted)]">{t("careerPack.sensitiveOff")}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {fields.map((f) => (
                <li key={f.field_key}>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(disclosure[f.field_key])}
                      onChange={(e) =>
                        setDisclosure((d) => ({ ...d, [f.field_key]: e.target.checked }))
                      }
                    />
                    <span>
                      {f.field_key}
                      {f.sensitive ? " *" : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                className="border border-[var(--twin-border)] bg-transparent"
                onClick={() => void saveSelection()}
              >
                {t("careerPack.disclosure")}
              </Button>
              <Button type="button" disabled={busy} onClick={() => void runPreview(false)}>
                {t("careerPack.preview")}
              </Button>
              {active.requires_stale_confirmation ? (
                <Button type="button" disabled={busy} onClick={() => void runPreview(true)}>
                  {t("careerPack.confirmStale")}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={busy || !active.preview_hash || active.state !== "AWAITING_CONFIRMATION"}
                onClick={() => void confirmGenerate()}
              >
                {t("careerPack.confirmGenerate")}
              </Button>
            </div>
            {active.preview_hash ? (
              <p className="mt-2 text-xs text-[var(--twin-muted)]">
                {t("careerPack.previewHash")}: {active.preview_hash.slice(0, 16)}…
              </p>
            ) : null}
            {active.preview?.sections ? (
              <pre className="mt-3 max-h-48 overflow-auto rounded border border-[var(--twin-border)] p-2 text-xs">
                {JSON.stringify(active.preview.sections, null, 2)}
              </pre>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || active.state !== "READY"}
                onClick={() => void download("zip")}
              >
                {t("careerPack.downloadZip")}
              </Button>
              <Button
                type="button"
                disabled={busy || active.state !== "READY"}
                className="border border-[var(--twin-border)] bg-transparent"
                onClick={() => void download("pdf")}
              >
                {t("careerPack.downloadPdf")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                className="border border-[var(--twin-border)] bg-transparent"
                onClick={() => void revoke()}
              >
                {t("careerPack.revoke")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                className="border border-[var(--twin-border)] bg-transparent"
                onClick={() => void remove()}
              >
                {t("careerPack.delete")}
              </Button>
            </div>
            {busy ? <p className="mt-2 text-sm">{t("careerPack.loading")}</p> : null}
          </Card>
        ) : null}
      </main>
    </Shell>
  );
}
