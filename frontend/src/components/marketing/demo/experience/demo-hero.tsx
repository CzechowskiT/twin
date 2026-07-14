"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RoleSelector } from "@/components/marketing/demo/experience/role-selector";
import type { DemoRole } from "@/lib/demo/demo-scene-manifest";

type DemoHeroProps = {
  activeRole: DemoRole;
  onRoleSelect: (role: DemoRole) => void;
  onStartJourney: () => void;
};

export function DemoHero({ activeRole, onRoleSelect, onStartJourney }: DemoHeroProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <header
      className={`demo-cinematic-hero ${mounted ? "demo-cinematic-hero--mounted" : ""}`}
      data-demo-hero
    >
      <div className="demo-cinematic-hero__mesh" aria-hidden />
      <div className="demo-cinematic-hero__grid" aria-hidden />
      <div className="demo-cinematic-hero__content">
        <span className="demo-sample-badge demo-sample-badge--hero">{t("demoExperience.sampleBadge")}</span>
        <p className="demo-cinematic-hero__eyebrow">{t("demoExperience.heroEyebrow")}</p>
        <h1 className="demo-cinematic-hero__title">{t("demoExperience.heroTitle")}</h1>
        <p className="demo-cinematic-hero__lead">{t("demoExperience.heroLead")}</p>

        <div className="demo-cinematic-hero__problem-solution" aria-hidden>
          <div className="demo-cinematic-hero__noise">
            <span className="demo-cinematic-hero__noise-line" />
            <span className="demo-cinematic-hero__noise-line demo-cinematic-hero__noise-line--delay" />
            <span className="demo-cinematic-hero__noise-line demo-cinematic-hero__noise-line--delay2" />
          </div>
          <div className="demo-cinematic-hero__arrow">→</div>
          <div className="demo-cinematic-hero__calendar">
            <span className="demo-cinematic-hero__slot demo-cinematic-hero__slot--active">Wed 14:00</span>
            <span className="demo-cinematic-hero__slot">Thu 10:30</span>
          </div>
        </div>

        <RoleSelector activeRole={activeRole} onSelect={onRoleSelect} variant="hero" />
        <div className="demo-cinematic-hero__actions">
          <button
            type="button"
            className="twin-btn-primary twin-touch-target demo-cinematic-hero__cta"
            data-demo-hero-cta="start"
            onClick={onStartJourney}
          >
            {t("demoExperience.heroCta")}
          </button>
        </div>
        <p className="demo-sample-note">{t("demoExperience.heroNote")}</p>
      </div>
    </header>
  );
}
