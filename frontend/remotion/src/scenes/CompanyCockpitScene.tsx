import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FlyInItem, PulseBadge, SuccessFlash } from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const PIPELINE = [
  { stage: "Sourced", count: 48, color: FILM.muted },
  { stage: "Matched", count: 22, color: FILM.blue },
  { stage: "Review", count: 8, color: FILM.purple },
  { stage: "Interview", count: 3, color: FILM.accent },
];

const SHORTLIST = [
  { name: "Anna K.", role: "Senior Backend", score: 94, status: "approved" },
  { name: "Marcin W.", role: "Staff Platform", score: 87, status: "review" },
  { name: "Ewa P.", role: "Lead Python", score: 82, status: "review" },
];

export function CompanyCockpitScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blockerRemoved = frame >= 80;
  const slotApproved = frame >= 120;

  return (
    <ProductShell
      title="company/cockpit"
      sidebarLabel="Hiring Cockpit"
      sidebarItems={["Pipeline", "Shortlist", "Team", "Slots"]}
      activeItem={blockerRemoved ? 3 : 1}
    >
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: FILM.text, marginBottom: 12 }}>
            Pipeline quality
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {PIPELINE.map((p, i) => {
              const targetCount = i === 3 && slotApproved ? p.count + 1 : p.count;
              const height = interpolate(frame, [i * 8, i * 8 + 25], [0, targetCount * 2.8], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const wobble = Math.sin((frame + i * 10) / 15) * 2;
              return (
                <div key={p.stage} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 140, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "75%",
                        height: height + wobble,
                        borderRadius: "6px 6px 0 0",
                        background: p.color,
                        minHeight: 6,
                        transition: "none",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: FILM.text, marginTop: 6 }}>
                    {Math.round(interpolate(frame, [i * 8, i * 8 + 25], [0, targetCount], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
                  </div>
                  <div style={{ fontSize: 11, color: FILM.muted }}>{p.stage}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: 400 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: FILM.text, marginBottom: 10 }}>Shortlist</div>
          {SHORTLIST.map((c, i) => {
            const enter = spring({ frame: frame - i * 10, fps, config: { damping: 14 } });
            const isAnna = i === 0;
            const approved = isAnna && slotApproved;
            return (
              <FlyInItem key={c.name} delay={i * 10} fromX={40} fromY={0}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 9,
                    background: "#fff",
                    border: `2px solid ${approved ? FILM.accent : isAnna && blockerRemoved ? FILM.blue : FILM.border}`,
                    opacity: enter,
                    position: "relative",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: FILM.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: FILM.muted }}>{c.role}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: FILM.accent }}>{c.score}%</div>
                  {isAnna && !blockerRemoved ? (
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "#fef2f2", color: FILM.red, fontWeight: 700 }}>
                      Blocker
                    </span>
                  ) : isAnna && blockerRemoved && !slotApproved ? (
                    <PulseBadge color={FILM.blue}>Team confirmed</PulseBadge>
                  ) : approved ? (
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "#ecfdf5", color: FILM.accentDark, fontWeight: 700 }}>
                      Slot approved ✓
                    </span>
                  ) : null}
                  {approved ? <SuccessFlash startFrame={120} /> : null}
                </div>
              </FlyInItem>
            );
          })}
          {blockerRemoved && !slotApproved ? (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 8,
                background: "#fef3c7",
                color: "#92400e",
                fontSize: 11,
                fontWeight: 600,
                transform: `translateX(${Math.sin(frame / 8) * 3}px)`,
              }}
            >
              Team reviewing slot availability…
            </div>
          ) : null}
        </div>
      </div>
    </ProductShell>
  );
}
