import { Suspense, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SellerDetailPage from "./page";
import { sellersService } from "@/lib/api/sellers";
import type {
  Seller,
  SellerDeliverySettings,
  StripeConnectStatus,
} from "@/lib/api/types";

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");

  return {
    ...actual,
    use: () => ({ id: "3" }),
  };
});

const mockAuth = {
  isAuthenticated: true,
  isLoading: false,
  isAdmin: false,
  canEditSeller: jest.fn(() => true),
  canManageSellerStaff: jest.fn(() => false),
};

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    getById: jest.fn(),
    update: jest.fn(),
    getStripeConnectStatus: jest.fn(),
    createStripeConnectOnboardingLink: jest.fn(),
    getDeliverySettings: jest.fn(),
    updateDeliverySettings: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SellerDetailPage", () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
    mockAuth.isAdmin = false;
    mockAuth.canEditSeller.mockReturnValue(true);
    mockAuth.canManageSellerStaff.mockReturnValue(false);
    jest.mocked(sellersService.getById).mockResolvedValue(makeSeller());
    jest.mocked(sellersService.update).mockResolvedValue(makeSeller());
    jest
      .mocked(sellersService.getStripeConnectStatus)
      .mockResolvedValue(makeStripeConnectStatus());
    jest
      .mocked(sellersService.getDeliverySettings)
      .mockResolvedValue(makeDeliverySettings());
    jest
      .mocked(sellersService.updateDeliverySettings)
      .mockResolvedValue(
        makeDeliverySettings({ maxDeliveryRadiusMeters: 8500 }),
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps master data locked for seller users and does not send it on update", async () => {
    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    expect(await screen.findByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Endereço")).toBeDisabled();
    expect(screen.getByLabelText("CEP")).toBeDisabled();
    expect(screen.getByLabelText("Nome")).not.toBeDisabled();
    expect(screen.getByLabelText("Telefone")).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Deposito Indaiatuba Atualizado" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11911112222" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(sellersService.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          name: "Deposito Indaiatuba Atualizado",
          phone: "11911112222",
        }),
      );
    });

    const payload = jest.mocked(sellersService.update).mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("address");
    expect(payload).not.toHaveProperty("cep");
    expect(payload).not.toHaveProperty("placeId");
  });

  it("allows admin users to edit master data", async () => {
    mockAuth.isAdmin = true;

    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    expect(await screen.findByLabelText("Email")).not.toBeDisabled();
    expect(screen.getByLabelText("Endereço")).not.toBeDisabled();
    expect(screen.getByLabelText("CEP")).not.toBeDisabled();
  });

  it("lets seller editors update the delivery radius without master data access", async () => {
    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    const radiusInput = await screen.findByLabelText(
      "Raio máximo de entrega (km)",
    );

    expect(radiusInput).not.toBeDisabled();
    await waitFor(() => {
      expect(radiusInput).toHaveValue(5);
    });

    fireEvent.change(radiusInput, { target: { value: "8.5" } });
    await waitFor(() => {
      expect(radiusInput).toHaveValue(8.5);
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar raio/i }));

    await waitFor(() => {
      expect(sellersService.updateDeliverySettings).toHaveBeenCalledWith(3, {
        maxDeliveryRadiusMeters: 8500,
      });
    });
  });
});

function makeSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    id: 3,
    name: "Deposito Indaiatuba Local",
    email: "indaiatuba@sellers.pediobra.local",
    address: "Estrada Doutor Rafael Elias Jose Aun, 300",
    cep: "13348000",
    phone: "19940000003",
    logo: null,
    ...overrides,
  };
}

function makeDeliverySettings(
  overrides: Partial<SellerDeliverySettings> = {},
): SellerDeliverySettings {
  return {
    sellerId: 3,
    ruleId: 1,
    maxDeliveryRadiusMeters: 5000,
    source: "SELLER_RULE",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStripeConnectStatus(
  overrides: Partial<StripeConnectStatus> = {},
): StripeConnectStatus {
  return {
    connectEnabled: true,
    ownerType: "SELLER",
    ownerId: 3,
    stripeAccountId: "acct_123",
    stripeAccountType: "express",
    stripeOnboardingStatus: "READY",
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
    stripeDetailsSubmitted: true,
    stripeRequirementsCurrentlyDue: [],
    stripeRequirementsEventuallyDue: [],
    stripeDisabledReason: null,
    stripeAccountUpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function resolvedParams() {
  return Promise.resolve({ id: "3" });
}

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>loading</div>}>{ui}</Suspense>
    </QueryClientProvider>,
  );
}
