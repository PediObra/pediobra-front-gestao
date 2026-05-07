import { render, screen } from "@testing-library/react";
import AppLayout from "./layout";

const mockUseAuth = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/realtime/use-operations-realtime", () => ({
  useOperationsRealtime: jest.fn(),
}));

describe("AppLayout", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      needsSellerOnboarding: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("blocks the regular app shell for sellers without a store", () => {
    render(
      <AppLayout>
        <div>Conteudo protegido</div>
      </AppLayout>,
    );

    expect(screen.getByText("Cadastre sua empresa")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ir para cadastro da loja/i }),
    ).toHaveAttribute("href", "/onboarding/seller");
    expect(screen.queryByText("Conteudo protegido")).not.toBeInTheDocument();
  });
});
