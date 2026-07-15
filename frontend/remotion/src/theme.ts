/** Remotion-only design tokens — no runtime app CSS dependency. */
export const FILM = {
  bgDark: "#0f172a",
  bgMid: "#1e293b",
  bgPanel: "#ffffff",
  bgPanelDark: "#111827",
  bgSoft: "#f1f5f9",
  accent: "#34d399",
  accentDark: "#059669",
  neon: "#22c55e",
  cyan: "#38bdf8",
  cyanBorder: "rgba(56,189,248,0.28)",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  text: "#0f172a",
  textLight: "#f8fafc",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  border: "#cbd5e1",
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  width: 1920,
  height: 1080,
} as const;

export type FilmTheme = typeof FILM;
