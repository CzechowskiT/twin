/** Remotion-only design tokens — dark glass / neon cockpit language. */
export const FILM = {
  bgDark: "#0a0c10",
  bgMid: "#0f172a",
  bgPanel: "#111827",
  bgPanelDark: "rgba(15,23,42,0.88)",
  bgSoft: "#0c1222",
  accent: "#34d399",
  accentDark: "#059669",
  neon: "#22c55e",
  cyan: "#38bdf8",
  cyanBorder: "rgba(56,189,248,0.28)",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  text: "#f8fafc",
  textLight: "#f8fafc",
  muted: "#94a3b8",
  mutedLight: "#94a3b8",
  border: "rgba(56,189,248,0.22)",
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  width: 1920,
  height: 1080,
} as const;

export type FilmTheme = typeof FILM;
