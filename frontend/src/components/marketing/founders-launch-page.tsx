"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { TranslationKey } from "@/lib/i18n";
import { betaFetchStats, type BetaStats } from "@/lib/beta-api";

const POLL_MS = 10_000;

function splitManifesto(t: (k: TranslationKey) => string): string[] {
  return t("first1000.manifestoBody").split(/\n\n+/).filter(Boolean);
}

export function FoundersLaunchPage() {
  const { t, locale } = useTranslation();
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevLeft = useRef<number | null>(null);
  const videoId = process.env.NEXT_PUBLIC_LAUNCH_MANIFESTO_YOUTUBE_ID?.trim();

  const load = useCallback(async () => {
    try {
      const s = await betaFetchStats();
      setStats(s);
      setErr(null);
      if (prevLeft.current !== null && prevLeft.current !== s.spots_left) {
        setPulse(true);
        window.setTimeout(() => setPulse(false), 700);
      }
      prevLeft.current = s.spots_left;
    } catch {
      setErr(t("first1000.statsErr"));
    }
  }, [t]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "/first-1000";
    return `${window.location.origin}/first-1000`;
  }, []);

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  const spots = stats?.spots_left ?? null;
  const cap = stats?.cap ?? 1000;
  const filled = stats ? Math.min(100, Math.round((stats.total_signups / Math.max(cap, 1)) * 100)) : 0;
  const soldOut = spots === 0;
  const manifestoParas = splitManifesto(t);

  return (
    <div className="founders-launch relative min-h-[100dvh] overflow-hidden bg-[#020617] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 10% -10%, rgba(52,211,153,0.35), transparent 55%), radial-gradient(ellipse 70% 60% at 100% 20%, rgba(124,58,237,0.32), transparent 50%), radial-gradient(ellipse 80% 50% at 50% 110%, rgba(14,165,233,0.12), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <header className="relative z-20 flex items-center justify-between gap-4 px-[var(--twin-page-x)] py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight text-emerald-300/90 hover:text-emerald-200">
          TWIN
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 backdrop-blur hover:border-emerald-400/40 hover:text-white"
          >
            {t("nav.login")}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-16 px-[var(--twin-page-x)] pb-24 pt-6 sm:pt-10">
        <section className="text-center sm:text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-300/90">{t("first1000.kicker")}</p>
          <h1 className="mt-5 text-balance font-black leading-[0.92] tracking-tight text-white [text-shadow:0_0_60px_rgba(16,185,129,0.25)] sm:max-w-4xl sm:text-[clamp(2.25rem,5.2vw,3.75rem)]">
            {t("first1000.headline")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
            {t("first1000.subline")}
          </p>
        </section>

        <section
          className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-10"
          aria-labelledby="founders-counter-title"
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" aria-hidden />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="founders-counter-title" className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                {t("first1000.counterEyebrow")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{t("first1000.counterCaption")}</p>
            </div>
            <div
              className={`tabular-nums transition-transform duration-500 ease-out ${pulse ? "scale-[1.04]" : "scale-100"}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <output
                className="block text-center font-black leading-none text-white sm:text-right"
                style={{ fontSize: "clamp(3.5rem, 16vw, 9rem)" }}
                aria-labelledby="founders-counter-title"
              >
                {spots === null ? "—" : spots}
              </output>
              <p className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-right">
                {t("first1000.counterOf")} {cap}
              </p>
            </div>
          </div>

          <div className="relative mt-8 h-3 overflow-hidden rounded-full bg-slate-800/80" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-[width] duration-700 ease-out"
              style={{ width: `${filled}%` }}
            />
          </div>
          {err ? <p className="mt-4 text-center text-sm text-amber-200/90 sm:text-left">{err}</p> : null}
        </section>

        <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-300/90">{t("first1000.manifestoEyebrow")}</p>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t("first1000.manifestoTitle")}</h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-300 sm:text-[15px] sm:leading-relaxed">
              {manifestoParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {videoId ? (
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg">
                <iframe
                  title={t("first1000.videoTitle")}
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-4 text-xs leading-relaxed text-slate-500">
                {t("first1000.videoHint")}
              </p>
            )}
          </div>

          <div className="flex flex-col justify-between gap-8 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/40 to-slate-950/60 p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-200/80">{t("first1000.ctaEyebrow")}</p>
              <p className="mt-4 text-lg font-semibold text-white">{t("first1000.ctaLead")}</p>
              {soldOut ? (
                <p className="mt-4 text-sm leading-relaxed text-emerald-100/90">{t("first1000.soldOutBody")}</p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-emerald-50/85">{t("first1000.ctaFinePrint")}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={soldOut ? "/register" : "/beta/join"}
                className="inline-flex min-h-[3.25rem] flex-1 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-8 text-center text-sm font-bold tracking-tight text-slate-950 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.65)] transition hover:brightness-110"
              >
                {soldOut ? t("first1000.ctaOpenProduct") : t("first1000.ctaWishlist")}
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-[3.25rem] flex-1 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-center text-sm font-semibold text-white backdrop-blur hover:border-white/35"
              >
                {t("first1000.ctaRegister")}
              </Link>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">{t("first1000.shareEyebrow")}</p>
              <p className="mt-2 break-all font-mono text-xs text-emerald-200/90">{shareUrl}</p>
              <button
                type="button"
                onClick={() => void copyShare()}
                className="mt-3 w-full rounded-full border border-white/15 bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/15 sm:w-auto sm:px-6"
              >
                {copied ? t("first1000.shareCopied") : t("first1000.shareButton")}
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-10 text-center text-xs leading-relaxed text-slate-500 sm:text-left">
          <p>{t("first1000.footerLegal")}</p>
          <p className="mt-3">
            <Link href="/privacy" className="text-emerald-400/90 underline-offset-4 hover:underline">
              {locale === "pl" ? "Prywatność" : "Privacy"}
            </Link>
            {" · "}
            <Link href="/terms" className="text-emerald-400/90 underline-offset-4 hover:underline">
              {locale === "pl" ? "Regulamin" : "Terms"}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
