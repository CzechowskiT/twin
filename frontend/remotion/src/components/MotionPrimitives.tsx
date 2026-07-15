import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FILM } from "../theme";

/** Small bottom caption — product stays dominant. */
export function CaptionBar({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 20px",
        borderRadius: 8,
        background: "rgba(15,23,42,0.85)",
        border: `1px solid ${FILM.accent}55`,
        fontSize: 15,
        fontWeight: 600,
        color: FILM.textLight,
        letterSpacing: "0.02em",
        fontFamily: FILM.font,
        zIndex: 100,
        maxWidth: "80%",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

/** Subtle camera drift so the frame never feels static. */
export function CameraMotion({ children, intensity = 1 }: { children: React.ReactNode; intensity?: number }) {
  const frame = useCurrentFrame();
  const scale = 1 + Math.sin(frame / 45) * 0.012 * intensity;
  const panX = Math.sin(frame / 60) * 8 * intensity;
  const panY = Math.cos(frame / 50) * 5 * intensity;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
      }}
    >
      {children}
    </div>
  );
}

type CursorProps = { x: number; y: number; clicking?: boolean; visible?: number };

export function AnimatedCursor({ x, y, clicking = false, visible = 1 }: CursorProps) {
  if (visible <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 200,
        pointerEvents: "none",
        opacity: visible,
        transform: clicking ? "scale(0.85)" : "scale(1)",
        transition: "transform 0.1s",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3L19 12L11 13L8 21L5 3Z"
          fill="#fff"
          stroke="#0f172a"
          strokeWidth="1.5"
        />
      </svg>
      {clicking ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `2px solid ${FILM.accent}`,
            animation: "none",
            opacity: 0.7,
          }}
        />
      ) : null}
    </div>
  );
}

export function useCursorPath(
  keyframes: Array<{ frame: number; x: number; y: number; click?: boolean }>,
): { x: number; y: number; clicking: boolean; visible: number } {
  const frame = useCurrentFrame();
  if (keyframes.length === 0) return { x: 0, y: 0, clicking: false, visible: 0 };

  let prev = keyframes[0]!;
  let next = keyframes[0]!;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i]!.frame <= frame) {
      prev = keyframes[i]!;
      next = keyframes[i + 1] ?? keyframes[i]!;
    }
  }

  const progress =
    next.frame === prev.frame
      ? 1
      : interpolate(frame, [prev.frame, next.frame], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        });

  const x = prev.x + (next.x - prev.x) * progress;
  const y = prev.y + (next.y - prev.y) * progress;
  const clicking = keyframes.some((k) => k.click && Math.abs(k.frame - frame) < 4);
  const visible = frame >= keyframes[0]!.frame ? 1 : 0;

  return { x, y, clicking, visible };
}

export function AnimatedCounter({ from, to, startFrame, durationFrames }: {
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
}) {
  const frame = useCurrentFrame();
  const val = interpolate(frame, [startFrame, startFrame + durationFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <>{Math.round(val).toLocaleString()}</>;
}

export function PulseBadge({ children, color = FILM.accent }: { children: React.ReactNode; color?: string }) {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.06;
  return (
    <span
      style={{
        display: "inline-block",
        transform: `scale(${pulse})`,
        padding: "4px 12px",
        borderRadius: 20,
        background: `${color}22`,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

export function LoadingDots() {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: FILM.accent,
            opacity: interpolate((frame + i * 5) % 30, [0, 15, 30], [0.3, 1, 0.3]),
          }}
        />
      ))}
    </span>
  );
}

export function SuccessFlash({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 8, startFrame + 20], [0, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: FILM.accent,
        opacity,
        borderRadius: 12,
        pointerEvents: "none",
        zIndex: 50,
      }}
    />
  );
}

export function FlyInItem({
  children,
  delay,
  fromX = 80,
  fromY = -30,
}: {
  children: React.ReactNode;
  delay: number;
  fromX?: number;
  fromY?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const x = interpolate(enter, [0, 1], [fromX, 0]);
  const y = interpolate(enter, [0, 1], [fromY, 0]);
  const opacity = interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ transform: `translate(${x}px, ${y}px)`, opacity }}>
      {children}
    </div>
  );
}

export function ProgressBar({ progress, color = FILM.accent, height = 8 }: {
  progress: number;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height, borderRadius: height / 2, background: "#e2e8f0", overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          height: "100%",
          background: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}
