"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  BETA_REFERRAL_STORAGE_KEY,
  betaFetchStats,
  betaMatchPreview,
  type BetaMatchItem,
  type BetaStats,
} from "@/lib/beta-api";

function subscribeOrigin() {
  return () => {};
}

function getOriginSnapshot() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function getOriginServerSnapshot() {
  return "";
}

function useOrigin(): string {
  return useSyncExternalStore(subscribeOrigin, getOriginSnapshot, getOriginServerSnapshot);
}

function BetaLandingInner() {
  const searchParams = useSearchParams();
  const origin = useOrigin();
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [matches, setMatches] = useState<BetaMatchItem[] | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem(BETA_REFERRAL_STORAGE_KEY, ref.trim().toLowerCase());
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void betaFetchStats()
        .then((s) => {
          if (alive) {
            setStats(s);
            setErr(null);
          }
        })
        .catch((e: unknown) => {
          if (alive) setErr(e instanceof Error ? e.message : "Stats failed");
        });
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const tickerText = useMemo(() => {
    if (!stats?.recent?.length) return "Join the beta — your spot updates live.";
    return stats.recent.join("   ·   ");
  }, [stats]);

  async function runDemo() {
    setDemoBusy(true);
    setErr(null);
    try {
      const out = await betaMatchPreview(title || "Product Manager");
      setMatches(out.matches);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Preview failed");
      setMatches(null);
    } finally {
      setDemoBusy(false);
    }
  }

  const shareUrl = origin ? `${origin}/beta` : "/beta";
  const refStored =
    typeof window !== "undefined" ? localStorage.getItem(BETA_REFERRAL_STORAGE_KEY) : null;
  const shareWithRef = refStored ? `${shareUrl}?ref=${encodeURIComponent(refStored)}` : shareUrl;

  const linkedInShare = () => {
    const u = encodeURIComponent(shareWithRef);
    const text = encodeURIComponent(
      "I joined the TWIN beta waitlist — an AI career workspace that ranks real jobs from live boards. Limited spots.",
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}&summary=${text}`, "_blank");
  };

  return (
    <div className="beta-container">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--beta-muted)]">TWIN · Beta access</p>
          <h1 className="beta-hero-title mt-2">
            Stop doom-scrolling jobs.
            <br />
            <span className="beta-hero-accent">Let the signal come to you.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--beta-muted)]">
            TWIN aggregates validated listings, scores them with the same matcher as the product, and keeps your
            pipeline in one place — automation lands in layers, consent-first (see Privacy). This page uses{" "}
            <strong>live numbers</strong> from the API: open jobs in DB, boards configured, waitlist size.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="beta-pill">No fake press logos</span>
          <span className="beta-pill">Real match preview</span>
        </div>
      </header>

      <div className="beta-stat-grid mb-6">
        <div className="beta-stat">
          <div className="beta-stat-value">{stats?.spots_left ?? "—"}</div>
          <div className="beta-stat-label">Spots left</div>
        </div>
        <div className="beta-stat">
          <div className="beta-stat-value">{stats?.total_signups ?? "—"}</div>
          <div className="beta-stat-label">On waitlist</div>
        </div>
        <div className="beta-stat">
          <div className="beta-stat-value">{stats?.validated_jobs ?? "—"}</div>
          <div className="beta-stat-label">Jobs in DB</div>
        </div>
        <div className="beta-stat">
          <div className="beta-stat-value">{stats?.job_boards ?? "—"}</div>
          <div className="beta-stat-label">Boards wired</div>
        </div>
      </div>

      {stats?.campaign_ends_at ? (
        <p className="mb-4 text-center text-sm font-semibold text-[var(--beta-blue)]">
          Campaign clock (server): {new Date(stats.campaign_ends_at).toLocaleString()}
        </p>
      ) : null}

      <div className="beta-ticker mb-8 rounded-xl border border-[rgb(11_18_32/0.08)] bg-white py-3 text-sm text-[var(--beta-muted)]">
        <div className="beta-ticker-inner font-medium">{tickerText}</div>
      </div>

      {err ? <p className="mb-4 text-center text-sm text-red-600">{err}</p> : null}

      <section className="beta-card mb-8">
        <h2 className="text-lg font-bold text-[var(--beta-ink)]">Try the matcher on live data</h2>
        <p className="mt-1 text-sm text-[var(--beta-muted)]">
          Uses the production rule-based scorer against validated jobs we already scraped (scores vary with your
          title).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="beta-input sm:flex-1"
            placeholder="e.g. Senior Account Executive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="button" className="beta-cta beta-cta-primary shrink-0" disabled={demoBusy} onClick={runDemo}>
            {demoBusy ? "Scoring…" : "Find sample matches"}
          </button>
        </div>
        {matches && matches.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.url} className="rounded-lg border border-[rgb(11_18_32/0.08)] bg-[var(--beta-bg)] px-3 py-2">
                <span className="font-bold text-[var(--beta-orange)]">{m.score}%</span>{" "}
                <span className="font-semibold">{m.title}</span> — {m.company}{" "}
                <span className="text-[var(--beta-muted)]">({m.job_board})</span>
              </li>
            ))}
          </ul>
        ) : matches && matches.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--beta-muted)]">
            No strong matches for that title yet — widen the title or run scrapers to fill the DB.
          </p>
        ) : null}
      </section>

      <section className="beta-card mb-8">
        <h2 className="text-lg font-bold">Queue perks (honest)</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--beta-muted)]">
          <li>✅ Referral link moves you up when friends join (tracked server-side).</li>
          <li>✅ LinkedIn share flag +5 priority points (once).</li>
          <li>✅ Voice note +50 points (optional — stored like other uploads).</li>
          <li>✅ CV upload +3 points and instant top-3 preview from your saved title.</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--beta-muted)]">
          We do <strong>not</strong> claim press logos we don&apos;t have. Tune copy after you have real proof points.
        </p>
      </section>

      <section className="beta-card mb-10">
        <h2 className="text-lg font-bold">Viral loop</h2>
        <p className="mt-1 text-sm text-[var(--beta-muted)]">
          Share with your ref in the URL. After you join, your dashboard shows the exact link to copy.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="beta-cta beta-cta-secondary" onClick={linkedInShare}>
            Share on LinkedIn
          </button>
          <button
            type="button"
            className="beta-cta beta-cta-ghost"
            onClick={() => void navigator.clipboard.writeText(shareWithRef)}
          >
            Copy link
          </button>
        </div>
        <p className="mt-3 break-all text-xs text-[var(--beta-muted)]">{shareWithRef}</p>
      </section>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/beta/join" className="beta-cta beta-cta-primary px-8 text-center no-underline">
          Join the waitlist — email (10s)
        </Link>
        <Link href="/" className="beta-cta beta-cta-ghost no-underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function BetaLandingPage() {
  return (
    <Suspense fallback={<div className="beta-container p-8 text-sm text-[var(--beta-muted)]">Loading…</div>}>
      <BetaLandingInner />
    </Suspense>
  );
}
