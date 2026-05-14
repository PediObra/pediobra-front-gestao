import {
  getSafeAuthRedirect,
  isPublicAuthPath,
  isPublicContentPath,
  isSellerOnboardingPath,
  isTeamInvitationPath,
} from "./routes";

describe("auth route helpers", () => {
  it("treats team invitation links as public auth paths", () => {
    expect(isPublicAuthPath("/team-invitations/token")).toBe(true);
    expect(isTeamInvitationPath("/team-invitations/token")).toBe(true);
  });

  it("keeps onboarding and invitation route checks separate", () => {
    expect(isSellerOnboardingPath("/onboarding/seller")).toBe(true);
    expect(isSellerOnboardingPath("/team-invitations/token")).toBe(false);
  });

  it("treats blog pages as public content, not auth pages", () => {
    expect(isPublicContentPath("/blog")).toBe(true);
    expect(isPublicContentPath("/blog/guia-cimento")).toBe(true);
    expect(isPublicAuthPath("/blog")).toBe(false);
  });

  it("treats seller storefront pages as public content", () => {
    expect(isPublicContentPath("/lojas/deposito-indaiatuba")).toBe(true);
    expect(isPublicAuthPath("/lojas/deposito-indaiatuba")).toBe(false);
  });

  it("accepts only internal redirect paths", () => {
    expect(getSafeAuthRedirect("/team-invitations/token")).toBe(
      "/team-invitations/token",
    );
    expect(getSafeAuthRedirect("https://example.com")).toBeNull();
    expect(getSafeAuthRedirect("//example.com")).toBeNull();
    expect(getSafeAuthRedirect(null)).toBeNull();
  });
});
