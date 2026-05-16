"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
export default function Home() {
  const { t } = useTranslation();

  const features = [
    { step: "01", title: t("home.scrape"), body: t("home.scrapeDesc") },
    { step: "02", title: t("home.match"), body: t("home.matchDesc") },
    { step: "03", title: t("home.track"), body: t("home.trackDesc") },
  ];

  return (
    <div className="relative z-0 flex flex-1 flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 md:min-h-[min(78vh,52rem)] md:pt-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
            {t("home.tagline")}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:mt-7 sm:text-5xl sm:leading-[1.05] md:text-6xl md:leading-[1.02]">
            {t("home.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg sm:leading-relaxed">
            {t("home.description")}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/register"
              className="twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full bg-white px-8 text-center text-[15px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_18px_48px_-12px_rgb(0_0_0/0.55)] transition hover:bg-zinc-100"
            >
              {t("home.getStarted")}
            </Link>
            <Link
              href="/login"
              className="twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-8 text-center text-[15px] font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.08]"
            >
              {t("home.logIn")}
            </Link>
          </div>
        </section>

        <section className="border-t border-white/[0.08] bg-black/35 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mb-10 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">TWIN</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {t("home.featuresTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-base">{t("home.featuresSubtitle")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {features.map((f) => (
                <article
                  key={f.step}
                  className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition hover:border-white/[0.14] hover:from-white/[0.09]"
                >
                  <span className="font-mono text-xs font-medium text-zinc-500 transition group-hover:text-zinc-400">
                    {f.step}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                  <div className="mt-6 h-px w-10 bg-gradient-to-r from-sky-400/80 to-violet-400/60 opacity-80" />
                </article>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-white/[0.06] pt-10 sm:flex-row sm:items-center">
              <p className="max-w-md text-sm leading-relaxed text-zinc-500">{t("home.footerHint")}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-end">
                <Link
                  href="/register"
                  className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-white px-6 text-center text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  {t("home.getStarted")}
                </Link>
                <Link
                  href="/login"
                  className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/15 px-6 text-center text-sm font-semibold text-white transition hover:border-white/30"
                >
                  {t("home.logIn")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
