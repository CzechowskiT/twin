/** Public demo account email (investor / founder walkthrough). */
export const DEMO_USER_EMAIL = (
  process.env.NEXT_PUBLIC_DEMO_USER_EMAIL?.trim().toLowerCase() || "demo@twin.career"
);

export function isDemoUserEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DEMO_USER_EMAIL;
}
