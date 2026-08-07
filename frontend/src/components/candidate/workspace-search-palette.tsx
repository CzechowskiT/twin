"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { WORKSPACE_SEARCH_MESSAGES_EN } from "@/lib/workspace-search-messages";

type SearchHit = {
  group?: string;
  type?: string;
  opaque_id?: string;
  deep_link?: string;
  title?: string;
  excerpt?: string;
  status?: string;
  truth?: string;
  source?: string;
  match_reasons?: string[];
};

type SearchResponse = {
  groups?: { capability?: SearchHit[]; record?: SearchHit[] };
  counts?: { total?: number };
  empty_reason?: string | null;
  privacy_paused?: boolean;
  mutations?: number;
};

type MsgKey = keyof typeof WORKSPACE_SEARCH_MESSAGES_EN;

function tWs(t: (k: string) => string, key: MsgKey): string {
  return t(`workspaceSearch.${key}`);
}

/** Cmd/Ctrl+K palette — retrieval only; no query persistence. */
export function WorkspaceSearchPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const isPreview = pathname === "/preview" || Boolean(pathname?.startsWith("/preview/"));

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setData(null);
    setErr(null);
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isPreview]);

  useEffect(() => {
    if (!open || isPreview) return;
    const tmr = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(tmr);
  }, [open, isPreview]);

  useEffect(() => {
    if (!open || isPreview) return;
    const token = getToken();
    if (!token) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setData(null);
      return;
    }
    let cancelled = false;
    const tmr = window.setTimeout(() => {
      setBusy(true);
      setErr(null);
      void apiFetch<SearchResponse>(
        "/api/v1/candidates/me/workspace-search",
        {
          method: "POST",
          body: JSON.stringify({ q: trimmed, include_archived: includeArchived }),
          cache: "no-store",
        },
        token
      )
        .then((res) => {
          if (!cancelled) setData(res);
        })
        .catch(() => {
          if (!cancelled) setErr(tWs(t, "error"));
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [q, open, includeArchived, t, isPreview]);

  useEffect(() => {
    if (!getToken()) close();
  }, [pathname, close]);

  const go = (href: string) => {
    if (!href.startsWith("/")) return;
    close();
    router.push(href);
  };

  if (isPreview) {
    return null;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="twin-btn-ghost fixed bottom-4 right-4 z-40 min-h-[2.75rem] rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 text-sm shadow-sm md:bottom-auto md:right-6 md:top-4"
        onClick={() => setOpen(true)}
        data-testid="workspace-search-open"
        aria-keyshortcuts="Meta+K Control+K"
      >
        {tWs(t, "nav")}
        <span className="ml-2 text-xs opacity-60">{tWs(t, "openShortcut")}</span>
      </button>
    );
  }

  const caps = data?.groups?.capability || [];
  const recs = data?.groups?.record || [];
  const showEmpty =
    q.trim().length >= 2 && !busy && caps.length === 0 && recs.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="workspace-search-dialog"
    >
      <div className="w-full max-w-xl rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-4 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id={titleId} className="text-lg font-medium">
              {tWs(t, "title")}
            </h2>
            <p className="text-xs opacity-70">{tWs(t, "noHistory")}</p>
          </div>
          <button type="button" className="twin-btn-ghost text-sm" onClick={close}>
            {tWs(t, "close")}
          </button>
        </div>
        <label className="sr-only" htmlFor="workspace-search-q">
          {tWs(t, "placeholder")}
        </label>
        <input
          id="workspace-search-q"
          ref={inputRef}
          className="min-h-[2.75rem] w-full rounded-md border border-[var(--twin-border)] bg-transparent px-3"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tWs(t, "placeholder")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-testid="workspace-search-input"
        />
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          {tWs(t, "includeArchived")}
        </label>
        {busy ? <p className="mt-2 text-sm opacity-70">{tWs(t, "loading")}</p> : null}
        {err ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {q.trim().length > 0 && q.trim().length < 2 ? (
          <p className="mt-2 text-sm opacity-70">{tWs(t, "emptyShort")}</p>
        ) : null}
        {data?.privacy_paused ? (
          <p className="mt-2 text-sm opacity-80">{tWs(t, "emptyPaused")}</p>
        ) : null}
        {showEmpty ? (
          <p className="mt-3 text-sm opacity-80">
            {data?.empty_reason === "privacy_pause" ? tWs(t, "emptyPaused") : tWs(t, "empty")}
          </p>
        ) : null}
        <ResultGroup
          title={tWs(t, "groupCapability")}
          items={caps}
          onPick={go}
          t={t}
        />
        <ResultGroup title={tWs(t, "groupRecord")} items={recs} onPick={go} t={t} />
        <p className="mt-3 text-xs opacity-60">{tWs(t, "truthNote")}</p>
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  items,
  onPick,
  t,
}: {
  title: string;
  items: SearchHit[];
  onPick: (href: string) => void;
  t: (k: string) => string;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-3" aria-label={title}>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((hit) => (
          <li key={hit.opaque_id || hit.title}>
            <button
              type="button"
              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--twin-border)]/30"
              onClick={() => hit.deep_link && onPick(hit.deep_link)}
            >
              <span className="font-medium">{hit.title}</span>
              {hit.status === "archived" ? (
                <span className="ml-2 text-xs opacity-60">{tWs(t, "archivedLabel")}</span>
              ) : null}
              <span className="mt-0.5 block text-xs opacity-70">{hit.excerpt}</span>
              <span className="mt-0.5 block text-xs opacity-50">
                {tWs(t, "truth")}: {hit.truth} · {tWs(t, "source")}: {hit.source}
                {hit.match_reasons?.length
                  ? ` · ${tWs(t, "matchReasons")}: ${hit.match_reasons.join(", ")}`
                  : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
