import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { ProductShell } from "../components/ProductShell";
import { FILM } from "../theme";

export function RecruiterInboxScene() {
  const frame = useCurrentFrame();
  const consentOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <ProductShell
      title="recruiter/inbox"
      sidebarLabel="Recruiter"
      sidebarItems={["Review queue", "Invites", "Calendar", "Pipeline"]}
      activeItem={0}
    >
      <div style={{ display: "flex", gap: 20 }}>
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            border: `2px solid ${FILM.purple}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: FILM.text }}>Anna Kowalska</div>
              <div style={{ fontSize: 14, color: FILM.muted }}>Senior Backend · 94% match</div>
            </div>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: "#ede9fe",
                color: FILM.purple,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Review
            </span>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            {["Python ✓", "FastAPI ✓", "Team fit ✓"].map((t) => (
              <span key={t} style={{ fontSize: 12, color: FILM.accentDark, fontWeight: 600 }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button
              type="button"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: FILM.accent,
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Accept
            </button>
            <button
              type="button"
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "#fff",
                color: FILM.muted,
                border: `1px solid ${FILM.border}`,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Decline
            </button>
          </div>
        </div>
        <div
          style={{
            width: 260,
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            border: `2px solid ${FILM.accent}`,
            opacity: consentOpacity,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: FILM.text }}>Consent + invite</div>
          <div style={{ fontSize: 13, color: FILM.muted, marginTop: 8 }}>
            Candidate approved data share. Interview invite sent.
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: "#ecfdf5",
              color: FILM.accentDark,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ✓ Wed 14:00 hold proposed
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
