"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { MarketingStoryVideo } from "@/components/marketing/marketing-story-video";

const SCENE_MS = [5200, 7000, 6400, 6000] as const;
const LAST_SCENE = SCENE_MS.length - 1;

function scrollToVacationTest() {
  document.getElementById("vacation-test")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scenePanel(active: boolean, children: React.ReactNode) {
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-center px-5 py-10 transition-[opacity,transform] duration-700 ease-out sm:px-10 md:px-14 ${
        active
          ? "pointer-events-auto z-[2] translate-y-0 opacity-100"
          : "pointer-events-none z-0 translate-y-3 opacity-0"
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

/** ~25s storyboard: airport → split motion → calendar → CTA (skip / reduced-motion friendly). */
export function LandingVacationCinematic() {
  const { t } = useTranslation();
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<"playing" | "done">("playing");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const on = mq.matches;
      setReduceMotion(on);
      if (on) {
        setScene(LAST_SCENE);
        setPhase("done");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || phase !== "playing") return;
    const ms = SCENE_MS[scene] ?? 6000;
    if (scene >= LAST_SCENE) {
      const id = window.setTimeout(() => setPhase("done"), ms);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setScene((s) => Math.min(s + 1, LAST_SCENE)), ms);
    return () => window.clearTimeout(id);
  }, [scene, phase, reduceMotion]);

  const skip = useCallback(() => {
    setScene(LAST_SCENE);
    setPhase("done");
  }, []);

  const replay = useCallback(() => {
    if (reduceMotion) return;
    setScene(0);
    setPhase("playing");
  }, [reduceMotion]);

  const activities = [
    t("home.vacationActivity1"),
    t("home.vacationActivity2"),
    t("home.vacationActivity3"),
    t("home.vacationActivity4"),
    t("home.vacationActivity5"),
  ];

  const done = phase === "done";

  return (
    <section
      className="twin-container px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6"
      aria-label={t("home.vacationFilmAria")}
    >
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
        {t("home.vacationFilmEyebrow")}
      </p>
      <MarketingStoryVideo />
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/90 text-slate-50 shadow-[var(--twin-shadow-lg),inset_0_0_100px_rgba(0,0,0,0.35)]"
        style={{ minHeight: "min(72svh, 560px)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-[10%] bg-gradient-to-b from-black/50 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[12%] bg-gradient-to-t from-black/55 to-transparent" aria-hidden />

        {!reduceMotion ? (
          <div className="absolute right-3 top-3 z-[5] flex items-center gap-2 sm:right-4 sm:top-4">
            {!done ? (
              <button
                type="button"
                onClick={skip}
                className="twin-touch-target rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
              >
                {t("home.vacationSkip")}
              </button>
            ) : (
              <button
                type="button"
                onClick={replay}
                className="twin-touch-target rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
              >
                {t("home.vacationReplay")}
              </button>
            )}
          </div>
        ) : null}

        <div className="absolute bottom-4 left-0 right-0 z-[5] flex justify-center gap-2">
          {SCENE_MS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                i === scene && !done ? "w-6 bg-emerald-400" : done && i === LAST_SCENE ? "bg-emerald-400/90" : "bg-white/25"
              }`}
            />
          ))}
        </div>

        <div className="relative min-h-[min(72svh,560px)] pb-16">
          {scenePanel(scene === 0 && !reduceMotion, (
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                {t("home.vacationScene1Stamp")}
              </p>
              <p className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">✈️</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{t("home.vacationScene1Title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">{t("home.vacationScene1Body")}</p>
            </div>
          ))}

          {scenePanel(scene === 1 && !reduceMotion, (
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-10">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/90">{t("home.vacationScene2Stamp")}</p>
                <p className="mt-3 text-lg font-semibold leading-snug">{t("home.vacationScene2Relax")}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 p-5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{t("home.vacationScene2WorkLabel")}</p>
                <ul className="mt-4 space-y-2.5 text-sm leading-snug text-slate-200">
                  {activities.map((line, i) => (
                    <li
                      key={`vacation-act-${i}`}
                      className={`border-l-2 border-emerald-400/60 pl-3 transition-all duration-500 ${
                        scene === 1 ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"
                      }`}
                      style={{ transitionDelay: scene === 1 ? `${200 + i * 380}ms` : "0ms" }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {scenePanel(scene === 2 && !reduceMotion, (
            <div className="mx-auto max-w-lg">
              <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                {t("home.vacationScene3Stamp")}
              </p>
              <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight sm:text-3xl">{t("home.vacationScene3Title")}</h2>
              <div className="mt-8 space-y-2 rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-[13px] leading-relaxed text-slate-200 shadow-inner sm:text-sm">
                <p className="border-b border-white/10 pb-2">{t("home.vacationCal1")}</p>
                <p className="border-b border-white/10 py-2">{t("home.vacationCal2")}</p>
                <p className="border-b border-white/10 py-2">{t("home.vacationCal3")}</p>
                <p className="pt-2 text-slate-400">{t("home.vacationCalMore")}</p>
              </div>
              <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">{t("home.vacationScene3Disclaimer")}</p>
            </div>
          ))}

          {scenePanel(scene === 3 || reduceMotion, (
            <div className="pointer-events-auto mx-auto max-w-xl px-1 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                {t("home.vacationScene4Stamp")}
              </p>
              <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("home.vacationScene4Title")}</h2>
              <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">{t("home.vacationScene4Body")}</p>
              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/register"
                  className="twin-touch-target inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400"
                >
                  {t("home.vacationScene4CtaRegister")}
                </Link>
                <button
                  type="button"
                  onClick={scrollToVacationTest}
                  className="twin-touch-target inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  {t("home.vacationScene4CtaAnchor")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
