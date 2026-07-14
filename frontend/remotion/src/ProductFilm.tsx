import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { filmSegments, type FilmLocale } from "./copy";

export type ProductFilmProps = {
  locale: FilmLocale;
};

const ACCENT = "#34d399";
const BG_TOP = "#f8fafc";
const BG_BOTTOM = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";

function SegmentVisual({ segmentId, progress }: { segmentId: string; progress: number }) {
  if (segmentId === "problem") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 420, opacity: progress }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              borderRadius: 8,
              background: `linear-gradient(90deg, #cbd5e1 ${20 + i * 8}%, #e2e8f0)`,
              transform: `translateX(${interpolate(progress, [0, 1], [40, 0])}px)`,
            }}
          />
        ))}
      </div>
    );
  }
  if (segmentId === "context") {
    return (
      <div style={{ position: "relative", width: 280, height: 280, opacity: progress }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `3px solid ${ACCENT}`,
            boxShadow: `0 0 60px ${ACCENT}55`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "35%",
            borderRadius: "50%",
            background: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          TWIN
        </div>
      </div>
    );
  }
  if (segmentId === "candidate") {
    return <ProductCard title="Senior Backend" score="94%" color="#3b82f6" progress={progress} />;
  }
  if (segmentId === "recruiter") {
    return <ProductCard title="Review queue" score="3 cards" color="#8b5cf6" progress={progress} />;
  }
  if (segmentId === "company") {
    return <ProductCard title="Talent pool" score="12 warm" color="#f59e0b" progress={progress} />;
  }
  if (segmentId === "calendar") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, opacity: progress }}>
        {["Wed 14:00", "Thu 10:30", "Fri 15:00", "Mon 09:00"].map((slot) => (
          <div
            key={slot}
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: "#fff",
              border: `2px solid ${ACCENT}`,
              color: TEXT,
              fontWeight: 600,
              fontSize: 18,
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            }}
          >
            {slot}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        fontSize: 64,
        fontWeight: 800,
        color: ACCENT,
        letterSpacing: "-0.02em",
        opacity: progress,
        textShadow: `0 0 40px ${ACCENT}66`,
      }}
    >
      TWIN
    </div>
  );
}

function ProductCard({
  title,
  score,
  color,
  progress,
}: {
  title: string;
  score: string;
  color: string;
  progress: number;
}) {
  return (
    <div
      style={{
        width: 360,
        padding: 24,
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 12px 40px rgba(15,23,42,0.1)",
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [24, 0])}px)`,
      }}
    >
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color }}>{score}</div>
      <div
        style={{
          marginTop: 16,
          height: 8,
          borderRadius: 4,
          background: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "85%", height: "100%", background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function FilmSegment({ locale, segmentIndex }: { locale: FilmLocale; segmentIndex: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segments = filmSegments(locale);
  const seg = segments[segmentIndex];
  if (!seg) return null;

  const durationFrames = Math.round((seg.endSec - seg.startSec) * fps);
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);
  const slideY = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: TEXT,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${ACCENT}18, transparent)`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 80,
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
            color: ACCENT,
            marginBottom: 16,
          }}
        >
          {seg.eyebrow}
        </p>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 800,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {seg.title}
        </h1>
        <p style={{ fontSize: 22, color: MUTED, marginTop: 20, textAlign: "center", maxWidth: 700 }}>
          {seg.subtitle}
        </p>
        <div style={{ marginTop: 48 }}>
          <SegmentVisual segmentId={seg.id} progress={opacity} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const ProductFilm: React.FC<ProductFilmProps> = ({ locale }) => {
  const { fps } = useVideoConfig();
  const segments = filmSegments(locale);

  return (
    <AbsoluteFill>
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
