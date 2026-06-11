import {
  recruiterInboxSignalOverflowClass,
  recruiterInboxSignalRowClass,
} from "@/lib/recruiter-inbox-visual";

export type RecruiterSignalItem = {
  text: string;
  kind: "positive" | "verification" | "neutral";
};

type Props = {
  items: RecruiterSignalItem[];
  overflowCount: number;
  overflowLabel: string;
  sectionLabel: string;
};

function SignalIcon({ kind }: { kind: RecruiterSignalItem["kind"] }) {
  if (kind === "positive") {
    return (
      <span className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden>
        ✓
      </span>
    );
  }
  if (kind === "verification") {
    return (
      <span className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden>
        !
      </span>
    );
  }
  return (
    <span className="mt-0.5 shrink-0 text-[var(--twin-muted)]" aria-hidden>
      ·
    </span>
  );
}

export function RecruiterSignalList({ items, overflowCount, overflowLabel, sectionLabel }: Props) {
  if (items.length === 0 && overflowCount === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-[var(--twin-muted-strong)]">{sectionLabel}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={`${item.kind}-${index}-${item.text}`} className={recruiterInboxSignalRowClass(item.kind)}>
            <SignalIcon kind={item.kind} />
            <span className="min-w-0 flex-1">{item.text}</span>
          </li>
        ))}
        {overflowCount > 0 ? (
          <li className={recruiterInboxSignalOverflowClass()}>{overflowLabel}</li>
        ) : null}
      </ul>
    </div>
  );
}
