import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import SellerOnboardingPage from "./page";
import { authService } from "@/lib/api/auth";
import { sellerOnboardingService } from "@/lib/api/seller-onboarding";

const mockReplace = jest.fn();
const mockSetSession = jest.fn();
const mockSetUser = jest.fn();
const mockClear = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/lib/auth/store", () => {
  const useAuthStore = Object.assign(
    (
      selector: (state: {
        refreshToken: string;
        setSession: typeof mockSetSession;
        clear: typeof mockClear;
      }) => unknown,
    ) =>
      selector({
        refreshToken: "refresh-token",
        setSession: mockSetSession,
        clear: mockClear,
      }),
    {
      getState: () => ({ setUser: mockSetUser }),
    },
  );

  return { useAuthStore };
});

jest.mock("@/components/forms/address-autocomplete", () => ({
  AddressAutocomplete: ({
    id,
    value,
    onChange,
    onSelect,
  }: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onSelect: (place: {
      placeId: string;
      description: string;
      mainText: string;
    }) => void;
  }) => (
    <div>
      <input
        id={id}
        aria-label="Endereco"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onSelect({
            placeId: "place-1",
            description: "Rua A, 10",
            mainText: "Rua A",
          })
        }
      >
        Selecionar endereco
      </button>
    </div>
  ),
}));

jest.mock("@/components/forms/image-file-preview", () => ({
  ImageFilePreview: () => <div data-testid="image-preview" />,
}));

jest.mock("@/lib/api/seller-onboarding", () => ({
  sellerOnboardingService: {
    createSeller: jest.fn(),
  },
}));

jest.mock("@/lib/api/auth", () => ({
  authService: {
    refresh: jest.fn(),
    me: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SellerOnboardingPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSetSession.mockClear();
    mockSetUser.mockClear();
    mockClear.mockClear();
    jest.mocked(sellerOnboardingService.createSeller).mockResolvedValue({
      id: 20,
      name: "Loja Centro",
      email: "centro@example.com",
      address: "Rua A",
      cep: "01001000",
      phone: "11999999999",
    });
    jest.mocked(authService.refresh).mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      user: {
        id: 10,
        name: "Lucas",
        email: "lucas@example.com",
        roles: ["SELLER"],
        sellers: [
          {
            sellerId: 20,
            jobTitle: "Owner",
            membershipRole: "OWNER",
            canEditSeller: true,
            canManageSellerProducts: true,
            canManageSellerStaff: true,
            seller: {
              id: 20,
              name: "Loja Centro",
              email: "centro@example.com",
              address: "Rua A",
              cep: "01001000",
              phone: "11999999999",
            },
          },
        ],
        driverProfiles: [],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates a seller, refreshes the session, and navigates to the seller page", async () => {
    renderWithQueryClient(<SellerOnboardingPage />);

    fireEvent.change(screen.getByLabelText("Nome da loja"), {
      target: { value: "Loja Centro" },
    });
    fireEvent.change(screen.getByLabelText("Email de contato"), {
      target: { value: "centro@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "(11) 99999-9999" },
    });
    fireEvent.change(screen.getByLabelText("Endereco"), {
      target: { value: "Rua A" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Selecionar endereco/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Cadastrar empresa/i }),
    );

    await waitFor(() => {
      expect(sellerOnboardingService.createSeller).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Loja Centro",
          email: "centro@example.com",
          phone: "11999999999",
          address: "Rua A, 10",
          placeId: "place-1",
        }),
      );
    });
    expect(authService.refresh).toHaveBeenCalledWith("refresh-token");
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "new-access" }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/sellers/20");
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
