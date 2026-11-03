"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type NdaStatus = {
  nda_version_current: string;
  accepted: boolean;
  accepted_at: string | null;
  required_before_data_room_upload: boolean;
};

type DocumentItem = {
  id: number;
  category: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: string;
  storage_key_present: boolean;
  download_available: boolean;
  created_at: string | null;
};

type DocumentsResponse = {
  items: DocumentItem[];
  count: number;
  s3_configured: boolean;
  secure_download_held: boolean;
  blocker_when_no_s3: string;
  metadata_only_honesty: boolean;
};

export function InvestorDataRoomLivePanel() {
  const [nda, setNda] = useState<NdaStatus | null>(null);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void (async () => {
      try {
        const [ndaRes, docsRes] = await Promise.all([
          apiFetch<NdaStatus>("/api/v1/platform/wave4/nda/status", {}, token),
          apiFetch<DocumentsResponse>("/api/v1/platform/wave4/data-room/documents", {}, token),
        ]);
        setNda(ndaRes);
        setDocs(docsRes);
      } catch {
        setError("Unable to load data room status.");
      }
    })();
  }, []);

  async function acceptNda() {
    const token = getToken();
    if (!token || !nda) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/platform/wave4/nda/accept", {
        method: "POST",
        body: JSON.stringify({ nda_version: nda.nda_version_current }),
      }, token);
      const refreshed = await apiFetch<NdaStatus>("/api/v1/platform/wave4/nda/status", {}, token);
      setNda(refreshed);
    } catch {
      setError("NDA acceptance failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid="investor-data-room-live-panel"
    >
      <h2 className="text-lg font-semibold">Live data room (metadata)</h2>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">
        Authenticated metadata path only. Secure download requires founder S3 keys — not claimed as LIVE.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {nda ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            NDA ({nda.nda_version_current}):{" "}
            <span className="font-medium">{nda.accepted ? "Accepted" : "Required"}</span>
          </p>
          {!nda.accepted ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void acceptNda()}
              className="twin-btn-secondary twin-touch-target text-sm disabled:opacity-50"
              data-testid="investor-data-room-nda-accept"
            >
              {busy ? "Recording…" : "Accept NDA (current version)"}
            </button>
          ) : null}
        </div>
      ) : null}
      {docs ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm">
            Documents: <span className="font-medium">{docs.count}</span>
            {docs.secure_download_held ? (
              <span className="twin-muted ml-2 text-xs">({docs.blocker_when_no_s3})</span>
            ) : null}
          </p>
          {docs.items.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {docs.items.map((item) => (
                <li key={item.id} className="rounded border border-[var(--twin-border)] px-3 py-2">
                  <span className="font-medium">{item.filename}</span>
                  <span className="twin-muted ml-2 text-xs">
                    {item.category} · {item.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="twin-muted text-xs">No documents registered yet.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
