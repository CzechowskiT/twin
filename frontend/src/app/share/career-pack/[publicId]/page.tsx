"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ViewPayload = {
  sections?: unknown[];
  pack_type?: string;
  can_download?: boolean;
  permission?: string;
  expires_at?: string | null;
};

/**
 * Epic 2.19 — recipient read-only Career Pack view.
 * Secret arrives in URL fragment only; exchanged then cleared from history.
 */
export default function CareerPackShareRecipientPage() {
  const params = useParams();
  const publicId = String(params?.publicId || "");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<ViewPayload | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const m = /(?:^|#|&)key=([^&]+)/.exec(hash);
        const secret = m ? decodeURIComponent(m[1]) : "";
        if (!secret) {
          setStatus("error");
          return;
        }
        // Clear fragment from history ASAP
        try {
          const clean = `${window.location.pathname}${window.location.search}`;
          window.history.replaceState(null, "", clean);
        } catch {
          /* ignore */
        }
        const ex = await fetch(`/api/v1/share/career-pack/${encodeURIComponent(publicId)}/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ secret }),
          credentials: "include",
          cache: "no-store",
        });
        if (!ex.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const exBody = (await ex.json()) as { session_token?: string };
        const token = exBody.session_token || "";
        if (!cancelled) setSessionToken(token || null);
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers["X-Twin-Share-Session"] = token;
        const vw = await fetch(`/api/v1/share/career-pack/${encodeURIComponent(publicId)}/view`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        if (!vw.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const body = (await vw.json()) as ViewPayload;
        if (!cancelled) {
          setView(body);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Private Career Pack</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Read-only recipient view. TWIN does not track opens. This is not a public profile.
      </p>
      {status === "loading" ? <p className="mt-6 text-sm">Opening…</p> : null}
      {status === "error" ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          Unavailable.
        </p>
      ) : null}
      {status === "ready" && view ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            Type: {view.pack_type || "—"} · Permission: {view.permission || "—"}
          </p>
          {view.expires_at ? (
            <p className="text-xs text-neutral-500">Expires: {view.expires_at}</p>
          ) : null}
          <pre className="max-h-[28rem] overflow-auto rounded border border-neutral-300 p-3 text-xs">
            {JSON.stringify(view.sections || [], null, 2)}
          </pre>
          {view.can_download && sessionToken ? (
            <a
              className="inline-block text-sm underline"
              href={`/api/v1/share/career-pack/${encodeURIComponent(publicId)}/download?format=pdf`}
              onClick={(e) => {
                e.preventDefault();
                void fetch(
                  `/api/v1/share/career-pack/${encodeURIComponent(publicId)}/download?format=pdf`,
                  {
                    headers: { "X-Twin-Share-Session": sessionToken },
                    credentials: "include",
                    cache: "no-store",
                  },
                ).then(async (r) => {
                  if (!r.ok) return;
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${publicId}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}
            >
              Download PDF
            </a>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
