const PUBLIC_PATHS = ["/login", "/register", "/team-invitations"] as const;
const PUBLIC_CONTENT_PATHS = ["/blog", "/lojas"] as const;
export const SELLER_ONBOARDING_PATH = "/onboarding/seller";
export const TEAM_INVITATIONS_PATH = "/team-invitations";

function isPathWithin(pathname: string | null | undefined, basePath: string) {
  return pathname === basePath || pathname?.startsWith(`${basePath}/`) === true;
}

export function isPublicAuthPath(pathname: string | null | undefined) {
  return PUBLIC_PATHS.some((path) => isPathWithin(pathname, path));
}

export function isPublicContentPath(pathname: string | null | undefined) {
  return PUBLIC_CONTENT_PATHS.some((path) => isPathWithin(pathname, path));
}

export function isSellerOnboardingPath(pathname: string | null | undefined) {
  return isPathWithin(pathname, SELLER_ONBOARDING_PATH);
}

export function isTeamInvitationPath(pathname: string | null | undefined) {
  return isPathWithin(pathname, TEAM_INVITATIONS_PATH);
}

export function getSafeAuthRedirect(pathname: string | null | undefined) {
  if (!pathname) return null;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;

  return pathname;
}
