"use client";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DEMO_FIXTURE_BUNDLE } from "@/lib/demo/demo-fixtures";
import type { InteractiveFlowPhase } from "@/lib/demo/interactive-flow-config";
import type { SalesDemoRole } from "@/lib/demo/sales-demo-config";

type DecisionChoice = "accept" | "decline" | null;

type InteractiveFlowSurfaceProps = {
  role: SalesDemoRole;
  phase: InteractiveFlowPhase;
  decisionChoice: DecisionChoice;
  decisionHover: DecisionChoice;
  onDecisionHover: (choice: DecisionChoice) => void;
  onDecisionClick: (choice: Exclude<DecisionChoice, null>) => void;
  reducedMotion: boolean;
};

function SkeletonBar({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="demo-flow-skeleton h-3 rounded-md bg-[var(--twin-border)]/60 animate-pulse"
      style={{ width }}
    />
  );
}

function CandidateSurface({
  phase,
  decisionChoice,
  decisionHover,
  onDecisionHover,
  onDecisionClick,
}: Omit<InteractiveFlowSurfaceProps, "role" | "reducedMotion">) {
  const { t } = useTranslation();
  const jobs = DEMO_FIXTURE_BUNDLE.topJobs;
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  const showJobs = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showHighlight = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showDecision = phase === "decision";
  const showLoading = phase === "decision_loading";
  const showSuccess = ["success", "outcome"].includes(phase) && decisionChoice === "accept";
  const showDeclined = phase === "outcome" && decisionChoice === "decline";

  return (
    <div className="demo-flow-surface demo-flow-surface--candidate space-y-2" data-demo-flow-surface="candidate">
      {phase === "loading" ? (
        <div className="space-y-2">
          <SkeletonBar width="70%" />
          <SkeletonBar width="90%" />
          <SkeletonBar width="55%" />
        </div>
      ) : null}

      {showJobs ? (
        <ul className="space-y-1.5">
          {jobs.map((job, i) => {
            const visible = phase !== "scan" || i <= 1;
            const ranked = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
            const highlighted = showHighlight && i === 0;
            if (!visible) return null;
            return (
              <li
                key={job.id}
                className={`demo-flow-job-row flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm transition-all duration-300 ${
                  highlighted
                    ? "border-[var(--twin-accent)]/60 bg-[var(--twin-accent-muted)]/25 shadow-sm ring-1 ring-[var(--twin-accent)]/30"
                    : "border-[var(--twin-border)] bg-[var(--twin-surface-soft)]"
                } ${ranked ? "opacity-100" : "opacity-70"}`}
                data-demo-flow-job={job.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--twin-fg)]">{job.title}</p>
                  <p className="truncate text-[10px] text-[var(--twin-muted-strong)] sm:text-xs">
                    {job.company} · {job.location}
                  </p>
                </div>
                {ranked ? <DemoMatchGauge score={job.score} size="sm" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showDecision ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              decisionHover === "accept"
                ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)]/40 text-[var(--twin-fg)] scale-[1.02]"
                : "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/20 text-[var(--twin-fg)]"
            }`}
            data-demo-flow-decision="accept"
            onMouseEnter={() => onDecisionHover("accept")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("accept")}
          >
            {t("interactiveDemoPlayer.stageAccept")}
          </button>
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs transition-all sm:text-sm ${
              decisionHover === "decline"
                ? "border-[var(--twin-border)] bg-[var(--twin-surface-soft)] text-[var(--twin-fg)] opacity-100"
                : "border-[var(--twin-border)] text-[var(--twin-muted-strong)] opacity-70"
            }`}
            data-demo-flow-decision="decline"
            onMouseEnter={() => onDecisionHover("decline")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("decline")}
          >
            {t("interactiveDemoPlayer.stageDecline")}
          </button>
        </div>
      ) : null}

      {showLoading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--twin-muted-strong)] sm:text-sm" data-demo-flow-loading>
          <span className="demo-flow-spinner inline-block h-4 w-4 rounded-full border-2 border-[var(--twin-accent)] border-t-transparent animate-spin" />
          {t("demoInteractive.processing")}
        </div>
      ) : null}

      {showSuccess ? (
        <div
          className="rounded-lg border border-dashed border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/15 p-2.5 text-xs sm:text-sm"
          data-demo-flow-success
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
            {t("demo.calendarHoldTitle")}
          </p>
          <p className="mt-0.5 font-semibold text-[var(--twin-fg)]">
            {slot.when} · {slot.duration}
          </p>
          <p className="text-[var(--twin-muted-strong)]">{slot.title}</p>
        </div>
      ) : null}

      {showDeclined ? (
        <p className="text-xs text-[var(--twin-muted-strong)] sm:text-sm" data-demo-flow-declined>
          {t("demoInteractive.declinedNote")}
        </p>
      ) : null}
    </div>
  );
}

