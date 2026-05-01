import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import ProfilePage from "./page";
import { usersService } from "@/lib/api/users";
import type { AuthUser } from "@/lib/api/types";

const mockSetUser = jest.fn();
let mockUser: AuthUser = {
  id: 1,
  name: "Lucas Indaiatuba",
  email: "lucas.indaiatuba@pediobra.local",
  roles: ["SELLER"],
  sellers: [],
  driverProfiles: [],
};

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (
    selector: (state: { setUser: typeof mockSetUser }) => unknown,
  ) => selector({ setUser: mockSetUser }),
}));

jest.mock("@/lib/api/users", () => ({
  usersService: {
    update: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    mockUser = {
      id: 1,
      name: "Lucas Indaiatuba",
      email: "lucas.indaiatuba@pediobra.local",
      roles: ["SELLER"],
      sellers: [],
      driverProfiles: [],
    };
    mockSetUser.mockClear();
    jest.mocked(usersService.update).mockResolvedValue({
      id: 1,
      name: "Lucas Atualizado",
      email: "lucas.indaiatuba@pediobra.local",
      roles: [],
      sellers: [],
      createdAt: "2026-05-01T00:00:00.000Z",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps email visible but locked on profile", () => {
    renderWithQueryClient(<ProfilePage />);

    const emailInput = screen.getByLabelText("Email");

    expect(emailInput).toHaveValue("lucas.indaiatuba@pediobra.local");
    expect(emailInput).toBeDisabled();
    expect(
      screen.getByText(/não pode ser alterado pelo perfil/i),
    ).toBeInTheDocument();
  });

  it("updates only the editable profile fields", async () => {
    renderWithQueryClient(<ProfilePage />);

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Lucas Atualizado" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Salvar alterações/i }),
    );

    await waitFor(() => {
      expect(usersService.update).toHaveBeenCalledWith(1, {
        name: "Lucas Atualizado",
      });
    });
  });
});

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
