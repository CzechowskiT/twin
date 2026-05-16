"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { BentoSpotlight } from "@/components/marketing/bento-spotlight";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingCtaBand() {
  const { t } = useTranslation();
  return (
    <section className="border-t border-white/[0.06] py-24 sm:py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={80}>
          <BentoSpotlight className="flex flex-col items-start justify-between gap-8 p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="max-w-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                {t("home.tagline")}
              </p>
              <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-zinc-200 sm:text-xl">
                {t("home.featuresSubtitle")}
              </p>
            </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Link
                    href="/dashboard"
                    className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/[0.18] bg-gradient-to-b from-white/[0.12] to-white/[0.04] px-7 text-center text-sm font-bold tracking-tight text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] transition hover:border-sky-400/40 active:scale-[0.98]"
                  >
                    {t("home.twinForYourJob")}
                  </Link>
                  <Link
                    href="/register"
                    className="marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-white px-7 text-center text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]"
                  >
                    {t("home.getStarted")}
                  </Link>
              <Link
                href="/login"
                className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] px-7 text-center text-sm font-semibold text-white transition hover:border-white/25 active:scale-[0.98]"
              >
                {t("home.logIn")}
              </Link>
            </div>
          </BentoSpotlight>
        </ScrollReveal>
      </div>
    </section>
  );
}