function RecruiterSurface({
  phase,
  decisionChoice,
  decisionHover,
  onDecisionHover,
  onDecisionClick,
}: Omit<InteractiveFlowSurfaceProps, "role" | "reducedMotion">) {
  const { t } = useTranslation();
  const candidate = DEMO_FIXTURE_BUNDLE.inboxCandidate;
  const card = DEMO_FIXTURE_BUNDLE.reviewCard;
  const showCard = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showScore = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showTags = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);

  return (
    <div className="demo-flow-surface demo-flow-surface--recruiter space-y-2 text-xs sm:text-sm" data-demo-flow-surface="recruiter">
      {phase === "loading" ? (
        <div className="space-y-2">
          <SkeletonBar width="60%" />
          <SkeletonBar width="80%" />
        </div>
      ) : null}

      {showCard ? (
        <div
          className={`rounded-lg border p-2.5 transition-all duration-300 ${
            showTags
              ? "border-[var(--twin-accent)]/40 bg-[var(--twin-surface-soft)] shadow-sm"
              : "border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/80"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[var(--twin-fg)]">{candidate.name}</p>
              <p className="text-[var(--twin-muted-strong)]">{candidate.title}</p>
            </div>
            {showScore ? <DemoMatchGauge score={candidate.matchScore} size="sm" /> : null}
          </div>
          {showTags ? (
            <>
              <p className="mt-2 leading-snug text-[var(--twin-muted-strong)]">{card.why_this_candidate}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {card.requirements_matched.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/25 px-1.5 py-0.5 text-[10px] text-[var(--twin-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {phase === "decision" ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              decisionHover === "accept"
                ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)]/40 scale-[1.02]"
                : "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/20"
            }`}
            data-demo-flow-decision="accept"
            onMouseEnter={() => onDecisionHover("accept")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("accept")}
          >
            {t("interactiveDemoPlayer.stageAccept")}
          </button>
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs transition-all sm:text-sm ${
              decisionHover === "decline" ? "opacity-100" : "opacity-60"
            }`}
            data-demo-flow-decision="decline"
            onMouseEnter={() => onDecisionHover("decline")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("decline")}
          >
            {t("interactiveDemoPlayer.stageDecline")}
          </button>
        </div>
      ) : null}

      {phase === "decision_loading" ? (
        <div className="flex items-center gap-2 text-[var(--twin-muted-strong)]" data-demo-flow-loading>
          <span className="demo-flow-spinner inline-block h-4 w-4 rounded-full border-2 border-[var(--twin-accent)] border-t-transparent animate-spin" />
          {t("demoInteractive.processing")}
        </div>
      ) : null}

      {["success", "outcome"].includes(phase) && decisionChoice === "accept" ? (
        <div className="rounded-lg border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/15 p-2.5" data-demo-flow-success>
          <p className="font-medium text-[var(--twin-fg)]">{t("demoInteractive.recruiterSlotProposed")}</p>
          <p className="text-[var(--twin-muted-strong)]">{DEMO_FIXTURE_BUNDLE.calendarSlot.when}</p>
        </div>
      ) : null}
    </div>
  );
}

function CompanySurface({
  phase,
  decisionChoice,
  decisionHover,
  onDecisionHover,
  onDecisionClick,
}: Omit<InteractiveFlowSurfaceProps, "role" | "reducedMotion">) {
  const { t } = useTranslation();
  const company = DEMO_FIXTURE_BUNDLE.company;
  const roles = ["Senior Fullstack", "Staff Backend", "Platform Lead"];
  const showStats = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showPool = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showPromote = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);

  return (
    <div className="demo-flow-surface demo-flow-surface--company space-y-2" data-demo-flow-surface="company">
      {phase === "loading" ? (
        <div className="grid grid-cols-2 gap-2">
          <SkeletonBar width="100%" />
          <SkeletonBar width="100%" />
        </div>
      ) : null}

      {showStats ? (
        <dl className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-2 sm:p-3">
            <dt className="text-[10px] text-[var(--twin-muted-strong)]">{t("interactiveDemoPlayer.companyRoles")}</dt>
            <dd className="text-base font-semibold text-[var(--twin-fg)] sm:text-lg">{company.talentMemoryRoles}</dd>
          </div>
          <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] p-2 sm:p-3">
            <dt className="text-[10px] text-[var(--twin-muted-strong)]">{t("interactiveDemoPlayer.companyPipelines")}</dt>
            <dd className="text-base font-semibold text-[var(--twin-fg)] sm:text-lg">{company.activePipelines}</dd>
          </div>
        </dl>
      ) : null}

      {showPool ? (
        <div className="flex flex-wrap gap-1.5">
          {roles.map((role, i) => (
            <span
              key={role}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-all duration-300 ${
                showPromote && i === 0
                  ? "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/35 font-medium text-[var(--twin-accent)]"
                  : "border-[var(--twin-border)] bg-[var(--twin-surface-soft)] text-[var(--twin-fg)]"
              }`}
            >
              {role}
            </span>
          ))}
        </div>
      ) : null}

      {phase === "decision" ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              decisionHover === "accept"
                ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)]/40 scale-[1.02]"
                : "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/20"
            }`}
            data-demo-flow-decision="accept"
            onMouseEnter={() => onDecisionHover("accept")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("accept")}
          >
            {t("demoInteractive.promote")}
          </button>
          <button
            type="button"
            className={`demo-flow-decision-btn rounded-md border px-3 py-1.5 text-xs opacity-60 sm:text-sm ${
              decisionHover === "decline" ? "opacity-100" : ""
            }`}
            data-demo-flow-decision="decline"
            onMouseEnter={() => onDecisionHover("decline")}
            onMouseLeave={() => onDecisionHover(null)}
            onClick={() => onDecisionClick("decline")}
          >
            {t("demoInteractive.hold")}
          </button>
        </div>
      ) : null}

      {phase === "decision_loading" ? (
        <div className="flex items-center gap-2 text-xs text-[var(--twin-muted-strong)]" data-demo-flow-loading>
          <span className="demo-flow-spinner inline-block h-4 w-4 rounded-full border-2 border-[var(--twin-accent)] border-t-transparent animate-spin" />
          {t("demoInteractive.processing")}
        </div>
      ) : null}

      {["success", "outcome"].includes(phase) && decisionChoice === "accept" ? (
        <div className="rounded-lg border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/15 p-2.5 text-xs sm:text-sm" data-demo-flow-success>
          <p className="font-medium text-[var(--twin-fg)]">{t("demoInteractive.companyPipelineUpdated")}</p>
          <p className="text-[var(--twin-muted-strong)]">{t("demoInteractive.companyNextStep")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function InteractiveFlowSurface(props: InteractiveFlowSurfaceProps) {
  const { role, ...rest } = props;
  if (role === "candidate") return <CandidateSurface {...rest} />;
  if (role === "recruiter") return <RecruiterSurface {...rest} />;
  return <CompanySurface {...rest} />;
}
