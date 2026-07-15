import React from "react";

import { FILM } from "../theme";

type ProductShellProps = {
  title: string;
  sidebarLabel: string;
  sidebarItems: string[];
  activeItem: number;
  children: React.ReactNode;
};

/** Browser chrome + sidebar — explicit inline styles only. */
export function ProductShell({
  title,
  sidebarLabel,
  sidebarItems,
  activeItem,
  children,
}: ProductShellProps) {
  return (
    <div
      style={{
        width: 1400,
        height: 780,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        border: `2px solid ${FILM.border}`,
        display: "flex",
        flexDirection: "column",
        fontFamily: FILM.font,
      }}
    >
      <div
        style={{
          height: 44,
          background: "#334155",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
        }}
      >
        {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            flex: 1,
            margin: "0 24px",
            height: 28,
            borderRadius: 6,
            background: "#475569",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          app.twin-society.com/{title}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside
          style={{
            width: 220,
            background: "#1e293b",
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: FILM.accent,
              padding: "0 12px 12px",
            }}
          >
            {sidebarLabel}
          </div>
          {sidebarItems.map((item, i) => (
            <div
              key={item}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: i === activeItem ? 600 : 400,
                color: i === activeItem ? FILM.textLight : "#94a3b8",
                background: i === activeItem ? "#334155" : "transparent",
              }}
            >
              {item}
            </div>
          ))}
        </aside>
        <main
          style={{
            flex: 1,
            background: FILM.bgSoft,
            padding: 24,
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
