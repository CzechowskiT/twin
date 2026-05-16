"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <section className="twin-hero-band twin-hero-band--bleed">
        <div className="mx-auto w-full max-w-[var(--twin-max-width)]">
          <p className="text-sm font-semibold text-[var(--twin-accent)]">{t("home.tagline")}</p>
          <h1 className="twin-hero-title mt-3 text-3xl sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-tight">
            {t("home.title")}
          </h1>
          <p className="twin-muted mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
            {t("home.description")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link href="/register" className="twin-btn-primary twin-touch-target text-center">
              {t("home.getStarted")}
            </Link>
            <Link href="/login" className="twin-btn-secondary twin-touch-target text-center">
              {t("home.logIn")}
            </Link>
          </div>
        </div>
      </section>

      <div className="twin-container pb-10 sm:pb-14">
        <div className="grid grid-cols-1 gap-3 pt-8 text-sm min-[400px]:grid-cols-3 sm:gap-4 sm:pt-10">
          <div className="twin-card-panel twin-card-panel--soft p-4 text-center">
            <p className="font-semibold text-[var(--foreground)]">{t("home.scrape")}</p>
            <p className="twin-muted mt-1 text-xs leading-snug">{t("home.scrapeDesc")}</p>
          </div>
          <div className="twin-card-panel twin-card-panel--soft p-4 text-center">
            <p className="font-semibold text-[var(--foreground)]">{t("home.match")}</p>
            <p className="twin-muted mt-1 text-xs leading-snug">{t("home.matchDesc")}</p>
          </div>
          <div className="twin-card-panel twin-card-panel--soft p-4 text-center">
            <p className="font-semibold text-[var(--foreground)]">{t("home.track")}</p>
            <p className="twin-muted mt-1 text-xs leading-snug">{t("home.trackDesc")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
