import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { FILM } from "../theme";

type ProductShellProps = {
  title: string;
  sidebarLabel: string;
  sidebarItems: string[];
  activeItem: number;
  children: React.ReactNode;
  highlightItem?: number;
};

/** Full-frame browser chrome — product dominates ≥75% of frame. */
export function ProductShell({
  title,
  sidebarLabel,
  sidebarItems,
  activeItem,
  children,
  highlightItem,
}: ProductShellProps) {
  const frame = useCurrentFrame();
  const shimmer = interpolate(frame % 60, [0, 30, 60], [0.4, 1, 0.4]);

  return (
    <div
      style={{
        width: 1760,
        height: 920,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 32px 100px rgba(0,0,0,0.55)",
        border: `2px solid ${FILM.border}`,
        display: "flex",
        flexDirection: "column",
        fontFamily: FILM.font,
      }}
    >
      <div
        style={{
          height: 40,
          background: "#334155",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 8,
        }}
      >
        {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            flex: 1,
            margin: "0 20px",
            height: 26,
            borderRadius: 6,
            background: "#475569",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          app.twin-society.com/{title}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", opacity: shimmer }}>● live</div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside
          style={{
            width: 200,
            background: "#1e293b",
            padding: "16px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: FILM.accent,
              padding: "0 10px 10px",
            }}
          >
            {sidebarLabel}
          </div>
          {sidebarItems.map((item, i) => {
            const isActive = i === activeItem;
            const isHighlight = i === highlightItem;
            return (
              <div
                key={item}
                style={{
                  padding: "9px 10px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? FILM.textLight : "#94a3b8",
                  background: isActive ? "#334155" : isHighlight ? "#33415588" : "transparent",
                  borderLeft: isHighlight ? `3px solid ${FILM.accent}` : "3px solid transparent",
                }}
              >
                {item}
              </div>
            );
          })}
        </aside>
        <main
          style={{
            flex: 1,
            background: FILM.bgSoft,
            padding: 20,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
