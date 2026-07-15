import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const PIPELINE = [
  { stage: "Sourced", count: 48, color: FILM.muted },
  { stage: "Matched", count: 22, color: FILM.blue },
  { stage: "Review", count: 8, color: FILM.purple },
  { stage: "Interview", count: 3, color: FILM.accent },
];

export function CompanyCockpitScene() {
  const frame = useCurrentFrame();

  return (
    <ProductShell
      title="company/cockpit"
      sidebarLabel="Hiring Cockpit"
      sidebarItems={["Pipeline", "Talent pool", "Analytics", "Roles"]}
      activeItem={0}
    >
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: FILM.text }}>
        Talent memory — pipeline quality
      </h2>
      <div style={{ display: "flex", gap: 16 }}>
        {PIPELINE.map((p, i) => {
          const height = interpolate(frame, [i * 10, i * 10 + 20], [0, p.count * 3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={p.stage} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: 180,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "80%",
                    height,
                    borderRadius: "8px 8px 0 0",
                    background: p.color,
                    minHeight: 8,
                  }}
                />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: FILM.text, marginTop: 8 }}>{p.count}</div>
              <div style={{ fontSize: 13, color: FILM.muted }}>{p.stage}</div>
            </div>
          );
        })}
      </div>
    </ProductShell>
  );
}
