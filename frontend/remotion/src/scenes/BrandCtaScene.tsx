import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { PulseBadge } from "../components/MotionPrimitives";
import { FILM } from "../theme";

type BrandCtaSceneProps = {
  ctaText: string;
};

const ROLES = [
  { label: "Candidate", color: FILM.blue, icon: "👤", detail: "94% match · Interested" },
  { label: "Recruiter", color: FILM.purple, icon: "📋", detail: "Invited · Review done" },
  { label: "Company", color: FILM.amber, icon: "🏢", detail: "Slot approved" },
];

export function BrandCtaScene({ ctaText }: BrandCtaSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = interpolate(frame, [0, 30, 60, 90], [0.5, 1, 0.8, 1], { extrapolateRight: "extend" });
  const btnScale = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 100 } });

  return (
    <div
      style={{
        width: 1760,
        height: 920,
        borderRadius: 14,
        background: `linear-gradient(145deg, ${FILM.bgDark} 0%, ${FILM.bgMid} 60%, #0c1222 100%)`,
        border: `2px solid ${FILM.accent}44`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FILM.font,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${FILM.accent}18, transparent)`,
        }}
      />
      <div style={{ display: "flex", gap: 24, marginBottom: 36, zIndex: 1 }}>
        {ROLES.map((role, i) => {
          const enter = spring({ frame: frame - i * 8, fps, config: { damping: 14 } });
          const float = Math.sin((frame + i * 20) / 20) * 4;
          return (
            <div
              key={role.label}
              style={{
                width: 280,
                padding: 20,
                borderRadius: 14,
                background: "#1e293b",
                border: `2px solid ${role.color}`,
                textAlign: "center",
                opacity: enter,
                transform: `translateY(${float}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
                boxShadow: `0 8px 32px ${role.color}33`,
              }}
            >
              <div style={{ fontSize: 32 }}>{role.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: FILM.textLight, marginTop: 8 }}>{role.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{role.detail}</div>
              <div style={{ marginTop: 10 }}>
                <PulseBadge color={role.color}>Connected</PulseBadge>
              </div>
            </div>
          );
        })}
      </div>
      <svg width="600" height="40" style={{ position: "absolute", top: "42%", zIndex: 0 }}>
        <line x1="100" y1="20" x2="500" y2="20" stroke={FILM.accent} strokeWidth="2" opacity={0.5} strokeDasharray="8 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
        </line>
      </svg>
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: FILM.accent,
          letterSpacing: "-0.03em",
          textShadow: `0 0 ${50 * glow}px ${FILM.accent}`,
          zIndex: 1,
        }}
      >
        TWIN
      </div>
      <div style={{ fontSize: 16, color: "#94a3b8", marginTop: 8, zIndex: 1 }}>
        The right talent · The right role · The right moment
      </div>
      <div
        style={{
          marginTop: 28,
          display: "inline-block",
          padding: "16px 40px",
          borderRadius: 12,
          background: FILM.accent,
          color: "#fff",
          fontSize: 18,
          fontWeight: 700,
          transform: `scale(${Math.max(0.8, btnScale)})`,
          boxShadow: `0 8px 32px ${FILM.accent}66`,
          zIndex: 1,
        }}
      >
        {ctaText}
      </div>
    </div>
  );
}
