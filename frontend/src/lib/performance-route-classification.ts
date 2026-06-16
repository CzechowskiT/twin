/** Classify routes for P0 browser-memory chrome and bundle policy. */

export function isWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/company") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/onboarding")
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/register");
}

/** Workspace + auth lanes use ultra-light brand strip and reduced GPU chrome. */
export function isPerformanceLightChromePath(pathname: string): boolean {
  return isWorkspacePath(pathname) || isAuthPath(pathname);
}

export function isInvestorWorkspacePath(pathname: string): boolean {
  return pathname.startsWith("/investor/") && pathname !== "/investor";
}
