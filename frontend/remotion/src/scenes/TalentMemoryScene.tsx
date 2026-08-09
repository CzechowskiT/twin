import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FlyInItem, LoadingDots, ProgressBar } from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

const SKILLS = ["Python", "FastAPI", "PostgreSQL", "K8s", "TypeScript"];
const PREFS = ["Remote-first", "Warsaw", "Senior IC", "€120k+"];

export function TalentMemoryScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mergeProgress = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 80 } });
  const cardCount = Math.max(1, Math.round(interpolate(mergeProgress, [0, 1], [6, 1])));

  return (
    <ProductShell
      title="talent-memory"
      sidebarLabel="TWIN"
      sidebarItems={["Signal", "Profile", "Matches", "Calendar"]}
      activeItem={1}
      highlightItem={0}
    >
      <div style={{ display: "flex", gap: 20, height: "100%" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: FILM.cyan, marginBottom: 12 }}>
            Organizing scattered candidates → unified profile
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const visible = i >= 6 - cardCount;
              const x = interpolate(mergeProgress, [0, 1], [i * 30, 0]);
              const y = interpolate(mergeProgress, [0, 1], [i * 15, 0]);
              const opacity = visible ? 1 : interpolate(mergeProgress, [0.5, 1], [1, 0], { extrapolateRight: "clamp" });
              const scale = visible && i === 5 - cardCount ? 1 : visible ? 0.7 : 0.5;
              return (
                <div
                  key={i}
                  style={{
                    width: 100,
                    height: 70,
                    borderRadius: 8,
                    background: "rgba(15,23,42,0.75)",
                    border: `1px solid ${FILM.purple}88`,
                    boxShadow: `0 0 12px ${FILM.purple}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: FILM.mutedLight,
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    opacity,
                  }}
                >
                  CV #{i + 1}
                </div>
              );
            })}
          </div>
          <FlyInItem delay={25} fromX={0} fromY={20}>
            <div
              style={{
                background: FILM.bgPanelDark,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${FILM.neon}66`,
                boxShadow: `0 0 28px ${FILM.neon}28`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "linear-gradient(145deg,#1e293b,#0f172a)",
                    border: `1px solid ${FILM.cyan}66`,
                    color: FILM.cyan,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  AK
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: FILM.textLight }}>Anna Kowalska</div>
                  <div style={{ fontSize: 12, color: FILM.mutedLight }}>Senior Backend Engineer</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <LoadingDots />
                </div>
              </div>
            </div>
          </FlyInItem>
        </div>
        <div
          style={{
            width: 380,
            padding: 14,
            borderRadius: 12,
            background: FILM.bgPanelDark,
            border: `1px solid ${FILM.cyanBorder}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: FILM.cyan, marginBottom: 10 }}>
            Talent Memory forming
          </div>
          {SKILLS.map((s, i) => {
            const fill = interpolate(frame, [30 + i * 6, 48 + i * 6], [0, 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={s} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: FILM.textLight, fontWeight: 600 }}>{s}</span>
                  <span style={{ color: FILM.neon }}>{Math.round(fill)}%</span>
                </div>
                <ProgressBar progress={fill} color={FILM.blue} height={6} />
              </div>
            );
          })}
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: FILM.textLight }}>Preferences</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {PREFS.map((p, i) => {
              const show = frame > 55 + i * 5;
              return show ? (
                <span
                  key={p}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: `${FILM.purple}22`,
                    border: `1px solid ${FILM.purple}66`,
                    color: FILM.purple,
                    fontSize: 11,
                    fontWeight: 600,
                    transform: `scale(${spring({ frame: frame - 55 - i * 5, fps, config: { damping: 12 } })})`,
                  }}
                >
                  {p}
                </span>
              ) : null;
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: FILM.textLight, marginBottom: 4 }}>Availability</div>
            <ProgressBar
              progress={interpolate(frame, [70, 95], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
              color={FILM.neon}
            />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
