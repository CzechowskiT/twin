"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";

type Spec = { kind: "iframe"; src: string } | { kind: "video"; src: string };

function resolveStoryVideoSpec(raw: string): Spec | null {
  const url = raw.trim();
  if (!url) return null;

  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg")) {
    return { kind: "video", src: url };
  }

  if (lower.includes("youtube.com/embed/") || lower.includes("youtube-nocookie.com/embed/")) {
    return { kind: "iframe", src: url };
  }

  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (ytWatch) {
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${ytWatch[1]}?rel=0` };
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  if (lower.includes("player.vimeo.com/video/")) {
    return { kind: "iframe", src: url };
  }

  return null;
}

/** Story block video: `NEXT_PUBLIC_HOME_STORY_VIDEO_URL` (YouTube / Vimeo / .mp4). If unset, a tiny CC0 sample plays so the player is visible; set `NEXT_PUBLIC_HOME_STORY_VIDEO_DISABLE_FALLBACK=true` to hide until you configure a real URL. */
export function MarketingStoryVideo() {
  const { t } = useTranslation();
  const explicit = process.env.NEXT_PUBLIC_HOME_STORY_VIDEO_URL?.trim() ?? "";
  const disableFallback = process.env.NEXT_PUBLIC_HOME_STORY_VIDEO_DISABLE_FALLBACK === "true";
  const fallback =
    !explicit && !disableFallback
      ? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
      : "";
  const raw = explicit || fallback;
  const spec = useMemo(() => resolveStoryVideoSpec(raw), [raw]);
  if (!spec) return null;

  const title = t("home.vacationFilmAria");

  return (
    <div
      className="relative mx-auto mb-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-black shadow-[var(--twin-shadow-md)] aspect-video"
      role="region"
      aria-label={title}
    >
      {spec.kind === "iframe" ? (
        <iframe
          src={spec.src}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video className="absolute inset-0 h-full w-full object-contain" controls playsInline preload="metadata">
          <source src={spec.src} />
        </video>
      )}
    </div>
  );
}
