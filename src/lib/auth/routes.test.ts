import {
  getSafeAuthRedirect,
  isPublicAuthPath,
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

  it("accepts only internal redirect paths", () => {
    expect(getSafeAuthRedirect("/team-invitations/token")).toBe(
      "/team-invitations/token",
    );
    expect(getSafeAuthRedirect("https://example.com")).toBeNull();
    expect(getSafeAuthRedirect("//example.com")).toBeNull();
    expect(getSafeAuthRedirect(null)).toBeNull();
  });
});
