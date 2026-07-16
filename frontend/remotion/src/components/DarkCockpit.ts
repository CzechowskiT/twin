import type React from "react";

import { FILM } from "../theme";

/** Shared dark-navy glass tokens for every Remotion product scene. */
export const glassPanel: React.CSSProperties = {
  background: FILM.bgPanelDark,
  borderRadius: 12,
  border: `1px solid ${FILM.cyanBorder}`,
  boxShadow: `0 0 20px ${FILM.cyan}12`,
};

export const glassRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(15,23,42,0.65)",
};

export const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: FILM.cyan,
};

export const neonPill: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 999,
  background: `${FILM.neon}22`,
  color: FILM.neon,
  fontSize: 11,
  fontWeight: 700,
};

export const neonButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: `1px solid ${FILM.neon}`,
  background: `linear-gradient(180deg, ${FILM.neon}, #16a34a)`,
  color: "#052e16",
  fontWeight: 800,
  fontSize: 13,
  boxShadow: `0 0 18px ${FILM.neon}77`,
};

export const ghostButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.7)",
  color: FILM.mutedLight,
  fontWeight: 600,
  fontSize: 13,
};

/** Scene shells must be readable from frame 0 — no fade-from-invisible. */
export function sceneEnterOpacity(springValue: number): number {
  return Math.max(0.94, springValue);
}
