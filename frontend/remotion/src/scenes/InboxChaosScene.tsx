import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

import {
  AnimatedCounter,
  AnimatedCursor,
  FlyInItem,
  useCursorPath,
} from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const INCOMING = [
  { from: "noreply@jobs.pl", subject: "RE: RE: Your application", unread: true, delay: 0 },
  { from: "hr@corp.io", subject: "We received 847 CVs today", unread: true, delay: 8 },
  { from: "linkedin", subject: "47 recruiters viewed your profile", unread: false, delay: 16 },
  { from: "spam@hirefast.com", subject: "URGENT: Senior role!!!", unread: true, delay: 24 },
  { from: "ats-bot", subject: "Status update: under review", unread: false, delay: 32 },
  { from: "recruiter@agency", subject: "Quick call about Java?", unread: true, delay: 40 },
  { from: "batch@cv-pile", subject: "+312 new applications", unread: true, delay: 48 },
  { from: "noreply@indeed", subject: "Application viewed by 0 employers", unread: true, delay: 56 },
];

const SCATTER_CVS = [
  { x: 820, y: 120, rot: -12, delay: 12 },
  { x: 900, y: 200, rot: 8, delay: 20 },
  { x: 780, y: 280, rot: -5, delay: 28 },
  { x: 950, y: 160, rot: 15, delay: 36 },
  { x: 860, y: 340, rot: -18, delay: 44 },
];

export function InboxChaosScene() {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [0, 210], [0, -60], { extrapolateRight: "clamp" });
  const cursor = useCursorPath([
    { frame: 30, x: 400, y: 300 },
    { frame: 60, x: 600, y: 400 },
    { frame: 90, x: 500, y: 500 },
  ]);

  return (
    <ProductShell
      title="inbox"
      sidebarLabel="Inbox"
      sidebarItems={["All mail", "Unread", "CV pile", "Spam"]}
      activeItem={0}
    >
      <div style={{ position: "relative", transform: `translateY(${scrollY}px)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: FILM.text }}>
            Inbox — <AnimatedCounter from={847} to={2847} startFrame={0} durationFrames={90} /> unread
          </h2>
          <span
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              background: "#fef2f2",
              color: FILM.red,
              fontSize: 12,
              fontWeight: 700,
              transform: `scale(${1 + Math.sin(frame / 6) * 0.08})`,
            }}
          >
            +{Math.round(interpolate(frame, [0, 90], [12, 47], { extrapolateRight: "clamp" }))}/min
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {INCOMING.map((row) => {
            const wobble = Math.sin((frame + row.delay) / 10) * 2;
            return (
              <FlyInItem key={row.subject} delay={row.delay} fromX={120} fromY={-40}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 9,
                    background: row.unread ? "#fff" : "#e2e8f0",
                    border: `1px solid ${row.unread ? FILM.red : FILM.border}`,
                    boxShadow: row.unread ? "0 2px 8px rgba(239,68,68,0.12)" : "none",
                    transform: `translateX(${wobble}px)`,
                  }}
                >
                  {row.unread ? (
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: FILM.red,
                        opacity: interpolate(frame % 20, [0, 10, 20], [0.5, 1, 0.5]),
                      }}
                    />
                  ) : (
                    <div style={{ width: 9 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: row.unread ? 700 : 400, color: FILM.text }}>
                      {row.from}
                    </div>
                    <div style={{ fontSize: 12, color: FILM.muted }}>{row.subject}</div>
                  </div>
                  <span style={{ fontSize: 11, color: FILM.muted }}>now</span>
                </div>
              </FlyInItem>
            );
          })}
        </div>
        {SCATTER_CVS.map((cv) => {
          const drift = interpolate(frame, [cv.delay, cv.delay + 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`${cv.x}-${cv.y}`}
              style={{
                position: "absolute",
                left: cv.x,
                top: cv.y,
                width: 48,
                height: 60,
                borderRadius: 4,
                background: "#fff",
                border: `2px solid ${FILM.red}`,
                transform: `rotate(${cv.rot + drift * 6}deg) translateY(${-drift * 20}px)`,
                opacity: drift,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: FILM.red,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              CV
            </div>
          );
        })}
      </div>
      <AnimatedCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} visible={cursor.visible} />
    </ProductShell>
  );
}
