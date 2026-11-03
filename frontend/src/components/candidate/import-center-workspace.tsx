"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import {
  IMPORT_CENTER_MESSAGES_EN,
  IMPORT_CENTER_MESSAGES_PL,
} from "@/lib/import-center-messages";
import { useTranslation } from "@/components/language-provider";
import { WorkspaceHandoffBanner, startWorkspaceHandoff } from "@/components/candidate/workspace-handoff-banner";
import { useRouter } from "next/navigation";

type Family = "document" | "tracker" | "twin_export" | "linkedin_export";

type PreviewItem = {
  item_key: string;
  target_kind: string;
  title: string;
  summary?: string;
  claim_kind?: string;
  dup?: boolean;
  preview_escaped?: string;
};

type Batch = {
  batch_key: string;
  family: string;
  state: string;
  canonical_mutations: number;
  preview_version: number;
  preview?: { items?: PreviewItem[]; version?: number };
  rejection_code?: string | null;
};

function copy(locale: string) {
  return locale === "pl" ? IMPORT_CENTER_MESSAGES_PL : IMPORT_CENTER_MESSAGES_EN;
}

export function ImportCenterWorkspace() {
  const { locale, t } = useTranslation();
  const router = useRouter();
  const m = copy(locale);
  const [family, setFamily] = useState<Family>("document");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const res = await apiFetch<{ batches: Batch[] }>("/api/v1/candidates/me/import/batches");
    setBatches(res.batches || []);
  }, []);

  useEffect(() => {
    void refreshList().catch(() => undefined);
  }, [refreshList]);

  async function startBatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Batch>("/api/v1/candidates/me/import/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family }),
      });
      setBatch(res);
      setSelected([]);
      await refreshList();
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | null) {
    if (!file || !batch) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch<Batch>(
        `/api/v1/candidates/me/import/batches/${batch.batch_key}/upload`,
        { method: "POST", body: fd },
      );
      setBatch(res);
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  async function processPreview() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Batch>(
        `/api/v1/candidates/me/import/batches/${batch.batch_key}/process`,
        { method: "POST" },
      );
      setBatch(res);
      const keys = (res.preview?.items || []).map((i) => i.item_key);
      setSelected(keys);
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Batch>(
        `/api/v1/candidates/me/import/batches/${batch.batch_key}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_keys: selected,
            preview_version: batch.preview_version,
            idempotency_key: `appr-${batch.batch_key}-${batch.preview_version}`,
          }),
        },
      );
      setBatch(res);
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Batch>(
        `/api/v1/candidates/me/import/batches/${batch.batch_key}/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotency_key: `cmt-${batch.batch_key}-${batch.preview_version}`,
          }),
        },
      );
      setBatch(res);
      await refreshList();
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  async function rollback() {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Batch>(
        `/api/v1/candidates/me/import/batches/${batch.batch_key}/rollback`,
        { method: "POST" },
      );
      setBatch(res);
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  }

  const items = batch?.preview?.items || [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8" data-testid="import-center-root">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.title}</h1>
        <p className="text-sm text-[var(--twin-muted-strong)]">{m.lead}</p>
        <p className="text-xs text-[var(--twin-muted-strong)]">{m.markerTruth}</p>
        <p className="text-xs text-[var(--twin-muted-strong)]">{m.markerNoAuto}</p>
        <p className="text-xs text-[var(--twin-muted-strong)]">{m.banZip}</p>
        <p className="text-xs text-[var(--twin-muted-strong)]">{m.malwareNote}</p>
        <p className="text-xs text-[var(--twin-muted-strong)]">{m.notFirstValue}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/privacy-center" className="underline">
            {m.backSettings}
          </Link>
          <Link href="/dashboard/portfolio" className="underline">
            {m.backEvidence}
          </Link>
        </div>
        <WorkspaceHandoffBanner expectedDestRouteKey="import_center" />
      </header>

      <section className="flex flex-col gap-3 rounded border border-[var(--twin-border)] p-4">
        <label className="text-sm font-medium">
          <select
            className="mt-1 w-full rounded border border-[var(--twin-border)] bg-transparent px-3 py-2"
            value={family}
            onChange={(e) => setFamily(e.target.value as Family)}
            data-testid="import-family"
          >
            <option value="document">{m.familyDocument}</option>
            <option value="tracker">{m.familyTracker}</option>
            <option value="twin_export">{m.familyTwin}</option>
            <option value="linkedin_export">{m.familyLinkedin}</option>
          </select>
        </label>
        <button
          type="button"
          className="w-fit rounded border border-[var(--twin-border)] px-3 py-2 text-sm"
          onClick={() => void startBatch()}
          disabled={busy}
          data-testid="import-start"
        >
          {m.createBatch}
        </button>
      </section>

      {batch ? (
        <section className="flex flex-col gap-3 rounded border border-[var(--twin-border)] p-4" data-testid="import-batch">
          <p className="text-sm">
            {m.state}: <strong data-testid="import-state">{batch.state}</strong>
          </p>
          <p className="text-sm">
            {m.mutations}: <strong data-testid="import-mutations">{batch.canonical_mutations}</strong>
          </p>
          {batch.rejection_code ? (
            <p className="text-sm text-red-700" data-testid="import-rejection">
              {batch.rejection_code}
            </p>
          ) : null}
          <input
            type="file"
            data-testid="import-file"
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void processPreview()} disabled={busy} data-testid="import-process">
              {m.process}
            </button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void approve()} disabled={busy || !selected.length} data-testid="import-approve">
              {m.approve}
            </button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void commit()} disabled={busy} data-testid="import-commit">
              {m.commit}
            </button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void rollback()} disabled={busy} data-testid="import-rollback">
              {m.rollback}
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              data-workspace-handoff-cta="import_to_data_trust"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  const url = await startWorkspaceHandoff({
                    handoffId: "import_to_data_trust",
                    objectRef: batch.batch_key,
                    objectRevision: String(batch.preview_version ?? batch.state),
                  });
                  if (url) router.push(url);
                })();
              }}
            >
              {t("handoff.startHandoff")}
            </button>
          </div>

          {items.length ? (
            <div className="flex flex-col gap-2" data-testid="import-preview">
              <h2 className="text-base font-medium">{m.preview}</h2>
              {items.map((it) => (
                <label key={it.item_key} className="flex gap-2 rounded border border-[var(--twin-border)] p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(it.item_key)}
                    onChange={(e) => {
                      setSelected((prev) =>
                        e.target.checked ? [...prev, it.item_key] : prev.filter((k) => k !== it.item_key),
                      );
                    }}
                  />
                  <span>
                    <strong>{it.title}</strong>
                    {it.dup ? " · CONFLICTING" : ""}
                    <br />
                    <span className="text-[var(--twin-muted-strong)]">{it.summary}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {busy ? <p className="text-sm">{m.loading}</p> : null}

      <section>
        <h2 className="mb-2 text-base font-medium">{m.empty && batches.length === 0 ? m.empty : "Batches"}</h2>
        <ul className="flex flex-col gap-1 text-sm" data-testid="import-batch-list">
          {batches.map((b) => (
            <li key={b.batch_key}>
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setBatch(b);
                  setSelected((b.preview?.items || []).map((i) => i.item_key));
                }}
              >
                {b.family} · {b.state} · mut={b.canonical_mutations}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
