import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterPage from "./page";
import { authService } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

const mockReplace = jest.fn();
const mockSetSession = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (
    selector: (state: { setSession: typeof mockSetSession }) => unknown,
  ) => selector({ setSession: mockSetSession }),
}));

jest.mock("@/lib/api/auth", () => ({
  authService: {
    createEmailVerification: jest.fn(),
    confirmEmailVerification: jest.fn(),
    registerSeller: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSetSession.mockClear();
    jest.mocked(authService.createEmailVerification).mockResolvedValue({
      email: "lucas@example.com",
      purpose: "SELLER_REGISTER",
      expiresAt: "2026-05-07T12:10:00.000Z",
      devCode: "123456",
    });
    jest.mocked(authService.confirmEmailVerification).mockResolvedValue({
      emailVerificationToken: "email-token",
      expiresAt: "2026-05-07T12:10:00.000Z",
    });
    jest.mocked(authService.registerSeller).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      user: {
        id: 10,
        name: "Lucas",
        email: "lucas@example.com",
        roles: ["SELLER"],
        sellers: [],
        driverProfiles: [],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers a seller, stores the session, and navigates to onboarding", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lucas@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar codigo/i }));

    expect(await screen.findByText("Codigo local: 123456")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Codigo"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar email/i }));

    expect(await screen.findByLabelText("Nome")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Lucas" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar conta/i }));

    await waitFor(() => {
      expect(authService.registerSeller).toHaveBeenCalledWith({
        name: "Lucas",
        email: "lucas@example.com",
        password: "secret123",
        emailVerificationToken: "email-token",
      });
    });
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "access" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/onboarding/seller");
  });

  it("shows email conflict errors in the email field", async () => {
    jest.mocked(authService.createEmailVerification).mockRejectedValueOnce(
      new ApiError(409, "Email já cadastrado.", {
        statusCode: 409,
        message: "Email já cadastrado.",
        error: "Conflict",
      }),
    );

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lucas@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar codigo/i }));

    expect(await screen.findByText("Email já cadastrado.")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Email já cadastrado.");
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
