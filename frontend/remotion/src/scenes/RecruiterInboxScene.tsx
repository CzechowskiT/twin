import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import {
  AnimatedCursor,
  SuccessFlash,
  useCursorPath,
} from "../components/MotionPrimitives";
import { FILM } from "../theme";

const QUEUE = [
  { name: "Alex K.", title: "Senior Fullstack", score: 94, active: true },
  { name: "Jordan M.", title: "Data Scientist", score: 82, active: false },
  { name: "Sam P.", title: "UX Designer", score: 76, active: false },
];

const WHY = ["B2B SaaS product overlap", "Stack: Python + FastAPI", "Hybrid Warsaw fit"];
const SKILLS = ["Python 5+ yrs", "FastAPI", "PostgreSQL", "PL auth"];
const METRICS = [
  { label: "Skills", value: 96 },
  { label: "Experience", value: 91 },
  { label: "Culture", value: 88 },
  { label: "Comp", value: 84 },
];

/** Dense dark-glass recruiter cockpit — matches interactive /demo aesthetic. */
export function RecruiterInboxScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const score = Math.round(interpolate(frame, [10, 55], [61, 94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const showTags = frame > 40;
  const showMetrics = frame > 55;
  const invited = frame >= 140;
  const neonPulse = interpolate(frame % 40, [0, 20, 40], [0.35, 0.7, 0.35]);

  const cursor = useCursorPath([
    { frame: 25, x: 280, y: 280 },
    { frame: 70, x: 920, y: 360 },
    { frame: 110, x: 780, y: 720 },
    { frame: 140, x: 780, y: 720, click: true },
    { frame: 190, x: 1400, y: 420 },
  ]);

  return (
    <div
      style={{
        width: 1760,
        height: 920,
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: FILM.font,
        color: FILM.textLight,
        background: `linear-gradient(165deg, ${FILM.bgDark} 0%, #0c1222 55%, #080e1c 100%)`,
        border: `1px solid ${FILM.cyanBorder}`,
        boxShadow: `0 0 0 1px ${FILM.cyan}22 inset, 0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${FILM.neon}14`,
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.97, 1])})`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Inbox */}
        <aside style={panelStyle}>
          <div style={labelStyle}>
            Inbox <span style={badgeStyle}>3</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: FILM.neon, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: FILM.neon, boxShadow: `0 0 8px ${FILM.neon}` }} />
            New matches
          </div>
          {QUEUE.map((item, i) => (
            <div
              key={item.name}
              style={{
                ...rowStyle,
                borderColor: item.active ? FILM.cyan : "rgba(148,163,184,0.18)",
                boxShadow: item.active ? `0 0 14px ${FILM.cyan}33` : "none",
                opacity: interpolate(frame, [i * 8, i * 8 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              <Avatar initials={item.name.slice(0, 2).toUpperCase()} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: FILM.mutedLight }}>{item.title}</div>
              </div>
              <span style={pillStyle}>{i === 0 ? score : item.score}%</span>
            </div>
          ))}
        </aside>

        {/* Profile */}
        <main style={{ ...panelStyle, boxShadow: `0 0 28px ${FILM.cyan}14` }}>
          <div style={labelStyle}>Candidate review</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials="AK" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Alex K. (demo)</div>
              <div style={{ fontSize: 13, color: FILM.mutedLight }}>Senior Fullstack Developer</div>
            </div>
            <span style={{ ...pillStyle, fontSize: 14, padding: "6px 10px" }}>{score}%</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {["7 yrs experience", "Warszawa", "PL / EN", "Available now"].map((c) => (
              <span key={c} style={chipStyle}>{c}</span>
            ))}
          </div>
          <div style={{ ...labelStyle, marginTop: 14 }}>Why this fit</div>
          {WHY.map((w, i) => (
            <div
              key={w}
              style={{
                fontSize: 13,
                marginTop: 4,
                opacity: frame > 35 + i * 8 ? 1 : 0.15,
              }}
            >
              <span style={{ color: FILM.neon, fontWeight: 700, marginRight: 6 }}>✓</span>
              {w}
            </div>
          ))}
          {showTags ? (
            <>
              <div style={{ ...labelStyle, marginTop: 12 }}>Key skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {SKILLS.map((s) => (
                  <span key={s} style={{ ...chipStyle, borderColor: `${FILM.neon}66`, color: FILM.neon, background: `${FILM.neon}18` }}>
                    {s}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => {
                  const on = i !== 2;
                  return (
                    <div
                      key={d}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "8px 0",
                        borderRadius: 8,
                        border: `1px solid ${on ? `${FILM.neon}66` : "rgba(148,163,184,0.2)"}`,
                        color: on ? FILM.neon : FILM.mutedLight,
                        fontSize: 11,
                        background: on ? `${FILM.neon}14` : "transparent",
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", margin: "0 auto 4px" }} />
                      {d}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" style={{ ...btnGhost, pointerEvents: "none" }}>Message</button>
            <button
              type="button"
              style={{
                ...btnNeon,
                boxShadow: invited ? `0 0 18px ${FILM.neon}88` : `0 0 ${18 + neonPulse * 14}px ${FILM.neon}99`,
                transform: frame >= 135 && frame < 150 ? "scale(0.96)" : "scale(1)",
              }}
            >
              {invited ? "Invite sent ✓" : "Invite to interview"}
            </button>
            <button type="button" style={{ ...btnGhost, pointerEvents: "none" }}>Decline</button>
          </div>
          <SuccessFlash startFrame={140} />
        </main>

        {/* Score */}
        <aside style={panelStyle}>
          <div style={labelStyle}>Match score</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: FILM.neon, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontSize: 12, color: FILM.neon, fontWeight: 600, marginTop: 4 }}>+6% vs avg</div>
          {showMetrics
            ? METRICS.map((m) => (
                <div key={m.label} style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: FILM.mutedLight }}>
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "#1e293b", marginTop: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${interpolate(frame, [55, 90], [0, m.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: `linear-gradient(90deg, ${FILM.blue}, ${FILM.cyan})`,
                        boxShadow: `0 0 10px ${FILM.blue}88`,
                      }}
                    />
                  </div>
                </div>
              ))
            : null}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${FILM.blue}66`,
              background: "rgba(30,58,138,0.28)",
            }}
          >
            <div style={labelStyle}>Next step</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Proposed slot</div>
            <div style={{ fontSize: 14, color: FILM.cyan, fontWeight: 700, marginTop: 2 }}>Wed 14:00</div>
            <div
              style={{
                marginTop: 10,
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: 8,
                background: `${FILM.cyan}33`,
                border: `1px solid ${FILM.cyan}`,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Book slot
            </div>
          </div>
        </aside>
      </div>

      {/* Timeline */}
      <footer
        style={{
          display: "flex",
          gap: 28,
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${FILM.cyanBorder}`,
          background: "rgba(15,23,42,0.9)",
          fontSize: 12,
        }}
      >
        {[
          { label: "Inbox", done: true },
          { label: "Review", done: frame > 40 },
          { label: "Score", done: showMetrics },
          { label: "Decision", active: !invited && frame > 100, done: invited },
          { label: "Interview", active: invited },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: s.active ? FILM.cyan : s.done ? FILM.neon : FILM.mutedLight,
              fontWeight: s.active ? 700 : 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "currentColor",
                boxShadow: s.active ? `0 0 10px ${FILM.cyan}` : "none",
              }}
            />
            {s.label}
          </div>
        ))}
      </footer>

      <AnimatedCursor x={cursor.x} y={cursor.y} clicking={cursor.clicking} visible={cursor.visible} />
    </div>
  );
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${FILM.cyan}66`,
        background: "linear-gradient(145deg,#1e293b,#0f172a)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color: FILM.cyan,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 14,
  borderRadius: 12,
  border: `1px solid ${FILM.cyanBorder}`,
  background: FILM.bgPanelDark,
  overflow: "hidden",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: FILM.cyan,
};

const badgeStyle: React.CSSProperties = {
  marginLeft: 6,
  padding: "1px 7px",
  borderRadius: 999,
  background: FILM.cyan,
  color: "#0f172a",
  fontSize: 10,
  fontWeight: 800,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(15,23,42,0.55)",
  marginBottom: 8,
};

const pillStyle: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 999,
  background: `${FILM.neon}22`,
  color: FILM.neon,
  fontSize: 11,
  fontWeight: 700,
};

const chipStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(15,23,42,0.65)",
  fontSize: 11,
  color: FILM.mutedLight,
};

const btnNeon: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: `1px solid ${FILM.neon}`,
  background: `linear-gradient(180deg, ${FILM.neon}, #16a34a)`,
  color: "#052e16",
  fontWeight: 800,
  fontSize: 13,
};

const btnGhost: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.7)",
  color: FILM.mutedLight,
  fontWeight: 600,
  fontSize: 13,
};
