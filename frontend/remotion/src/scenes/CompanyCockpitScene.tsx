import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { glassPanel, glassRow, neonPill, sectionLabel } from "../components/DarkCockpit";
import { FlyInItem, PulseBadge, SuccessFlash } from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const PIPELINE = [
  { stage: "Sourced", count: 48, color: FILM.mutedLight },
  { stage: "Matched", count: 22, color: FILM.blue },
  { stage: "Review", count: 8, color: FILM.purple },
  { stage: "Interview", count: 3, color: FILM.neon },
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
      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.2, ...glassPanel, padding: 16 }}>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>Pipeline quality</div>
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
                          background: `linear-gradient(180deg, ${p.color}, ${p.color}88)`,
                          boxShadow: `0 0 14px ${p.color}55`,
                          minHeight: 6,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: FILM.textLight, marginTop: 6 }}>
                      {Math.round(interpolate(frame, [i * 8, i * 8 + 25], [0, targetCount], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
                    </div>
                    <div style={{ fontSize: 11, color: FILM.mutedLight }}>{p.stage}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={sectionLabel}>Shortlist</div>
            {SHORTLIST.map((c, i) => {
              const enter = spring({ frame: frame - i * 10, fps, config: { damping: 14 } });
              const isAnna = i === 0;
              const approved = isAnna && slotApproved;
              return (
                <FlyInItem key={c.name} delay={i * 10} fromX={40} fromY={0}>
                  <div
                    style={{
                      ...glassRow,
                      border: `1px solid ${approved ? FILM.neon : isAnna && blockerRemoved ? FILM.cyan : FILM.cyanBorder}`,
                      boxShadow: approved ? `0 0 18px ${FILM.neon}33` : "none",
                      opacity: Math.max(0.55, enter),
                      position: "relative",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: FILM.textLight }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: FILM.mutedLight }}>{c.role}</div>
                    </div>
                    <div style={neonPill}>{c.score}%</div>
                    {isAnna && !blockerRemoved ? (
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: `${FILM.red}22`, color: FILM.red, fontWeight: 700, border: `1px solid ${FILM.red}66` }}>
                        Blocker
                      </span>
                    ) : isAnna && blockerRemoved && !slotApproved ? (
                      <PulseBadge color={FILM.cyan}>Team confirmed</PulseBadge>
                    ) : approved ? (
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: `${FILM.neon}22`, color: FILM.neon, fontWeight: 700, border: `1px solid ${FILM.neon}66` }}>
                        Slot approved ✓
                      </span>
                    ) : null}
                    {approved ? <SuccessFlash startFrame={120} /> : null}
                  </div>
                </FlyInItem>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ ...glassPanel, padding: 12 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Team alignment</div>
            {["Hiring mgr", "Eng lead", "People ops"].map((name, i) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", color: FILM.textLight }}>
                <span>{name}</span>
                <span style={{ color: frame > 70 + i * 10 ? FILM.neon : FILM.amber, fontWeight: 700 }}>
                  {frame > 70 + i * 10 ? "Confirmed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
          <div style={{ ...glassPanel, padding: 12 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Next interview slot</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: FILM.neon }}>Wed 14:00</div>
            <div style={{ fontSize: 12, color: FILM.mutedLight, marginTop: 4 }}>Anna K. · 45 min · Meet</div>
            {blockerRemoved && !slotApproved ? (
              <div style={{ marginTop: 8, fontSize: 11, color: FILM.amber, fontWeight: 600 }}>Team reviewing availability…</div>
            ) : null}
            {slotApproved ? (
              <div style={{ marginTop: 8, fontSize: 11, color: FILM.neon, fontWeight: 700 }}>Hold locked in calendar ✓</div>
            ) : null}
          </div>
          <div style={{ ...glassPanel, padding: 12 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Quality bar</div>
            {[
              { label: "Stack fit", v: 96 },
              { label: "Comp band", v: 88 },
              { label: "Avail overlap", v: 91 },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: FILM.mutedLight }}>
                  <span>{m.label}</span>
                  <span style={{ color: FILM.cyan }}>{m.v}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#1e293b", marginTop: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${interpolate(frame, [40, 90], [0, m.v], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${FILM.blue}, ${FILM.cyan})`,
                      boxShadow: `0 0 8px ${FILM.blue}88`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
