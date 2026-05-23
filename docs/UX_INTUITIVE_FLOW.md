# Intuitive flow — 10 rules (5yo & 70yo)

Product surfaces should read in one direction, with one obvious next step. These rules apply to candidate workspace pages (dashboard, profile, calendar, auto-apply, job feed, modals).

## 1. One scroll story

On large screens: sticky left rail (stats / tips), single scroll region on the right. Main copy uses a readable max width (~42rem), not full viewport width.

## 2. One primary CTA per view

Each screen has exactly one filled primary action. Secondary actions use `twin-btn-secondary` or `twin-link`; tertiary uses ghost/text. Never two competing filled buttons above the fold.

## 3. Fixed step order

**Dashboard → Profile → Matches → Applications.** Show `WorkspaceFlowSteps` where the path is non-obvious. Do not hide core actions behind icons-only menus.

## 4. Touch targets

Interactive controls: minimum 44×44px (`twin-touch-target`). Links in subnavs and headers follow the same minimum height.

## 5. Empty states

One short sentence (what to do next) + one button. No multi-paragraph empty panels. Use `EmptyState`.

## 6. Errors & toasts

Plain language in PL/EN via `t()` keys. **Never** show `Request ID` in UI — log it in the console only (`formatApiErrorMessageWithResponseId`).

## 7. Keyboard focus

All focusable controls show a visible focus ring (`:focus-visible` in `globals.css`). Do not remove outlines without a replacement.

## 8. Low cognitive load

Group related fields in one card/section. Heading hierarchy: eyebrow (label) → `h1` → body. Avoid duplicate stat blocks (rail vs main).

## 9. No gamification clutter

No XP badges, streaks, or leaderboard chrome on core workflow pages unless they directly explain the next action.

## 10. Visual parity with marketing

App shell uses the same token set as marketing (`MARKETING_SURFACE=studio`: dark canvas, mint accent, high contrast). Cards and borders match marketing panels — not a separate “admin grey” theme.

---

**Components:** `Shell` (`rail`), `PageMomentumRail`, `WorkspaceFlowSteps`, `ProfileCompletenessHint`, `EmptyState`.

**When adding a page:** pick the flow step, one primary CTA, rail stats if it is a workspace home, and an empty state before shipping.
