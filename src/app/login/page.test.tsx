import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockReplace = jest.fn();
const mockLogin = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockLogin.mockResolvedValue({
      id: 10,
      name: "Lucas",
      email: "lucas@example.com",
      roles: ["SELLER"],
      sellers: [],
      driverProfiles: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sends sellers without stores to onboarding after login", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lucas@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "lucas@example.com",
        password: "secret123",
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("/onboarding/seller");
  });
});
