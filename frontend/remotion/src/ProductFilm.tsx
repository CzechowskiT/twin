import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { BrandCtaScene } from "./scenes/BrandCtaScene";
import { CalendarScene } from "./scenes/CalendarScene";
import { CandidateProfileScene } from "./scenes/CandidateProfileScene";
import { CompanyCockpitScene } from "./scenes/CompanyCockpitScene";
import { InboxChaosScene } from "./scenes/InboxChaosScene";
import { RecruiterInboxScene } from "./scenes/RecruiterInboxScene";
import { TalentMemoryScene } from "./scenes/TalentMemoryScene";
import { filmSegments, type FilmLocale } from "./copy";
import { FILM } from "./theme";

export type ProductFilmProps = {
  locale: FilmLocale;
};

const SCENE_MAP: Record<string, React.FC> = {
  problem: InboxChaosScene,
  context: TalentMemoryScene,
  candidate: CandidateProfileScene,
  recruiter: RecruiterInboxScene,
  company: CompanyCockpitScene,
  calendar: CalendarScene,
  cta: BrandCtaScene,
};

function FilmSegment({ locale, segmentIndex }: { locale: FilmLocale; segmentIndex: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segments = filmSegments(locale);
  const seg = segments[segmentIndex];
  if (!seg) return null;

  const durationFrames = Math.round((seg.endSec - seg.startSec) * fps);
  const fadeIn = interpolate(frame, [0, 10], [0.85, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(frame, [0, 15], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const SceneComponent = SCENE_MAP[seg.id];
  const ctaText =
    locale === "pl" ? "Odkryj interaktywne demo →" : "Explore the interactive demo →";

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${FILM.bgDark} 0%, ${FILM.bgMid} 50%, #0c1222 100%)`,
        fontFamily: FILM.font,
        color: FILM.textLight,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 20%, ${FILM.accent}22, transparent)`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "100%",
          padding: "48px 80px 40px",
          opacity,
          transform: `translateY(${slideY}px)`,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: FILM.accent,
            marginBottom: 12,
          }}
        >
          {seg.eyebrow}
        </p>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.1,
            margin: 0,
            color: FILM.textLight,
          }}
        >
          {seg.title}
        </h1>
        <p
          style={{
            fontSize: 20,
            color: "#94a3b8",
            marginTop: 16,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          {seg.subtitle}
        </p>
        <div style={{ marginTop: 36, flex: 1, display: "flex", alignItems: "center" }}>
          {SceneComponent ? (
            seg.id === "cta" ? (
              <BrandCtaScene ctaText={ctaText} />
            ) : (
              <SceneComponent />
            )
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const ProductFilm: React.FC<ProductFilmProps> = ({ locale }) => {
  const { fps } = useVideoConfig();
  const segments = filmSegments(locale);

  return (
    <AbsoluteFill style={{ background: FILM.bgDark }}>
      {segments.map((seg, i) => {
        const from = Math.round(seg.startSec * fps);
        const duration = Math.round((seg.endSec - seg.startSec) * fps);
        return (
          <Sequence key={seg.id} from={from} durationInFrames={duration}>
            <FilmSegment locale={locale} segmentIndex={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
