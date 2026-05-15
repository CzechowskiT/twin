"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-full max-w-3xl px-[var(--twin-page-x)] py-10 sm:py-14 md:py-20">
      <p className="text-sm font-semibold text-[var(--twin-accent)]">{t("home.tagline")}</p>
      <h1 className="twin-hero-title mt-3 text-3xl sm:mt-4 sm:text-4xl md:text-[2.75rem] md:leading-tight">
        {t("home.title")}
      </h1>
      <p className="twin-muted mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
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
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-3 text-sm min-[400px]:grid-cols-3 sm:mt-14 sm:gap-4">
        <div className="twin-card-panel p-4 text-center">
          <p className="font-semibold text-[var(--foreground)]">{t("home.scrape")}</p>
          <p className="twin-muted mt-1 text-xs leading-snug">{t("home.scrapeDesc")}</p>
        </div>
        <div className="twin-card-panel p-4 text-center">
          <p className="font-semibold text-[var(--foreground)]">{t("home.match")}</p>
          <p className="twin-muted mt-1 text-xs leading-snug">{t("home.matchDesc")}</p>
        </div>
        <div className="twin-card-panel p-4 text-center">
          <p className="font-semibold text-[var(--foreground)]">{t("home.track")}</p>
          <p className="twin-muted mt-1 text-xs leading-snug">{t("home.trackDesc")}</p>
        </div>
      </div>
    </div>
  );
}
