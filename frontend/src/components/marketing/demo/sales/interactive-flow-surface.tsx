"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoMatchGauge } from "@/components/marketing/demo-match-gauge";
import { DEMO_FIXTURE_BUNDLE } from "@/lib/demo/demo-fixtures";
import type { InteractiveFlowPhase } from "@/lib/demo/interactive-flow-config";
import type { SalesDemoRole } from "@/lib/demo/sales-demo-config";
import type { TranslationKey } from "@/lib/i18n";

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

const CANDIDATE_TIMELINE = ["scan", "rank", "review", "decision", "calendar"] as const;
const RECRUITER_TIMELINE = ["inbox", "review", "score", "decision", "interview"] as const;
const COMPANY_TIMELINE = ["pipeline", "shortlist", "review", "decision", "calendar"] as const;

function phaseIndex(phase: InteractiveFlowPhase): number {
  if (phase === "loading") return 0;
  if (phase === "scan") return 1;
  if (phase === "rank") return 2;
  if (phase === "highlight") return 3;
  if (phase === "decision" || phase === "decision_loading") return 4;
  return 5;
}

function CockpitShell({
  role,
  phase,
  left,
  center,
  right,
  timeline,
}: {
  role: SalesDemoRole;
  phase: InteractiveFlowPhase;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  timeline: ReactNode;
}) {
  return (
    <div
      className="demo-cockpit-shell"
      data-demo-cockpit-shell
      data-demo-flow-surface={role}
      data-demo-cockpit-phase={phase}
    >
      <div className="demo-cockpit-grid" data-demo-cockpit-grid>
        <aside className="demo-cockpit-panel demo-cockpit-panel--left" data-demo-cockpit-left>
          {left}
        </aside>
        <main className="demo-cockpit-panel demo-cockpit-panel--center" data-demo-cockpit-center>
          {center}
        </main>
        <aside className="demo-cockpit-panel demo-cockpit-panel--right" data-demo-cockpit-right>
          {right}
        </aside>
      </div>
      <footer className="demo-cockpit-timeline" data-demo-cockpit-timeline>
        {timeline}
      </footer>
    </div>
  );
}

function PanelLabel({ children }: { children: ReactNode }) {
  return <p className="demo-cockpit-panel__label">{children}</p>;
}

function SkeletonBar({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="demo-flow-skeleton h-3 rounded-md bg-[var(--demo-cockpit-border)]/40 animate-pulse"
      style={{ width }}
    />
  );
}

