import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

export function CandidateProfileScene() {
  const frame = useCurrentFrame();
  const scoreAnim = interpolate(frame, [10, 40], [0, 94], { extrapolateRight: "clamp" });

  return (
    <ProductShell
      title="candidate/matches"
      sidebarLabel="Career Compass"
      sidebarItems={["Matches", "Profile", "Calendar", "Settings"]}
      activeItem={0}
    >
      <div style={{ display: "flex", gap: 24 }}>
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${FILM.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: FILM.muted, fontWeight: 600 }}>Senior Backend Engineer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: FILM.text, marginTop: 4 }}>NovaTech · Warsaw</div>
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Python", "FastAPI", "PostgreSQL", "K8s"].map((s) => (
              <span
                key={s}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: "#dbeafe",
                  color: FILM.blue,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            width: 180,
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            border: `3px solid ${FILM.accent}`,
            textAlign: "center",
            boxShadow: `0 8px 32px ${FILM.accent}33`,
          }}
        >
          <div style={{ fontSize: 13, color: FILM.muted, fontWeight: 600 }}>Match score</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: FILM.accent, lineHeight: 1.1 }}>
            {Math.round(scoreAnim)}%
          </div>
          <div
            style={{
              marginTop: 12,
              height: 8,
              borderRadius: 4,
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${scoreAnim}%`,
                height: "100%",
                background: FILM.accent,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
