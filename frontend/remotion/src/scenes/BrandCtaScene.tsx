import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { sceneEnterOpacity, glassPanel, neonButton, sectionLabel } from "../components/DarkCockpit";
import { PulseBadge, SuccessFlash } from "../components/MotionPrimitives";
import { FILM } from "../theme";

type BrandCtaSceneProps = {
  ctaText: string;
};

/** Finale — dense dark product culmination (calendar of acceptance), not a marketing slide. */
export function BrandCtaScene({ ctaText }: BrandCtaSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const confirmed = frame >= 35;
  const neonPulse = interpolate(frame % 40, [0, 20, 40], [0.4, 0.75, 0.4]);

  return (
    <div
      style={{
        width: 1760,
        height: 920,
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: FILM.font,
        color: FILM.textLight,
        background: `linear-gradient(165deg, ${FILM.bgDark} 0%, #0c1222 55%, #080e1c 100%)`,
        border: `1px solid ${FILM.cyanBorder}`,
        boxShadow: `0 0 0 1px ${FILM.cyan}22 inset, 0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${FILM.neon}14`,
        opacity: sceneEnterOpacity(enter),
        transform: `scale(${interpolate(enter, [0, 1], [0.985, 1])})`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <aside style={{ ...glassPanel, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sectionLabel}>Roles aligned</div>
          {[
            { role: "Candidate", detail: "Interested · 94%", color: FILM.blue },
            { role: "Recruiter", detail: "Invite sent", color: FILM.purple },
            { role: "Company", detail: "Slot approved", color: FILM.amber },
          ].map((row, i) => (
            <div
              key={row.role}
              style={{
                padding: "12px 12px",
                borderRadius: 10,
                border: `1px solid ${row.color}66`,
                background: "rgba(15,23,42,0.7)",
                opacity: interpolate(frame, [i * 6, i * 6 + 14], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{row.role}</div>
              <div style={{ fontSize: 12, color: row.color, marginTop: 4, fontWeight: 600 }}>{row.detail}</div>
            </div>
          ))}
        </aside>

        <main style={{ ...glassPanel, padding: 16, boxShadow: `0 0 28px ${FILM.neon}18`, position: "relative" }}>
          <div style={sectionLabel}>Calendar of acceptance</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>Interview hold confirmed</div>
          <div style={{ fontSize: 14, color: FILM.mutedLight, marginTop: 4 }}>
            NovaTech · Senior Backend · Anna K.
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${confirmed ? FILM.neon : FILM.cyanBorder}`,
              background: confirmed ? `${FILM.neon}14` : "rgba(15,23,42,0.55)",
              boxShadow: confirmed ? `0 0 24px ${FILM.neon}33` : "none",
            }}
          >
            <div style={{ fontSize: 12, color: FILM.cyan, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {confirmed ? "Confirmed slot" : "Proposed hold"}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: FILM.neon, marginTop: 6 }}>Wed 14:00</div>
            <div style={{ fontSize: 13, color: FILM.mutedLight, marginTop: 4 }}>45 min · Google Meet · ICS synced</div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <PulseBadge color={FILM.neon}>Candidate ✓</PulseBadge>
              <PulseBadge color={FILM.cyan}>Recruiter ✓</PulseBadge>
              <PulseBadge color={FILM.amber}>Company ✓</PulseBadge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
            <div
              style={{
                ...neonButton,
                boxShadow: `0 0 ${16 + neonPulse * 12}px ${FILM.neon}88`,
                transform: `scale(${Math.max(0.92, spring({ frame: frame - 40, fps, config: { damping: 12 } }))})`,
              }}
            >
              {ctaText}
            </div>
          </div>
          <SuccessFlash startFrame={35} />
        </main>

        <aside style={{ ...glassPanel, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={sectionLabel}>Noise removed</div>
          {[
            { before: "2,847 unread", after: "1 ranked signal" },
            { before: "Blind CV pile", after: "Pre-qualified profile" },
            { before: "Spam interviews", after: "Calendar hold" },
          ].map((row) => (
            <div key={row.before} style={{ padding: "10px 0", borderBottom: `1px solid ${FILM.cyanBorder}` }}>
              <div style={{ fontSize: 11, color: FILM.mutedLight, textDecoration: "line-through" }}>{row.before}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: FILM.neon, marginTop: 4 }}>{row.after}</div>
            </div>
          ))}
          <div style={{ marginTop: "auto", fontSize: 22, fontWeight: 900, color: FILM.neon, letterSpacing: "-0.02em" }}>
            TWIN
          </div>
          <div style={{ fontSize: 12, color: FILM.mutedLight }}>Acceptance-ready moments only</div>
        </aside>
      </div>

      <footer
        style={{
          display: "flex",
          gap: 28,
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${FILM.cyanBorder}`,
          background: "rgba(15,23,42,0.9)",
          fontSize: 12,
        }}
      >
        {["Match", "Review", "Invite", "Align", "Accept"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, color: i === 4 ? FILM.neon : FILM.mutedLight, fontWeight: i === 4 ? 700 : 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", boxShadow: i === 4 ? `0 0 10px ${FILM.neon}` : "none" }} />
            {s}
          </div>
        ))}
      </footer>
    </div>
  );
}
