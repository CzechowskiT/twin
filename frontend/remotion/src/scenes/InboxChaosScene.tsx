import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const CHAOS_ROWS = [
  { from: "noreply@jobs.pl", subject: "RE: RE: Your application", unread: true },
  { from: "hr@corp.io", subject: "We received 847 CVs today", unread: true },
  { from: "linkedin", subject: "47 recruiters viewed your profile", unread: false },
  { from: "spam@hirefast.com", subject: "URGENT: Senior role!!!", unread: true },
  { from: "ats-bot", subject: "Status update: under review", unread: false },
  { from: "recruiter@agency", subject: "Quick call about Java?", unread: true },
];

export function InboxChaosScene() {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" });

  return (
    <ProductShell
      title="inbox"
      sidebarLabel="Inbox"
      sidebarItems={["All mail", "Unread", "CV pile", "Spam"]}
      activeItem={0}
    >
      <div style={{ transform: `translateY(${slide}px)` }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: FILM.text }}>
          Inbox — 2,847 unread
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CHAOS_ROWS.map((row, i) => {
            const delay = i * 4;
            const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={row.subject}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: row.unread ? "#fff" : "#e2e8f0",
                  border: `1px solid ${row.unread ? FILM.red : FILM.border}`,
                  opacity,
                  boxShadow: row.unread ? "0 2px 8px rgba(239,68,68,0.15)" : "none",
                }}
              >
                {row.unread ? (
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: FILM.red }} />
                ) : (
                  <div style={{ width: 10 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: row.unread ? 700 : 400, color: FILM.text }}>
                    {row.from}
                  </div>
                  <div style={{ fontSize: 13, color: FILM.muted }}>{row.subject}</div>
                </div>
                <span style={{ fontSize: 12, color: FILM.muted }}>now</span>
              </div>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
