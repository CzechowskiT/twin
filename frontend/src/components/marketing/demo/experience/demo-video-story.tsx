"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { trackDemoFilmCompleted, trackDemoFilmStarted } from "@/lib/demo/demo-analytics";
import { OPENING_FILM_DURATION_MS } from "@/lib/demo/demo-experience-config";

type DemoVideoStoryProps = {
  onComplete: () => void;
  onSkip: () => void;
  reducedMotion: boolean;
};

const ACT_MS = Math.floor(OPENING_FILM_DURATION_MS / 3);

const FILM_CAPTION_KEYS: readonly TranslationKey[] = [
  "demoExperience.filmCaption_0",
  "demoExperience.filmCaption_1",
  "demoExperience.filmCaption_2",
];

export function DemoVideoStory({ onComplete, onSkip, reducedMotion }: DemoVideoStoryProps) {
  const { t } = useTranslation();
  const [act, setAct] = useState(0);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      trackDemoFilmStarted();
    }
    const timers = [
      window.setTimeout(() => setAct(1), ACT_MS),
      window.setTimeout(() => setAct(2), ACT_MS * 2),
      window.setTimeout(() => {
        setDone(true);
        trackDemoFilmCompleted();
        onComplete();
      }, OPENING_FILM_DURATION_MS),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [onComplete, reducedMotion]);

  if (reducedMotion || done) return null;

  return (
    <section
      className="demo-opening-film"
      data-demo-opening-film
      aria-label={t("demoExperience.filmAria")}
      role="region"
    >
      <div className="demo-opening-film__stage">
        <div className={`demo-opening-film__act ${act === 0 ? "demo-opening-film__act--live" : ""}`} data-act="problem">
          <p className="demo-opening-film__act-label">{t("demoExperience.filmAct1Label")}</p>
          <h2 className="demo-opening-film__act-title">{t("demoExperience.filmAct1Title")}</h2>
          <div className="demo-opening-film__inbox-chaos" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="demo-opening-film__inbox-row"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        <div className={`demo-opening-film__act ${act === 1 ? "demo-opening-film__act--live" : ""}`} data-act="solution">
          <p className="demo-opening-film__act-label">{t("demoExperience.filmAct2Label")}</p>
          <h2 className="demo-opening-film__act-title">{t("demoExperience.filmAct2Title")}</h2>
          <div className="demo-opening-film__calendar-reveal" aria-hidden>
            <div className="demo-opening-film__calendar-slot demo-opening-film__calendar-slot--a" />
            <div className="demo-opening-film__calendar-slot demo-opening-film__calendar-slot--b" />
            <div className="demo-opening-film__calendar-slot demo-opening-film__calendar-slot--c" />
          </div>
        </div>

        <div className={`demo-opening-film__act ${act === 2 ? "demo-opening-film__act--live" : ""}`} data-act="product">
          <p className="demo-opening-film__act-label">{t("demoExperience.filmAct3Label")}</p>
          <h2 className="demo-opening-film__act-title">{t("demoExperience.filmAct3Title")}</h2>
          <div className="demo-opening-film__product-orbit" aria-hidden>
            <span className="demo-opening-film__orbit-ring" />
            <span className="demo-opening-film__orbit-core">TWIN</span>
            <span className="demo-opening-film__orbit-node demo-opening-film__orbit-node--a" />
            <span className="demo-opening-film__orbit-node demo-opening-film__orbit-node--b" />
            <span className="demo-opening-film__orbit-node demo-opening-film__orbit-node--c" />
          </div>
        </div>
      </div>

      <div className="demo-opening-film__controls">
        <button type="button" className="twin-btn-secondary twin-touch-target text-xs sm:text-sm" onClick={onSkip}>
          {t("demoExperience.filmSkip")}
        </button>
        <p className="demo-opening-film__caption">{t(FILM_CAPTION_KEYS[act] ?? FILM_CAPTION_KEYS[0])}</p>
      </div>
    </section>
  );
}
