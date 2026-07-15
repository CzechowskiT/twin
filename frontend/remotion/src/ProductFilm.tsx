import React from "react";
import {
  AbsoluteFill,
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
import { CameraMotion, CaptionBar } from "./components/MotionPrimitives";
import { captionAtSec, filmSegments, type FilmLocale } from "./copy";
import { FILM } from "./theme";

export type ProductFilmProps = {
  locale: FilmLocale;
};

const SCENE_MAP: Record<string, React.FC> = {
  inbox: InboxChaosScene,
  organize: TalentMemoryScene,
  candidate: CandidateProfileScene,
  recruiter: RecruiterInboxScene,
  company: CompanyCockpitScene,
  calendar: CalendarScene,
};

function SceneCrossfade({
  locale,
  segmentIndex,
}: {
  locale: FilmLocale;
  segmentIndex: number;
}) {
  const localFrame = useCurrentFrame();
  const segments = filmSegments(locale);
  const seg = segments[segmentIndex];
  if (!seg) return null;

  const SceneComponent = SCENE_MAP[seg.id];
  const ctaText =
    locale === "pl" ? "Odkryj interaktywne demo →" : "Explore the interactive demo →";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {seg.id === "finale" ? (
        <BrandCtaScene ctaText={ctaText} />
      ) : SceneComponent ? (
        <SceneComponent />
      ) : null}
    </div>
  );
}

export const ProductFilm: React.FC<ProductFilmProps> = ({ locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;
  const segments = filmSegments(locale);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${FILM.bgDark} 0%, #0c1222 100%)`,
        fontFamily: FILM.font,
      }}
    >
      <CameraMotion intensity={1.2}>
        {segments.map((seg, i) => {
          const from = Math.round(seg.startSec * fps);
          const duration = Math.round((seg.endSec - seg.startSec) * fps);
          return (
            <Sequence key={seg.id} from={from} durationInFrames={duration} layout="none">
              <SceneCrossfade locale={locale} segmentIndex={i} />
            </Sequence>
          );
        })}
      </CameraMotion>
      <CaptionBar text={captionAtSec(locale, sec)} />
    </AbsoluteFill>
  );
};
