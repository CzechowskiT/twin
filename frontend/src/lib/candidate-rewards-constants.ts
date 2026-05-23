/**
 * Marketing amounts aligned with backend defaults (`app.config` referral_*_cents)
 * and investor placement model (50% employer fee → 50% to candidate = 25% monthly salary).
 */
export const PLACEMENT_CANDIDATE_BONUS_PCT_OF_MONTHLY_SALARY = 25;

/** Employer success fee as % of monthly salary (investor model default). */
export const PLACEMENT_EMPLOYER_FEE_PCT_OF_MONTHLY_SALARY = 50;

export const REFERRAL_BONUS_FIRST_PAYMENT_USD = 15;
export const REFERRAL_BONUS_RETAINED_3M_USD = 25;
export const REFERRAL_BONUS_HIRED_USD = 100;

/** Demo-only calendar milestone (not wired to payouts yet). */
export const INTERVIEW_BOOKED_BONUS_USD = 20;
export const INTERVIEW_BOOKED_BONUS_MAX_PER_QUARTER = 4;

/** Founding wishlist cap — locked pricing / free Premium window (investor model). */
export const FOUNDING_COHORT_SIZE = 1000;

/** Illustrative free Premium months per founding member in year-one P&L. */
export const FOUNDING_FREE_PREMIUM_MONTHS_DEFAULT = 12;

/** Placement cash payout delay (marketing / Terms). */
export const PLACEMENT_PAYOUT_DELAY_DAYS_DEFAULT = 30;
