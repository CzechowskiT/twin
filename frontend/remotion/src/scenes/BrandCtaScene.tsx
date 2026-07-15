import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { FILM } from "../theme";

type BrandCtaSceneProps = {
  ctaText: string;
};

export function BrandCtaScene({ ctaText }: BrandCtaSceneProps) {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 30, 60], [0.6, 1, 0.6], { extrapolateRight: "extend" });
  const btnScale = interpolate(frame, [15, 30], [0.9, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: FILM.accent,
          letterSpacing: "-0.03em",
          textShadow: `0 0 ${60 * glow}px ${FILM.accent}`,
          fontFamily: FILM.font,
        }}
      >
        TWIN
      </div>
      <div
        style={{
          marginTop: 32,
          display: "inline-block",
          padding: "18px 48px",
          borderRadius: 12,
          background: FILM.accent,
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          transform: `scale(${btnScale})`,
          boxShadow: `0 8px 32px ${FILM.accent}66`,
          fontFamily: FILM.font,
        }}
      >
        {ctaText}
      </div>
    </div>
  );
}
