export type FilmLocale = "en" | "pl";

export type FilmSegment = {
  id: string;
  startSec: number;
  endSec: number;
  caption: string;
};

export const FILM_DURATION_SEC = 45;
export const FILM_FPS = 30;
/** Meaningful UI reveal cadence inside scenes (~1s between successive elements). */
export const FILM_BEAT_FRAMES = FILM_FPS;

const EN_SEGMENTS: FilmSegment[] = [
  { id: "inbox", startSec: 0, endSec: 7, caption: "Inbox chaos — thousands of pings, zero clarity" },
  { id: "organize", startSec: 7, endSec: 13, caption: "TWIN organizes — one profile, ranked signal" },
  { id: "candidate", startSec: 13, endSec: 21, caption: "Candidate — matches worth your time" },
  { id: "recruiter", startSec: 21, endSec: 29, caption: "Recruiter — review cards, not blind piles" },
  { id: "company", startSec: 29, endSec: 35, caption: "Company — pipeline quality, team aligned" },
  { id: "calendar", startSec: 35, endSec: 41, caption: "Calendar of acceptance — pre-qualified holds" },
  { id: "finale", startSec: 41, endSec: 45, caption: "Explore the interactive demo" },
];

const PL_SEGMENTS: FilmSegment[] = [
  { id: "inbox", startSec: 0, endSec: 7, caption: "Chaos w skrzynce — tysiące pingów, zero jasności" },
  { id: "organize", startSec: 7, endSec: 13, caption: "TWIN porządkuje — jeden profil, sygnał z rankingu" },
  { id: "candidate", startSec: 13, endSec: 21, caption: "Kandydat — dopasowania warte Twojego czasu" },
  { id: "recruiter", startSec: 21, endSec: 29, caption: "Rekruter — karty review, nie ślepe stosy" },
  { id: "company", startSec: 29, endSec: 35, caption: "Firma — jakość pipeline, zespół zsynchronizowany" },
  { id: "calendar", startSec: 35, endSec: 41, caption: "Kalendarz akceptacji — pre-kwalifikowane holdy" },
  { id: "finale", startSec: 41, endSec: 45, caption: "Odkryj interaktywne demo" },
];

export function filmSegments(locale: FilmLocale): FilmSegment[] {
  return locale === "pl" ? PL_SEGMENTS : EN_SEGMENTS;
}

export function captionAtSec(locale: FilmLocale, sec: number): string {
  const segments = filmSegments(locale);
  for (let i = segments.length - 1; i >= 0; i--) {
    if (sec >= segments[i]!.startSec) return segments[i]!.caption;
  }
  return segments[0]!.caption;
}

/** VTT supplements visuals — short captions, not describe-only narration. */
export function vttCaptions(locale: FilmLocale): string {
  const segments = filmSegments(locale);
  const lines = ["WEBVTT", ""];
  for (const seg of segments) {
    lines.push(`${formatVttTime(seg.startSec)} --> ${formatVttTime(seg.endSec)}`);
    lines.push(seg.caption);
    lines.push("");
  }
  return lines.join("\n");
}

function formatVttTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
