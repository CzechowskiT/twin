import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import {
  AnimatedCursor,
  FlyInItem,
  PulseBadge,
  SuccessFlash,
  useCursorPath,
} from "../components/MotionPrimitives";
import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

export function RecruiterInboxScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardX = interpolate(frame, [0, 40, 120, 180], [400, 200, 200, 600], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(frame, [120, 180], [200, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const consentOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const salaryShow = frame > 60;
  const availShow = frame > 75;
  const invited = frame >= 150;
  const inInterview = frame >= 170;

  const cursor = useCursorPath([
    { frame: 30, x: 500, y: 300 },
    { frame: 80, x: 1100, y: 350 },
    { frame: 130, x: 600, y: 500 },
    { frame: 150, x: 600, y: 500, click: true },
    { frame: 190, x: 900, y: 250 },
  ]);

  return (
    <ProductShell
      title="recruiter/inbox"
      sidebarLabel="Recruiter"
      sidebarItems={["Review queue", "Invites", "Calendar", "Interview"]}
      activeItem={inInterview ? 3 : 0}
      highlightItem={invited && !inInterview ? 1 : undefined}
    >
      <div style={{ position: "relative", height: "100%" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["Review", "Invited", "Interview"].map((col, i) => {
            const count = i === 0 ? (inInterview ? 0 : 1) : i === 1 ? (invited && !inInterview ? 1 : 0) : inInterview ? 1 : 0;
            return (
              <div
                key={col}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: count > 0 ? "#ecfdf5" : "#fff",
                  border: `2px solid ${count > 0 ? FILM.accent : FILM.border}`,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: count > 0 ? FILM.accentDark : FILM.muted,
                }}
              >
                {col} ({count})
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: cardX,
            top: cardY,
            width: 380,
            zIndex: 10,
          }}
        >
          <FlyInItem delay={0} fromX={200} fromY={-30}>
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                border: `2px solid ${FILM.purple}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                transform: `scale(${spring({ frame, fps, config: { damping: 14 } })})`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: FILM.text }}>Anna Kowalska</div>
                  <div style={{ fontSize: 12, color: FILM.muted }}>Senior Backend · 94% match</div>
                </div>
                <PulseBadge color={FILM.purple}>{inInterview ? "Interview" : invited ? "Invited" : "Review"}</PulseBadge>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Python ✓", "FastAPI ✓", "Team fit ✓"].map((t) => (
                  <span key={t} style={{ fontSize: 11, color: FILM.accentDark, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
              {!invited ? (
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      padding: "8px 18px",
                      borderRadius: 7,
                      background: frame >= 145 && frame < 155 ? "#059669" : FILM.accent,
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Invite
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: "8px 18px",
                      borderRadius: 7,
                      background: "#fff",
                      color: FILM.muted,
                      border: `1px solid ${FILM.border}`,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#ecfdf5", color: FILM.accentDark, fontSize: 12, fontWeight: 600 }}>
                  ✓ Invite sent — moving to Interview
                </div>
              )}
              <SuccessFlash startFrame={150} />
            </div>
          </FlyInItem>
        </div>

        <div
          style={{
            position: "absolute",
            right: 20,
            top: 80,
            width: 280,
            opacity: consentOpacity,
            transform: `translateX(${interpolate(consentOpacity, [0, 1], [40, 0])}px)`,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: `2px solid ${FILM.accent}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: FILM.text }}>Consent + readiness</div>
            <div style={{ marginTop: 8, fontSize: 11, color: FILM.muted }}>
              ✓ Data share approved
            </div>
            {salaryShow ? (
              <div style={{ marginTop: 6, fontSize: 11, color: FILM.text, fontWeight: 600 }}>
                Salary: €120k–€140k aligned
              </div>
            ) : null}
            {availShow ? (
              <div style={{ marginTop: 6, fontSize: 11, color: FILM.accentDark, fontWeight: 600 }}>
                ✓ Available Wed 14:00
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <AnimatedCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} visible={cursor.visible} />
    </ProductShell>
  );
}
