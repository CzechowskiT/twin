"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { ProductFilmPlayer } from "@/components/marketing/demo/sales/product-film-player";
import { RoleFlowCards } from "@/components/marketing/demo/sales/role-flow-cards";
import { RoleStory } from "@/components/marketing/demo/experience/role-story";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import { trackDemoCtaClick } from "@/lib/demo/demo-analytics";
import { readSaveDataPreference, subscribeSaveDataPreference } from "@/lib/demo/save-data-preference";
import {
  salesRoleJourneyScenes,
  type SalesDemoRole,
} from "@/lib/demo/sales-demo-config";

function usePrefersReducedMotion(): { reducedMotion: boolean; checked: boolean } {
  const [state, setState] = useState({ reducedMotion: false, checked: false });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setState({ reducedMotion: mq.matches, checked: true });
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return state;
}

function useSaveData(): { saveData: boolean; checked: boolean } {
  const [state, setState] = useState({ saveData: false, checked: false });
  useEffect(() => {
    const sync = () => setState({ saveData: readSaveDataPreference(), checked: true });
    sync();
    return subscribeSaveDataPreference(sync);
  }, []);
  return state;
}

export function SalesDemoExperience() {
  const { t, locale } = useTranslation();
  const { reducedMotion, checked: motionChecked } = usePrefersReducedMotion();
  const { saveData, checked: dataChecked } = useSaveData();
  const [filmDone, setFilmDone] = useState(false);
  const [activeRole, setActiveRole] = useState<SalesDemoRole | null>(null);
  const [flowStarted, setFlowStarted] = useState(false);
  const flowRef = useRef<HTMLElement | null>(null);

  const showRoles = filmDone || reducedMotion || saveData;

  const scrollToFlow = useCallback(() => {
    flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleFilmComplete = useCallback(() => {
    setFilmDone(true);
  }, []);

  const handleSkip = useCallback(() => {
    setFilmDone(true);
    requestAnimationFrame(scrollToFlow);
  }, [scrollToFlow]);

  const handleRoleSelect = useCallback(
    (role: SalesDemoRole) => {
      setActiveRole(role);
      setFlowStarted(true);
      requestAnimationFrame(scrollToFlow);
    },
    [scrollToFlow],
  );

  useEffect(() => {
    if (motionChecked && reducedMotion) setFilmDone(true);
  }, [motionChecked, reducedMotion]);

  useEffect(() => {
    if (dataChecked && saveData) setFilmDone(true);
  }, [dataChecked, saveData]);

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <div className="sales-demo marketing-copy-rail min-w-0" data-sales-demo>
          <header className="sales-demo-hero" data-sales-demo-hero>
            <span className="demo-sample-badge demo-sample-badge--hero">{t("demoSales.sampleBadge")}</span>
            <p className="sales-demo-hero__eyebrow">{t("demoSales.heroEyebrow")}</p>
            <h1 className="sales-demo-hero__title">{t("demoSales.heroTitle")}</h1>
            <p className="sales-demo-hero__lead">{t("demoSales.heroLead")}</p>
            <div className="sales-demo-hero__ctas">
              <button
                type="button"
                className="twin-btn-primary twin-touch-target"
                data-demo-cta="watch"
                onClick={() => {
                  trackDemoCtaClick({ cta_id: "watch_demo", locale });
                  if (!filmDone) {
                    document.querySelector<HTMLButtonElement>("[data-demo-video-play]")?.click();
                  } else {
                    scrollToFlow();
                  }
                }}
              >
                {t("demoSales.ctaWatch")}
              </button>
              <Link
                href="/waitlist"
                className="twin-btn-secondary twin-touch-target"
                data-demo-cta="presentation"
                onClick={() => trackDemoCtaClick({ cta_id: "book_presentation", locale })}
              >
                {t("demoSales.ctaPresentation")}
              </Link>
            </div>
            <p className="demo-sample-note">{t("demoSales.heroNote")}</p>
          </header>

          {motionChecked && dataChecked && !filmDone ? (
            <ProductFilmPlayer
              onComplete={handleFilmComplete}
              onSkip={handleSkip}
              reducedMotion={reducedMotion}
              saveData={saveData}
            />
          ) : null}

          {saveData && dataChecked ? (
            <div className="sales-demo-film__poster-only" data-demo-poster-fallback>
              <img
                src={locale === "pl" ? "/demo/twin-product-film-poster-pl.webp" : "/demo/twin-product-film-poster-en.webp"}
                alt={t("demoSales.posterAlt")}
                className="sales-demo-film__poster-img"
              />
            </div>
          ) : null}

          <RoleFlowCards activeRole={activeRole} onSelect={handleRoleSelect} visible={showRoles} />

          {activeRole && flowStarted ? (
            <section
              ref={flowRef}
              className="sales-demo-flow scroll-mt-20"
              data-sales-demo-flow
              id="sales-demo-flow"
              tabIndex={-1}
              aria-label={t("demoSales.flowAria")}
            >
              <RoleStory
                role={activeRole}
                onRoleChange={() => undefined}
                autoStart
                scenesOverride={salesRoleJourneyScenes(activeRole)}
                hideRoleSelector
              />
            </section>
          ) : null}
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
