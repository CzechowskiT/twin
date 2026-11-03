import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

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
  const scrollY = interpolate(frame, [0, 150], [0, -60], { extrapolateRight: "clamp" });
  const cursor = useCursorPath([
    { frame: 15, x: 400, y: 300 },
    { frame: 40, x: 600, y: 400 },
    { frame: 65, x: 500, y: 500 },
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: FILM.textLight }}>
            Inbox — <AnimatedCounter from={847} to={2847} startFrame={0} durationFrames={45} /> unread
          </h2>
          <span
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              background: `${FILM.red}22`,
              border: `1px solid ${FILM.red}66`,
              color: FILM.red,
              fontSize: 12,
              fontWeight: 700,
              transform: `scale(${1 + Math.sin(frame / 6) * 0.08})`,
              boxShadow: `0 0 12px ${FILM.red}44`,
            }}
          >
            +{Math.round(interpolate(frame, [0, 45], [12, 47], { extrapolateRight: "clamp" }))}/min
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
                    background: row.unread ? "rgba(15,23,42,0.75)" : "rgba(15,23,42,0.45)",
                    border: `1px solid ${row.unread ? `${FILM.red}66` : FILM.cyanBorder}`,
                    boxShadow: row.unread ? `0 0 12px ${FILM.red}22` : "none",
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
                        boxShadow: `0 0 8px ${FILM.red}`,
                      }}
                    />
                  ) : (
                    <div style={{ width: 9 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: row.unread ? 700 : 400, color: FILM.textLight }}>
                      {row.from}
                    </div>
                    <div style={{ fontSize: 12, color: FILM.mutedLight }}>{row.subject}</div>
                  </div>
                  <span style={{ fontSize: 11, color: FILM.mutedLight }}>now</span>
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
                background: "rgba(15,23,42,0.9)",
                border: `2px solid ${FILM.red}`,
                transform: `rotate(${cv.rot + drift * 6}deg) translateY(${-drift * 20}px)`,
                opacity: drift,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: FILM.red,
                boxShadow: `0 0 14px ${FILM.red}55`,
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
