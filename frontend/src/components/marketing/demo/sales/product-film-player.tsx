"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  trackDemoVideoComplete,
  trackDemoVideoImpression,
  trackDemoVideoPause,
  trackDemoVideoPlay,
  trackDemoVideoProgress,
  trackDemoVideoSkip,
} from "@/lib/demo/demo-analytics";
import { productFilmSources } from "@/lib/demo/sales-demo-config";

type ProductFilmPlayerProps = {
  onComplete: () => void;
  onSkip: () => void;
  reducedMotion: boolean;
  saveData: boolean;
};

const PROGRESS_MARKS = [0.25, 0.5, 0.75] as const;

export function ProductFilmPlayer({ onComplete, onSkip, reducedMotion, saveData }: ProductFilmPlayerProps) {
  const { t, locale } = useTranslation();
  const sources = productFilmSources(locale);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const impressionRef = useRef(false);
  const progressMarksRef = useRef(new Set<number>());
  const completedRef = useRef(false);

  useEffect(() => {
    if (impressionRef.current) return;
    impressionRef.current = true;
    trackDemoVideoImpression({ locale, save_data: saveData });
  }, [locale, saveData]);

  useEffect(() => {
    if (reducedMotion || saveData) {
      onComplete();
    }
  }, [reducedMotion, saveData, onComplete]);

  const handlePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play();
    setPlaying(true);
    trackDemoVideoPlay({ locale });
  }, [locale]);

  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    trackDemoVideoPause({ locale, current_time: video.currentTime });
  }, [locale]);

  const handleSkip = useCallback(() => {
    trackDemoVideoSkip({ locale });
    onSkip();
  }, [locale, onSkip]);

  const handleCaptionsToggle = useCallback(() => {
    const video = videoRef.current;
    setCaptionsOn((prev) => {
      const next = !prev;
      if (video?.textTracks) {
        for (const track of Array.from(video.textTracks)) {
          track.mode = next ? "showing" : "hidden";
        }
      }
      return next;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const ratio = video.currentTime / video.duration;
    for (const mark of PROGRESS_MARKS) {
      if (ratio >= mark && !progressMarksRef.current.has(mark)) {
        progressMarksRef.current.add(mark);
        trackDemoVideoProgress({ locale, progress: mark });
      }
    }
  }, [locale]);

  const handleEnded = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPlaying(false);
    trackDemoVideoComplete({ locale });
    onComplete();
  }, [locale, onComplete]);

  if (reducedMotion || saveData) return null;

  return (
    <section className="sales-demo-film" data-sales-demo-film aria-label={t("demoSales.filmAria")}>
      <div className="sales-demo-film__player-wrap">
        {!firstFrameReady ? (
          <img
            src={sources.poster}
            alt=""
            aria-hidden
            className="sales-demo-film__poster-underlay"
            data-demo-video-poster-underlay
          />
        ) : null}
        <video
          ref={videoRef}
          className="sales-demo-film__video"
          data-demo-product-video
          poster={sources.poster}
          preload="metadata"
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
          onLoadedData={() => setFirstFrameReady(true)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => {
            setPlaying(true);
            setFirstFrameReady(true);
          }}
          onPause={() => setPlaying(false)}
        >
          <source src={sources.mp4} type="video/mp4" />
          <source src={sources.webm} type="video/webm" />
          <track
            kind="captions"
            src={sources.vtt}
            srcLang={locale === "pl" ? "pl" : "en"}
            label={locale === "pl" ? "Polski" : "English"}
            default={captionsOn}
          />
        </video>

        {!playing && ready ? (
          <button
            type="button"
            className="sales-demo-film__play-overlay twin-touch-target"
            data-demo-video-play
            onClick={handlePlay}
            aria-label={t("demoSales.play")}
          >
            <span className="sales-demo-film__play-icon" aria-hidden>
              ▶
            </span>
          </button>
        ) : null}
      </div>

      <div className="sales-demo-film__controls">
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
          data-demo-video-pause
          onClick={playing ? handlePause : handlePlay}
        >
          {playing ? t("demoSales.pause") : t("demoSales.play")}
        </button>
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
          data-demo-video-skip
          onClick={handleSkip}
        >
          {t("demoSales.skip")}
        </button>
        <button
          type="button"
          className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
          data-demo-video-captions
          onClick={handleCaptionsToggle}
          aria-pressed={captionsOn}
        >
          {captionsOn ? t("demoSales.captionsOff") : t("demoSales.captionsOn")}
        </button>
      </div>
    </section>
  );
}
