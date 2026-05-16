"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";

const CHAPTER_ANCHORS = ["story-ch-1", "story-ch-2", "story-ch-3", "story-timeline"] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function TimelineItem({
  when,
  title,
  body,
  isLast,
}: {
  when: string;
  title: string;
  body: string;
  isLast: boolean;
}) {
  return (
    <div className={`flex gap-5 sm:gap-8 ${isLast ? "" : "pb-14 sm:pb-16"}`}>
      <div className="flex w-6 shrink-0 flex-col items-center pt-1 sm:w-8">
        <span className="h-3 w-3 rounded-full border-2 border-[var(--twin-accent)] bg-[var(--twin-card)] shadow-sm ring-2 ring-[var(--twin-accent-muted)]/60" />
        {!isLast ? <span className="mt-3 w-px flex-1 min-h-[2.5rem] bg-[var(--twin-border)]" aria-hidden /> : null}
      </div>
      <div className="min-w-0 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--twin-accent)]">{when}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">{title}</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--foreground)] sm:text-base">{body}</p>
      </div>
    </div>
  );
}

/** Apple-style scroll story: top progress, chapter rail, full-height beats + timeline. */
export function LandingStoryJourney() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const raf = useRef(0);

  const refCh1 = useRef<HTMLElement>(null);
  const refCh2 = useRef<HTMLElement>(null);
  const refCh3 = useRef<HTMLElement>(null);
  const refTimeline = useRef<HTMLElement>(null);
  const sectionRefs = [refCh1, refCh2, refCh3, refTimeline];

  const chapters = [
    { id: CHAPTER_ANCHORS[0], kicker: t("home.storyCh1Kicker"), title: t("home.storyCh1Title"), body: t("home.storyCh1Body") },
    { id: CHAPTER_ANCHORS[1], kicker: t("home.storyCh2Kicker"), title: t("home.storyCh2Title"), body: t("home.storyCh2Body") },
    { id: CHAPTER_ANCHORS[2], kicker: t("home.storyCh3Kicker"), title: t("home.storyCh3Title"), body: t("home.storyCh3Body") },
  ];

  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, doc.scrollTop / total)) : 0);
    });
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [onScroll]);

  // Ref targets are stable; wire observers once after mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const els = sectionRefs.map((r) => r.current).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.25)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit?.target) return;
        const idx = els.indexOf(hit.target as HTMLElement);
        if (idx >= 0) setActiveChapter(idx);
      },
      { root: null, rootMargin: "-14% 0px -38% 0px", threshold: [0.15, 0.35, 0.55] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[2px] overflow-hidden bg-black/10"
        aria-hidden
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--twin-accent)] via-[var(--twin-accent-soft)] to-[var(--twin-cta)] will-change-transform"
          style={{ transform: `scaleX(${progress})`, transformOrigin: "left center" }}
        />
      </div>

      <nav
        className="pointer-events-auto fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2.5 md:flex"
        aria-label={t("home.journeyRailsAria")}
      >
        {CHAPTER_ANCHORS.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToId(id)}
            className={`group flex h-8 w-8 items-center justify-center rounded-full border transition ${
              activeChapter === i
                ? "border-[var(--twin-accent)] bg-[var(--twin-card)] shadow-[var(--twin-shadow)]"
                : "border-transparent bg-[var(--twin-card)]/70 hover:border-[var(--twin-border)]"
            }`}
            aria-label={
              i < chapters.length ? `${chapters[i].kicker}. ${chapters[i].title}` : `${t("home.timelineEyebrow")}. ${t("home.timelineTitle")}`
            }
            aria-current={activeChapter === i ? "step" : undefined}
          >
            <span
              className={`h-2 w-2 rounded-full transition ${
                activeChapter === i ? "bg-[var(--twin-accent)]" : "bg-[var(--twin-muted)] group-hover:bg-[var(--twin-accent-soft)]"
              }`}
            />
          </button>
        ))}
      </nav>

      <p className="sr-only">{t("home.journeyScrollHint")}</p>

      {chapters.map((ch, i) => (
        <section
          key={ch.id}
          id={ch.id}
          ref={sectionRefs[i]}
          className="marketing-chapter scroll-mt-24 border-t border-[var(--twin-border)]/80 bg-[var(--background)] px-4 py-[min(18vh,6rem)] sm:px-6 md:min-h-[100svh] md:scroll-mt-28 md:py-0"
        >
          <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col justify-center md:min-h-[100svh] md:py-24">
            <div className="rounded-[1.75rem] border-2 border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-8 shadow-[0_12px_40px_rgb(25_60_50_/0.12)] sm:px-8 sm:py-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)]">
                {t("home.storyEyebrow")}
              </p>
              <p className="mt-4 font-mono text-xs font-semibold text-[var(--twin-accent-hover)]">{ch.kicker}</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
                {ch.title}
              </h2>
              <p className="mt-8 max-w-2xl text-base font-medium leading-relaxed text-[var(--foreground)] sm:text-lg sm:leading-relaxed">
                {ch.body}
              </p>
            </div>
          </div>
        </section>
      ))}

      <section
        id={CHAPTER_ANCHORS[3]}
        ref={refTimeline}
        className="marketing-chapter scroll-mt-24 border-t border-[var(--twin-border)] bg-[var(--background)] bg-gradient-to-b from-[var(--twin-accent-muted)]/45 via-[var(--background)] to-[var(--background)] px-4 py-[min(16vh,5rem)] sm:px-6 md:min-h-[min(100svh,56rem)] md:scroll-mt-28 md:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[1.75rem] border-2 border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-8 shadow-[0_12px_40px_rgb(25_60_50_/0.12)] sm:px-8 sm:py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("home.timelineEyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-4xl">
              {t("home.timelineTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-[var(--foreground)] sm:text-base">
              {t("home.timelineSubtitle")}
            </p>
          </div>

          <div className="relative mt-10 rounded-[1.75rem] border-2 border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-8 shadow-[0_12px_40px_rgb(25_60_50_/0.12)] sm:mt-12 sm:px-8 sm:py-10">
            <TimelineItem
              when={t("home.timeline1When")}
              title={t("home.timeline1Title")}
              body={t("home.timeline1Body")}
              isLast={false}
            />
            <TimelineItem
              when={t("home.timeline2When")}
              title={t("home.timeline2Title")}
              body={t("home.timeline2Body")}
              isLast={false}
            />
            <TimelineItem
              when={t("home.timeline3When")}
              title={t("home.timeline3Title")}
              body={t("home.timeline3Body")}
              isLast
            />
          </div>
        </div>
      </section>
    </>
  );
}
