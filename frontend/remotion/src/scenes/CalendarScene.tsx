import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const SLOTS = [
  { day: "Mon", time: "—", active: false },
  { day: "Wed", time: "14:00", active: true },
  { day: "Thu", time: "10:30", active: true },
  { day: "Fri", time: "—", active: false },
];

export function CalendarScene() {
  const frame = useCurrentFrame();
  const confirmScale = interpolate(frame, [20, 35], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <ProductShell
      title="calendar"
      sidebarLabel="Calendar"
      sidebarItems={["Week", "Holds", "Confirmed", "Export ICS"]}
      activeItem={2}
    >
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: FILM.text, marginBottom: 16 }}>
            Calendar of acceptance
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {SLOTS.map((s) => (
              <div
                key={s.day}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  textAlign: "center",
                  background: s.active ? "#ecfdf5" : "#fff",
                  border: `2px solid ${s.active ? FILM.accent : FILM.border}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: FILM.text }}>{s.day}</div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: s.active ? FILM.accent : FILM.muted,
                    marginTop: 8,
                  }}
                >
                  {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            width: 280,
            padding: 20,
            borderRadius: 12,
            background: "#fff",
            border: `3px solid ${FILM.accent}`,
            transform: `scale(${confirmScale})`,
            boxShadow: `0 12px 40px ${FILM.accent}44`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: FILM.accent, textTransform: "uppercase" }}>
            Confirmed
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: FILM.text, marginTop: 8 }}>
            Interview — NovaTech
          </div>
          <div style={{ fontSize: 14, color: FILM.muted, marginTop: 4 }}>Wed 14:00 · 45 min</div>
          <div style={{ marginTop: 12, fontSize: 13, color: FILM.accentDark, fontWeight: 600 }}>
            ✓ Added to Google Calendar
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
