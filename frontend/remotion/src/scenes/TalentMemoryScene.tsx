import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { FILM } from "../theme";

const NODES = [
  { label: "Skills", x: 120, y: 80, color: FILM.blue },
  { label: "Culture", x: 280, y: 40, color: FILM.purple },
  { label: "Goals", x: 440, y: 90, color: FILM.amber },
  { label: "History", x: 200, y: 180, color: FILM.accent },
  { label: "Bar", x: 380, y: 200, color: FILM.red },
];

export function TalentMemoryScene() {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [0, 30, 60], [0.8, 1, 0.8], { extrapolateRight: "extend" });

  return (
    <div
      style={{
        width: 600,
        height: 320,
        position: "relative",
        background: "#1e293b",
        borderRadius: 16,
        border: `2px solid ${FILM.accent}`,
        boxShadow: `0 0 60px ${FILM.accent}44`,
      }}
    >
      <svg width="600" height="320" viewBox="0 0 600 320">
        {NODES.map((n, i) =>
          NODES.slice(i + 1).map((m) => (
            <line
              key={`${n.label}-${m.label}`}
              x1={n.x + 40}
              y1={n.y + 20}
              x2={m.x + 40}
              y2={m.y + 20}
              stroke={FILM.accent}
              strokeWidth={2}
              opacity={0.4}
            />
          )),
        )}
        {NODES.map((n, i) => {
          const scale = interpolate(frame, [i * 8, i * 8 + 15], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <g key={n.label} transform={`translate(${n.x}, ${n.y}) scale(${scale})`}>
              <rect x={0} y={0} width={80} height={40} rx={8} fill={n.color} />
              <text x={40} y={26} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={600}>
                {n.label}
              </text>
            </g>
          );
        })}
        <circle cx={300} cy={160} r={36 * pulse} fill={FILM.accent} opacity={0.9} />
        <text x={300} y={168} textAnchor="middle" fill="#fff" fontSize={18} fontWeight={800}>
          TWIN
        </text>
      </svg>
    </div>
  );
}
