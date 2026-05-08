import { Suspense, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SellerDetailPage from "./page";
import { sellersService } from "@/lib/api/sellers";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { usersService } from "@/lib/api/users";
import type {
  Paginated,
  Seller,
  SellerDeliverySettings,
  SellerOperationalSettings,
  SellerProductImportJob,
  StripeConnectStatus,
  UserWithRelations,
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
const pushMock = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    getById: jest.fn(),
    update: jest.fn(),
    getStripeConnectStatus: jest.fn(),
    createStripeConnectOnboardingLink: jest.fn(),
    getDeliverySettings: jest.fn(),
    updateDeliverySettings: jest.fn(),
    getOperationalSettings: jest.fn(),
    updateOperationalSettings: jest.fn(),
    updateAvailability: jest.fn(),
  },
}));

jest.mock("@/lib/api/seller-product-imports", () => ({
  sellerProductImportsService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/users", () => ({
  usersService: {
    list: jest.fn(),
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
    jest
      .mocked(sellersService.getOperationalSettings)
      .mockResolvedValue(makeOperationalSettings());
    jest
      .mocked(sellersService.updateOperationalSettings)
      .mockResolvedValue(makeOperationalSettings({ autoOnlineEnabled: true }));
    jest
      .mocked(sellersService.updateAvailability)
      .mockResolvedValue(makeOperationalSettings({ isOnline: false }));
    jest
      .mocked(sellerProductImportsService.list)
      .mockResolvedValue(paginated([]));
    jest.mocked(usersService.list).mockResolvedValue(paginated([]));
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

    fireEvent.click(await screen.findByRole("tab", { name: "Dados Entrega" }));

    const radiusInput = await screen.findByLabelText(
      "Raio máximo de entrega (km)",
    );

    expect(radiusInput).not.toBeDisabled();
    await waitFor(() => {
      expect(radiusInput).toHaveValue("5");
    });

    fireEvent.change(radiusInput, { target: { value: "8.5" } });
    await waitFor(() => {
      expect(radiusInput).toHaveValue("8.5");
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar entrega/i }));

    await waitFor(() => {
      expect(sellersService.updateDeliverySettings).toHaveBeenCalledWith(3, {
        maxDeliveryRadiusMeters: 8500,
        deliveryProvider: "INTERNAL",
      });
    });
  });

  it("shows delivery settings and receiving as separate sections", async () => {
    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    expect(
      await screen.findByRole("tab", { name: "Dados Operacionais" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Raio máximo de entrega (km)"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Importar Produtos/i }),
    ).toHaveAttribute("href", "/seller-product-imports/new?sellerId=3");
    expect(
      screen.getByRole("tab", { name: "Dados Entrega" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Dados Importação" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Dados Equipe" }),
    ).not.toHaveAttribute("href");
    expect(
      screen.queryByRole("link", { name: /Gerenciar equipe/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Área de entrega" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Conta Stripe")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Dados Entrega" }));

    expect(screen.getByRole("tab", { name: "Dados Entrega" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      await screen.findByText("Configuração de entrega"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Raio máximo de entrega (km)"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Dados Bancários" }));

    expect(
      screen.getByRole("tab", { name: "Dados Bancários" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Conta Stripe")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Raio máximo de entrega (km)"),
    ).not.toBeInTheDocument();
  });

  it("lets seller editors change availability and save operating hours", async () => {
    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    expect(
      await screen.findByText("Disponibilidade operacional"),
    ).toBeInTheDocument();
    expect(screen.getByText("Status da loja")).toBeInTheDocument();

    const availabilitySwitch = screen.getByRole("switch", {
      name: "Alterar status online da loja",
    });

    await waitFor(() => expect(availabilitySwitch).not.toBeDisabled());
    fireEvent.click(availabilitySwitch);

    await waitFor(() =>
      expect(sellersService.updateAvailability).toHaveBeenCalledWith(3, {
        isOnline: false,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /salvar disponibilidade/i }),
    );

    await waitFor(() => {
      expect(sellersService.updateOperationalSettings).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          autoOnlineEnabled: false,
          operatingHours: expect.arrayContaining([
            expect.objectContaining({
              dayOfWeek: "MONDAY",
              opensAt: "07:00",
              closesAt: "18:00",
            }),
          ]),
        }),
      );
    });
  });

  it("shows paginated seller import data in the import section", async () => {
    jest.mocked(sellerProductImportsService.list).mockResolvedValue(
      paginated(
        [
          makeImportJob({
            id: 4,
            sourceOriginalFilename: "produtos-maio.csv",
            status: "APPLIED",
          }),
        ],
        { page: 1, limit: 10, total: 1, totalPages: 1 },
      ),
    );

    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    fireEvent.click(
      await screen.findByRole("tab", { name: "Dados Importação" }),
    );

    expect(await screen.findByText("produtos-maio.csv")).toBeInTheDocument();
    expect(screen.getByText("APPLIED")).toBeInTheDocument();
    expect(sellerProductImportsService.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      sellerId: 3,
    });
  });

  it("shows paginated seller team data inside the detail page", async () => {
    jest.mocked(usersService.list).mockResolvedValue(
      paginated(
        [
          makeTeamUser({
            id: 22,
            name: "Lucas Indaiatuba",
            email: "lucas@sellers.pediobra.local",
          }),
        ],
        { page: 1, limit: 10, total: 1, totalPages: 1 },
      ),
    );

    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    fireEvent.click(await screen.findByRole("tab", { name: "Dados Equipe" }));

    expect(await screen.findByText("Lucas Indaiatuba")).toBeInTheDocument();
    expect(
      screen.getByText("lucas@sellers.pediobra.local"),
    ).toBeInTheDocument();
    expect(screen.getByText("Vendas")).toBeInTheDocument();
    expect(usersService.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      sellerId: 3,
    });

    fireEvent.click(screen.getByText("Lucas Indaiatuba"));

    expect(pushMock).toHaveBeenCalledWith("/sellers/3/team/22");
  });

  it("does not show job title for owner team members", async () => {
    jest.mocked(usersService.list).mockResolvedValue(
      paginated([
        makeTeamUser({
          id: 23,
          name: "Proprietario Loja",
          sellers: [
            {
              sellerId: 3,
              jobTitle: "Dono",
              membershipRole: "OWNER",
              canEditSeller: true,
              canManageSellerProducts: true,
              canManageSellerStaff: true,
              seller: makeSeller(),
            },
          ],
        }),
      ]),
    );

    renderWithQueryClient(<SellerDetailPage params={resolvedParams()} />);

    fireEvent.click(await screen.findByRole("tab", { name: "Dados Equipe" }));

    expect(await screen.findByText("Proprietario Loja")).toBeInTheDocument();
    expect(screen.queryByText("Dono")).not.toBeInTheDocument();
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
    deliveryProvider: "INTERNAL",
    source: "SELLER_RULE",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeOperationalSettings(
  overrides: Partial<SellerOperationalSettings> = {},
): SellerOperationalSettings {
  return {
    sellerId: 3,
    isOnline: true,
    autoOnlineEnabled: false,
    operatingHours: [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ].map((dayOfWeek) => ({
      dayOfWeek:
        dayOfWeek as SellerOperationalSettings["operatingHours"][number]["dayOfWeek"],
      isClosed: dayOfWeek === "SUNDAY",
      opensAt: dayOfWeek === "SUNDAY" ? null : "07:00",
      closesAt: dayOfWeek === "SUNDAY" ? null : "18:00",
    })),
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

function makeImportJob(
  overrides: Partial<SellerProductImportJob> = {},
): SellerProductImportJob {
  return {
    id: 1,
    sellerId: 3,
    createdByUserId: 1,
    status: "UPLOADED",
    mode: "CSV",
    sourceOriginalFilename: "produtos.csv",
    createdAt: "2026-05-07T12:00:00.000Z",
    seller: { id: 3, name: "Deposito Indaiatuba Local" },
    ...overrides,
  };
}

function makeTeamUser(
  overrides: Partial<UserWithRelations> = {},
): UserWithRelations {
  return {
    id: 10,
    name: "Colaborador",
    email: "colaborador@sellers.pediobra.local",
    createdAt: "2026-05-07T12:00:00.000Z",
    roles: [{ id: 2, name: "SELLER" }],
    sellers: [
      {
        sellerId: 3,
        jobTitle: "Vendas",
        membershipRole: "EMPLOYEE",
        canEditSeller: false,
        canManageSellerProducts: true,
        canManageSellerStaff: false,
        seller: makeSeller(),
      },
    ],
    ...overrides,
  };
}

function paginated<T>(
  data: T[],
  meta = { page: 1, limit: 10, total: data.length, totalPages: 1 },
): Paginated<T> {
  return { data, meta };
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