function TimelineTrack({
  steps,
  activeIdx,
  ariaLabel,
}: {
  steps: readonly string[];
  activeIdx: number;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <ol className="demo-cockpit-timeline__track" aria-label={ariaLabel}>
      {steps.map((key, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <li
            key={key}
            className={`demo-cockpit-timeline__step ${done ? "demo-cockpit-timeline__step--done" : ""} ${
              active ? "demo-cockpit-timeline__step--active" : ""
            }`}
            data-demo-timeline-step={key}
            data-demo-timeline-state={done ? "done" : active ? "active" : "pending"}
          >
            <span className="demo-cockpit-timeline__dot" aria-hidden />
            <span className="demo-cockpit-timeline__label">
              {t(`demoCockpit.timeline_${key}` as TranslationKey)}
            </span>
          </li>
        );
      })}
    </ol>
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
  const candidate = DEMO_FIXTURE_BUNDLE.candidate;
  const cv = DEMO_FIXTURE_BUNDLE.cvMeta;
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  const showLeft = phase !== "loading";
  const showScores = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showCenterProfile = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(
    phase,
  );
  const showSkills = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showRight = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const rightScore = phase === "rank" ? 78 : phase === "highlight" || showRight ? 94 : 61;
  const showDecision = phase === "decision";
  const showLoading = phase === "decision_loading";
  const showSuccess = ["success", "outcome"].includes(phase) && decisionChoice === "accept";
  const showDeclined = phase === "outcome" && decisionChoice === "decline";
  const activeIdx = phaseIndex(phase);

  const left = (
    <>
      <PanelLabel>{t("demoCockpit.candidateInbox")}</PanelLabel>
      {phase === "loading" ? (
        <div className="space-y-2" data-demo-ui="left_skeleton">
          <SkeletonBar width="90%" />
          <SkeletonBar width="70%" />
          <SkeletonBar width="80%" />
        </div>
      ) : (
        <ul className="demo-cockpit-inbox-list" data-demo-ui="left_jobs_visible">
          {jobs.map((job, i) => {
            const highlighted = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) && i === 0;
            const ranked = showScores;
            const order = highlighted && i > 0 ? i : i;
            return (
              <li
                key={job.id}
                className={`demo-cockpit-inbox-row ${highlighted ? "demo-cockpit-inbox-row--active" : ""}`}
                data-demo-flow-job={job.id}
                data-demo-ui={highlighted ? "left_reorder" : ranked ? "left_scores" : undefined}
                style={{ order }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="truncate text-[10px] opacity-70">
                    {job.company} · {job.location}
                  </p>
                </div>
                {ranked ? <DemoMatchGauge score={highlighted ? job.score : job.score - 6} size="sm" /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const center = (
    <>
      <PanelLabel>{t("demoCockpit.candidateProfile")}</PanelLabel>
      {phase === "loading" ? (
        <div className="space-y-2" data-demo-ui="center_skeleton">
          <SkeletonBar width="60%" />
          <SkeletonBar width="85%" />
          <SkeletonBar width="45%" />
        </div>
      ) : showCenterProfile ? (
        <div className="demo-cockpit-profile" data-demo-ui="center_profile_partial">
          <p className="demo-cockpit-profile__name">{candidate.displayName}</p>
          <p className="demo-cockpit-profile__title">{candidate.title}</p>
          {["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
            <p className="demo-cockpit-profile__role" data-demo-ui="center_role_title">
              {jobs[0]!.title} · {jobs[0]!.company}
            </p>
          ) : null}
          {showSkills ? (
            <div className="demo-cockpit-skills" data-demo-ui="center_skills">
              <p className="text-[10px] uppercase tracking-wider opacity-70">{t("demoCockpit.skills")}</p>
              <div className="flex flex-wrap gap-1">
                {DEMO_FIXTURE_BUNDLE.cvMeta &&
                  ["Python", "FastAPI", "React", "PostgreSQL"].map((s) => (
                    <span key={s} className="demo-cockpit-tag">
                      {s}
                    </span>
                  ))}
              </div>
              <dl className="demo-cockpit-meta-grid">
                <div>
                  <dt>{t("demoCockpit.salary")}</dt>
                  <dd>{cv.salaryPln} PLN</dd>
                </div>
                <div>
                  <dt>{t("demoCockpit.location")}</dt>
                  <dd>{cv.location}</dd>
                </div>
                <div>
                  <dt>{t("demoCockpit.availability")}</dt>
                  <dd>{t("demoCockpit.availabilityValue")}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          {showDecision ? (
            <div className="demo-cockpit-cta-row" data-demo-ui="center_cta">
              <button
                type="button"
                className={`demo-cockpit-cta demo-cockpit-cta--primary ${
                  decisionHover === "accept" ? "demo-cockpit-cta--hover" : ""
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
                className={`demo-cockpit-cta demo-cockpit-cta--secondary ${
                  decisionHover === "decline" ? "demo-cockpit-cta--hover" : ""
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
            <div className="demo-cockpit-loading" data-demo-flow-loading data-demo-ui="center_loading">
              <span className="demo-flow-spinner" />
              {t("demoInteractive.processing")}
            </div>
          ) : null}
          {showSuccess ? (
            <div className="demo-cockpit-calendar-hold" data-demo-flow-success data-demo-ui="center_calendar">
              <p className="demo-cockpit-calendar-hold__eyebrow">{t("demo.calendarHoldTitle")}</p>
              <p className="font-semibold">
                {slot.when} · {slot.duration}
              </p>
              <p className="text-sm opacity-80">{slot.title}</p>
            </div>
          ) : null}
          {showDeclined ? (
            <p className="text-sm opacity-80" data-demo-flow-declined data-demo-ui="center_outcome">
              {t("demoInteractive.declinedNote")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const right = (
    <>
      <PanelLabel>{t("demoCockpit.matchScore")}</PanelLabel>
      {showRight ? (
        <div data-demo-ui={phase === "rank" ? "right_score_61" : "right_score_94"}>
          <DemoMatchGauge
            score={rightScore}
            size="lg"
            label={t("demoCockpit.readiness")}
            hint={
              phase === "decision" || phase === "decision_loading"
                ? t("demoCockpit.awaitingDecision")
                : t("demoCockpit.nextStepInterview")
            }
          />
          {["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
            <ul className="demo-cockpit-breakdown" data-demo-ui="right_readiness">
              <li>{t("demoCockpit.breakdownSkills")}</li>
              <li>{t("demoCockpit.breakdownLocation")}</li>
              <li>{t("demoCockpit.breakdownSalary")}</li>
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-xs opacity-50">{t("demoCockpit.pendingScore")}</p>
      )}
    </>
  );

  return (
    <CockpitShell
      role="candidate"
      phase={phase}
      left={left}
      center={center}
      right={right}
      timeline={<TimelineTrack steps={CANDIDATE_TIMELINE} activeIdx={activeIdx} ariaLabel={t("demoCockpit.timelineAria")} />}
    />
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
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  const inboxCount = phase === "loading" ? 0 : phase === "scan" ? 3 : 1;
  const showCard = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showScore = ["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showTags = ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showDecision = phase === "decision";
  const showLoading = phase === "decision_loading";
  const showSuccess = ["success", "outcome"].includes(phase) && decisionChoice === "accept";
  const activeIdx = phaseIndex(phase);

  const queue = [
    { id: "q1", name: candidate.name, score: candidate.matchScore, active: true },
    { id: "q2", name: "Jordan M. (demo)", score: 82, active: false },
    { id: "q3", name: "Sam P. (demo)", score: 76, active: false },
  ];

  const left = (
    <>
      <PanelLabel>
        {t("demoCockpit.recruiterInbox")}
        {inboxCount > 0 ? (
          <span className="demo-cockpit-badge" data-demo-ui="left_inbox_count">
            {inboxCount}
          </span>
        ) : null}
      </PanelLabel>
      {phase === "loading" ? (
        <div className="space-y-2" data-demo-ui="left_skeleton">
          <SkeletonBar />
          <SkeletonBar width="80%" />
        </div>
      ) : (
        <ul className="demo-cockpit-inbox-list">
          {queue.map((item, i) => (
            <li
              key={item.id}
              className={`demo-cockpit-inbox-row ${item.active ? "demo-cockpit-inbox-row--active" : ""}`}
              data-demo-ui={i === 0 && phase === "rank" ? "left_queue_active" : phase === "highlight" ? "left_card_promote" : undefined}
            >
              <span className="truncate">{item.name}</span>
              {showScore ? <span className="demo-cockpit-score-pill">{item.score}%</span> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const center = (
    <>
      <PanelLabel>{t("demoCockpit.recruiterReview")}</PanelLabel>
      {phase === "loading" ? (
        <div className="space-y-2" data-demo-ui="center_skeleton">
          <SkeletonBar width="70%" />
          <SkeletonBar />
        </div>
      ) : showCard ? (
        <div className="demo-cockpit-review-card" data-demo-ui="center_card_partial">
          <p className="font-semibold">{candidate.name}</p>
          <p className="text-sm opacity-80">{candidate.title}</p>
          {["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
            <p className="mt-2 text-sm leading-snug opacity-90" data-demo-ui="center_rationale">
              {card.why_this_candidate}
            </p>
          ) : null}
          {showTags ? (
            <div className="mt-2 flex flex-wrap gap-1" data-demo-ui="center_tags">
              {card.requirements_matched.slice(0, 4).map((tag) => (
                <span key={tag} className="demo-cockpit-tag demo-cockpit-tag--accent">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {showDecision ? (
            <div className="demo-cockpit-cta-row mt-3" data-demo-ui="center_cta">
              <button
                type="button"
                className={`demo-cockpit-cta demo-cockpit-cta--primary ${decisionHover === "accept" ? "demo-cockpit-cta--hover" : ""}`}
                data-demo-flow-decision="accept"
                onMouseEnter={() => onDecisionHover("accept")}
                onMouseLeave={() => onDecisionHover(null)}
                onClick={() => onDecisionClick("accept")}
              >
                {t("interactiveDemoPlayer.stageAccept")}
              </button>
              <button
                type="button"
                className={`demo-cockpit-cta demo-cockpit-cta--secondary ${decisionHover === "decline" ? "demo-cockpit-cta--hover" : ""}`}
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
            <div className="demo-cockpit-loading mt-3" data-demo-flow-loading data-demo-ui="center_loading">
              <span className="demo-flow-spinner" />
              {t("demoInteractive.processing")}
            </div>
          ) : null}
          {showSuccess ? (
            <div className="demo-cockpit-calendar-hold mt-3" data-demo-flow-success data-demo-ui="center_slots">
              <p className="font-medium">{t("demoInteractive.recruiterSlotProposed")}</p>
              <p className="text-sm opacity-80">{slot.when}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const right = (
    <>
      <PanelLabel>{t("demoCockpit.suggestedAction")}</PanelLabel>
      {showScore ? (
        <div data-demo-ui={phase === "highlight" ? "right_action" : "right_score"}>
          <DemoMatchGauge score={candidate.matchScore} size="lg" label={t("demoCockpit.matchScore")} />
          <p className="mt-2 text-sm" data-demo-ui="right_suggested">
            {phase === "decision"
              ? t("demoCockpit.proposeSlots")
              : phase === "success"
                ? t("demoCockpit.slotsConfirmed")
                : t("demoCockpit.reviewRequirements")}
          </p>
        </div>
      ) : (
        <p className="text-xs opacity-50">{t("demoCockpit.pendingReview")}</p>
      )}
    </>
  );

  return (
    <CockpitShell
      role="recruiter"
      phase={phase}
      left={left}
      center={center}
      right={right}
      timeline={<TimelineTrack steps={RECRUITER_TIMELINE} activeIdx={activeIdx} ariaLabel={t("demoCockpit.timelineAria")} />}
    />
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
  const candidate = DEMO_FIXTURE_BUNDLE.inboxCandidate;
  const slot = DEMO_FIXTURE_BUNDLE.calendarSlot;
  const roles = ["Senior Fullstack", "Staff Backend", "Platform Lead"];
  const showPipeline = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showCenter = ["scan", "rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase);
  const showCalendar = ["success", "outcome"].includes(phase) && decisionChoice === "accept";
  const showDecision = phase === "decision";
  const showLoading = phase === "decision_loading";
  const activeIdx = phaseIndex(phase);

  const left = (
    <>
      <PanelLabel>{t("demoCockpit.companyPipeline")}</PanelLabel>
      {phase === "loading" ? (
        <div className="space-y-2" data-demo-ui="left_skeleton">
          <SkeletonBar />
          <SkeletonBar width="75%" />
        </div>
      ) : showPipeline ? (
        <ul className="demo-cockpit-inbox-list" data-demo-ui="left_pipeline">
          {roles.map((role, i) => (
            <li
              key={role}
              className={`demo-cockpit-inbox-row ${i === 0 && ["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? "demo-cockpit-inbox-row--active" : ""}`}
              data-demo-ui={phase === "rank" ? "left_shortlist" : phase === "highlight" ? "left_promote" : undefined}
            >
              <span>{role}</span>
              <span className="demo-cockpit-score-pill">{i === 0 ? "3" : "1–2"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const center = (
    <>
      <PanelLabel>{t("demoCockpit.companyCockpit")}</PanelLabel>
      {phase === "loading" ? (
        <div className="grid grid-cols-2 gap-2" data-demo-ui="center_skeleton">
          <SkeletonBar />
          <SkeletonBar />
        </div>
      ) : showCenter ? (
        <div data-demo-ui="center_stats">
          <dl className="demo-cockpit-stats-grid">
            <div>
              <dt>{t("interactiveDemoPlayer.companyRoles")}</dt>
              <dd>{company.talentMemoryRoles}</dd>
            </div>
            <div>
              <dt>{t("interactiveDemoPlayer.companyPipelines")}</dt>
              <dd>{company.activePipelines}</dd>
            </div>
          </dl>
          {["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
            <div className="demo-cockpit-review-card mt-2" data-demo-ui="center_candidate">
              <p className="font-semibold">{candidate.name}</p>
              <p className="text-sm opacity-80">{candidate.title}</p>
              {["highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
                <p className="mt-2 text-xs opacity-70" data-demo-ui="center_blocker">
                  {t("demoCockpit.teamAvailability")}
                </p>
              ) : null}
            </div>
          ) : null}
          {showDecision ? (
            <div className="demo-cockpit-cta-row mt-3" data-demo-ui="center_cta">
              <button
                type="button"
                className={`demo-cockpit-cta demo-cockpit-cta--primary ${decisionHover === "accept" ? "demo-cockpit-cta--hover" : ""}`}
                data-demo-flow-decision="accept"
                onMouseEnter={() => onDecisionHover("accept")}
                onMouseLeave={() => onDecisionHover(null)}
                onClick={() => onDecisionClick("accept")}
              >
                {t("demoInteractive.promote")}
              </button>
              <button
                type="button"
                className={`demo-cockpit-cta demo-cockpit-cta--secondary ${decisionHover === "decline" ? "demo-cockpit-cta--hover" : ""}`}
                data-demo-flow-decision="decline"
                onMouseEnter={() => onDecisionHover("decline")}
                onMouseLeave={() => onDecisionHover(null)}
                onClick={() => onDecisionClick("decline")}
              >
                {t("demoInteractive.hold")}
              </button>
            </div>
          ) : null}
          {showLoading ? (
            <div className="demo-cockpit-loading mt-3" data-demo-flow-loading data-demo-ui="center_loading">
              <span className="demo-flow-spinner" />
              {t("demoInteractive.processing")}
            </div>
          ) : null}
          {showCalendar ? (
            <div className="demo-cockpit-calendar-overlay mt-3" data-demo-flow-success data-demo-ui="center_calendar_overlay">
              <p className="demo-cockpit-panel__label">{t("demoCockpit.calendarOverlay")}</p>
              <div className="demo-cockpit-calendar-grid">
                {["Hiring mgr", "Recruiter", "Candidate"].map((who) => (
                  <div key={who} className="demo-cockpit-calendar-cell">
                    <p className="text-[10px] uppercase opacity-70">{who}</p>
                    <p className="font-medium">{slot.when}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-[var(--demo-cockpit-success)]">{t("demoCockpit.sharedSlot")}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const right = (
    <>
      <PanelLabel>{t("demoCockpit.decisionState")}</PanelLabel>
      {["rank", "highlight", "decision", "decision_loading", "success", "outcome"].includes(phase) ? (
        <div data-demo-ui={phase === "highlight" ? "right_decision" : "right_readiness"}>
          <DemoMatchGauge score={candidate.matchScore} size="md" label={t("demoCockpit.readiness")} />
          <p className="mt-2 text-sm" data-demo-ui="right_next_action">
            {phase === "decision"
              ? t("demoCockpit.promoteOrHold")
              : phase === "success"
                ? t("demoInteractive.companyNextStep")
                : t("demoCockpit.pipelineQuality")}
          </p>
        </div>
      ) : (
        <p className="text-xs opacity-50">{t("demoCockpit.pendingPipeline")}</p>
      )}
    </>
  );

  return (
    <CockpitShell
      role="company"
      phase={phase}
      left={left}
      center={center}
      right={right}
      timeline={<TimelineTrack steps={COMPANY_TIMELINE} activeIdx={activeIdx} ariaLabel={t("demoCockpit.timelineAria")} />}
    />
  );
}

export function InteractiveFlowSurface(props: InteractiveFlowSurfaceProps) {
  const { role, ...rest } = props;
  if (role === "candidate") return <CandidateSurface {...rest} />;
  if (role === "recruiter") return <RecruiterSurface {...rest} />;
  return <CompanySurface {...rest} />;
}
