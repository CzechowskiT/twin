import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FlyInItem, PulseBadge, SuccessFlash } from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CALENDARS = [
  { label: "Candidate", color: FILM.blue, slots: [false, false, true, false, false] },
  { label: "Recruiter", color: FILM.purple, slots: [false, true, true, false, true] },
  { label: "Company", color: FILM.amber, slots: [false, false, true, true, false] },
];

export function CalendarScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overlayProgress = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const confirmed = frame >= 120;
  const highlightWed = frame >= 60;

  return (
    <ProductShell
      title="calendar"
      sidebarLabel="Calendar"
      sidebarItems={["Week", "Holds", "Confirmed", "Export ICS"]}
      activeItem={confirmed ? 2 : 1}
    >
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: FILM.cyan, marginBottom: 12 }}>
            Finding common slot
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {DAYS.map((day, di) => {
              const isWed = di === 2;
              const allOverlap = isWed && highlightWed;
              return (
                <div key={day} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: FILM.textLight, marginBottom: 6 }}>{day}</div>
                  <div
                    style={{
                      height: 120,
                      borderRadius: 10,
                      background: allOverlap ? `${FILM.neon}14` : "rgba(15,23,42,0.7)",
                      border: `1px solid ${allOverlap ? FILM.neon : FILM.cyanBorder}`,
                      boxShadow: allOverlap ? `0 0 20px ${FILM.neon}33` : "none",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {CALENDARS.map((cal, ci) => {
                      const hasSlot = cal.slots[di];
                      const offset = ci * 28;
                      const opacity = overlayProgress * (hasSlot ? 1 : 0.15);
                      return (
                        <div
                          key={cal.label}
                          style={{
                            position: "absolute",
                            left: 8,
                            right: 8,
                            top: 10 + offset,
                            height: 22,
                            borderRadius: 4,
                            background: `${cal.color}${hasSlot ? "cc" : "33"}`,
                            opacity,
                            transform: `translateX(${interpolate(overlayProgress, [0, 1], [20, 0])}px)`,
                            fontSize: 9,
                            fontWeight: 700,
                            color: FILM.textLight,
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 6,
                            boxShadow: hasSlot ? `0 0 8px ${cal.color}66` : "none",
                          }}
                        >
                          {hasSlot ? cal.label : ""}
                        </div>
                      );
                    })}
                    {allOverlap ? (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: "50%",
                          transform: `translateX(-50%) scale(${spring({ frame: frame - 60, fps, config: { damping: 10 } })})`,
                        }}
                      >
                        <PulseBadge color={FILM.neon}>Wed 14:00</PulseBadge>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <FlyInItem delay={100} fromX={60} fromY={0}>
          <div
            style={{
              width: 300,
              padding: 16,
              borderRadius: 12,
              background: FILM.bgPanelDark,
              border: `1px solid ${confirmed ? FILM.neon : FILM.cyanBorder}`,
              boxShadow: confirmed ? `0 0 32px ${FILM.neon}44` : `0 0 16px ${FILM.cyan}14`,
              position: "relative",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: confirmed ? FILM.neon : FILM.mutedLight, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {confirmed ? "Confirmed" : "Proposed hold"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: FILM.textLight, marginTop: 8 }}>
              Interview — NovaTech
            </div>
            <div style={{ fontSize: 12, color: FILM.mutedLight, marginTop: 4 }}>Wed 14:00 · 45 min · Anna K.</div>
            {confirmed ? (
              <>
                <div style={{ marginTop: 10, fontSize: 11, color: FILM.neon, fontWeight: 600 }}>
                  ✓ Added to Google Calendar
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: FILM.cyan, fontWeight: 600 }}>
                  ✓ ICS exported · Meet link attached
                </div>
              </>
            ) : (
              <div style={{ marginTop: 10, fontSize: 11, color: FILM.amber, fontWeight: 600 }}>
                Syncing calendars…
              </div>
            )}
            <SuccessFlash startFrame={120} />
          </div>
        </FlyInItem>
      </div>
    </ProductShell>
  );
}
