import type { MouseEvent } from "react";

/** Same-document anchors: explicit scroll so SPA navigations still land on the section. */
export function scrollToDashboardHash(e: MouseEvent<HTMLAnchorElement>) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const href = e.currentTarget.getAttribute("href");
  if (!href?.startsWith("#")) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", href);
}
