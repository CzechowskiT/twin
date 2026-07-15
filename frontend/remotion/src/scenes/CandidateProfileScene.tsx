import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import {
  AnimatedCursor,
  FlyInItem,
  ProgressBar,
  SuccessFlash,
  useCursorPath,
} from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const ROLES = [
  { title: "Senior Backend Engineer", company: "NovaTech", score: 94, active: true },
  { title: "Staff Platform Engineer", company: "CloudBase", score: 87, active: false },
  { title: "Lead Python Developer", company: "DataFlow", score: 82, active: false },
];

const WHY_FIT = ["Python + FastAPI stack match", "Remote-first culture fit", "Salary band aligned", "Team size preference"];

export function CandidateProfileScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scoreAnim = interpolate(frame, [30, 80], [0, 94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const expandHeight = interpolate(frame, [90, 120], [0, WHY_FIT.length * 32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const interested = frame >= 170;
  const statusText = interested ? "Interested ✓" : "New match";
  const statusColor = interested ? FILM.accent : FILM.blue;

  const cursor = useCursorPath([
    { frame: 50, x: 300, y: 250 },
    { frame: 100, x: 1200, y: 300 },
    { frame: 150, x: 700, y: 450 },
    { frame: 170, x: 700, y: 450, click: true },
    { frame: 200, x: 900, y: 350 },
  ]);

  return (
    <ProductShell
      title="candidate/matches"
      sidebarLabel="Career Compass"
      sidebarItems={["Matches", "Profile", "Calendar", "Settings"]}
      activeItem={0}
    >
      <div style={{ display: "flex", gap: 16, height: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: FILM.accentDark }}>
            Ranked matches
          </div>
          {ROLES.map((role, i) => {
            const slideIn = spring({ frame: frame - i * 12, fps, config: { damping: 14, stiffness: 100 } });
            const isSelected = i === 0;
            return (
              <FlyInItem key={role.title} delay={i * 12} fromX={-60} fromY={0}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: 14,
                    border: `2px solid ${isSelected ? FILM.accent : FILM.border}`,
                    opacity: slideIn,
                    transform: `scale(${interpolate(slideIn, [0, 1], [0.95, 1])})`,
                    boxShadow: isSelected ? `0 4px 20px ${FILM.accent}33` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: FILM.text }}>{role.title}</div>
                      <div style={{ fontSize: 12, color: FILM.muted }}>{role.company} · Warsaw</div>
                    </div>
                    <div style={{ fontSize: isSelected ? 22 : 16, fontWeight: 800, color: isSelected ? FILM.accent : FILM.muted }}>
                      {Math.round(i === 0 ? scoreAnim : role.score)}%
                    </div>
                  </div>
                  {isSelected ? (
                    <div style={{ marginTop: 8 }}>
                      <ProgressBar progress={scoreAnim} />
                    </div>
                  ) : null}
                </div>
              </FlyInItem>
            );
          })}
        </div>
        <div style={{ width: 360, position: "relative" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              border: `2px solid ${FILM.accent}`,
              boxShadow: `0 8px 28px ${FILM.accent}22`,
              minHeight: 420,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{statusText}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: FILM.text, marginTop: 6 }}>
              Why you fit
            </div>
            <div style={{ overflow: "hidden", height: Math.max(expandHeight, 8) }}>
              {WHY_FIT.map((reason, i) => (
                <div
                  key={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: 12,
                    color: FILM.text,
                    opacity: frame > 95 + i * 8 ? 1 : 0,
                  }}
                >
                  <span style={{ color: FILM.accent, fontWeight: 700 }}>✓</span>
                  {reason}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {["Python", "FastAPI", "React", "PostgreSQL"].map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid ${FILM.accent}66`,
                    background: `${FILM.accent}18`,
                    color: FILM.accentDark,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <button
              type="button"
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 0",
                borderRadius: 8,
                background: interested ? "#ecfdf5" : FILM.accent,
                color: interested ? FILM.accentDark : "#fff",
                border: interested ? `2px solid ${FILM.accent}` : "none",
                fontWeight: 700,
                fontSize: 14,
                transform: frame >= 165 && frame < 175 ? "scale(0.95)" : "scale(1)",
                boxShadow: frame >= 165 && frame < 175 ? "none" : `0 4px 16px ${FILM.accent}44`,
              }}
            >
              {interested ? "Interested ✓" : "Interested"}
            </button>
            <SuccessFlash startFrame={170} />
          </div>
        </div>
      </div>
      <AnimatedCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} visible={cursor.visible} />
    </ProductShell>
  );
}
