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

/** Full-frame dark-glass browser chrome — product dominates ≥75% of frame. */
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
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 0 0 1px ${FILM.cyan}22 inset, 0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${FILM.neon}14`,
        border: `1px solid ${FILM.cyanBorder}`,
        display: "flex",
        flexDirection: "column",
        fontFamily: FILM.font,
        background: `linear-gradient(165deg, ${FILM.bgDark} 0%, #0c1222 55%, #080e1c 100%)`,
        color: FILM.textLight,
      }}
    >
      <div
        style={{
          height: 40,
          background: "rgba(15,23,42,0.95)",
          borderBottom: `1px solid ${FILM.cyanBorder}`,
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
            background: "rgba(30,41,59,0.9)",
            border: `1px solid ${FILM.cyanBorder}`,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            color: FILM.mutedLight,
            fontSize: 12,
          }}
        >
          app.twin-society.com/{title}
        </div>
        <div style={{ fontSize: 11, color: FILM.cyan, opacity: shimmer }}>● live</div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside
          style={{
            width: 200,
            background: "rgba(8,14,28,0.92)",
            borderRight: `1px solid ${FILM.cyanBorder}`,
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
              color: FILM.cyan,
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
                  color: isActive || isHighlight ? FILM.textLight : FILM.mutedLight,
                  background: isActive
                    ? "rgba(56,189,248,0.14)"
                    : isHighlight
                      ? "rgba(56,189,248,0.08)"
                      : "transparent",
                  borderLeft: isActive || isHighlight ? `3px solid ${FILM.neon}` : "3px solid transparent",
                  boxShadow: isActive ? `0 0 12px ${FILM.cyan}22` : "none",
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
            background: "transparent",
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
