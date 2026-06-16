/**
 * Preserve deep-link destination through auth redirects (`?next=`).
 */

export function buildAuthRedirectNext(
  pathname: string,
  searchParams: { toString(): string } | null | undefined,
): string {
  const path = pathname?.startsWith("/") ? pathname : "/";
  const qs = searchParams?.toString();
  return qs ? `${path}?${qs}` : path;
}

export function loginPathWithNext(loginPath: string, destination: string): string {
  const dest = destination.trim();
  if (!dest.startsWith("/") || dest.startsWith("//")) return loginPath;
  if (dest === loginPath || dest.startsWith(`${loginPath}?`)) return loginPath;
  return `${loginPath}?next=${encodeURIComponent(dest)}`;
}

function isAuthLoginPath(pathname: string, loginPath: string): boolean {
  return (
    pathname === loginPath ||
    pathname.startsWith(`${loginPath}/`) ||
    pathname.startsWith(`${loginPath}?`) ||
    pathname.startsWith("/login")
  );
}

/**
 * Lock the first workspace pathname before client redirect replaces the URL with `/login/*`.
 */
export function lockAuthRedirectDestination(
  locked: { current: string | null },
  pathname: string,
  loginPath: string,
  searchParams?: { toString(): string } | null,
): string {
  if (locked.current === null && !isAuthLoginPath(pathname, loginPath)) {
    locked.current = buildAuthRedirectNext(pathname, searchParams ?? null);
  }
  return locked.current ?? buildAuthRedirectNext(pathname, searchParams ?? null);
}
