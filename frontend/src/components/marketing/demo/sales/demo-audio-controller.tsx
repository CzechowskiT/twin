"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  trackDemoAudioImpression,
  trackDemoAudioMute,
  trackDemoAudioPause,
  trackDemoAudioPlay,
  trackDemoAudioUnmute,
} from "@/lib/demo/demo-analytics";
import { DEMO_AUDIO_SOURCES, DEMO_AUDIO_VOLUME_DEFAULT } from "@/lib/demo/demo-audio-config";

type DemoAudioControllerProps = {
  enabled: boolean;
  /** Set true after any user gesture on the demo surface. */
  gestureUnlocked: boolean;
};

export function DemoAudioController({ enabled, gestureUnlocked }: DemoAudioControllerProps) {
  const { locale } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const impressionRef = useRef(false);

  useEffect(() => {
    if (!enabled || impressionRef.current) return;
    impressionRef.current = true;
    trackDemoAudioImpression({ locale });
  }, [enabled, locale]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !gestureUnlocked) return;
    if (muted) {
      audio.volume = DEMO_AUDIO_VOLUME_DEFAULT;
      audio.muted = false;
      void audio.play().then(() => {
        setPlaying(true);
        setMuted(false);
        trackDemoAudioPlay({ locale });
        trackDemoAudioUnmute({ locale });
      }).catch(() => undefined);
    } else {
      audio.pause();
      audio.muted = true;
      setPlaying(false);
      setMuted(true);
      trackDemoAudioPause({ locale });
      trackDemoAudioMute({ locale });
    }
  }, [gestureUnlocked, locale, muted]);

  if (!enabled) return null;

  return (
    <div className="demo-audio-controller" data-demo-audio-controller>
      <audio ref={audioRef} loop preload="none" data-demo-audio>
        <source src={DEMO_AUDIO_SOURCES.ogg} type="audio/ogg" />
        <source src={DEMO_AUDIO_SOURCES.mp3} type="audio/mpeg" />
      </audio>
      <button
        type="button"
        className="twin-btn-secondary twin-touch-target text-xs sm:text-sm"
        data-demo-audio-toggle
        aria-pressed={!muted}
        disabled={!gestureUnlocked}
        onClick={toggleMute}
      >
        {muted ? "🔇" : "🔊"}
        <span className="sr-only">{muted ? "Unmute demo music" : "Mute demo music"}</span>
      </button>
      {playing ? <span className="demo-audio-controller__pulse" data-demo-audio-playing aria-hidden /> : null}
    </div>
  );
}
