import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import DashboardPage from "./page";
import { ordersService } from "@/lib/api/orders";
import { deliveryRequestsService } from "@/lib/api/delivery-requests";
import { operationsService } from "@/lib/api/operations";
import { sellersService } from "@/lib/api/sellers";
import type {
  AuthUser,
  OperationOverview,
  Order,
  Paginated,
  Seller,
} from "@/lib/api/types";

const sellers = [
  {
    id: 20,
    name: "Loja Centro",
    email: "centro@pediobra.local",
    address: "Rua A",
    cep: "00000000",
    phone: "11999999999",
  },
  {
    id: 21,
    name: "Loja Norte",
    email: "norte@pediobra.local",
    address: "Rua B",
    cep: "00000000",
    phone: "11999999999",
  },
] satisfies Seller[];

let mockAuth = buildAuth();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/orders", () => ({
  ordersService: {
    stats: jest.fn(),
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/delivery-requests", () => ({
  deliveryRequestsService: {
    stats: jest.fn(),
  },
}));

jest.mock("@/lib/api/operations", () => ({
  operationsService: {
    overview: jest.fn(),
    runDispatchCycle: jest.fn(),
    expireOffer: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const pendingOrder = {
  id: 11,
  sellerId: 20,
  status: "PENDING",
  paymentStatus: "AUTHORIZED",
  createdAt: "2026-05-01T12:00:00.000Z",
  totalAmountCents: 10_000,
  seller: sellers[0],
} as Order;

const overview = {
  summary: {
    activeOrders: 3,
    activeDeliveryRequests: 2,
    openJobs: 1,
    activeOffers: 1,
    onlineDrivers: 4,
  },
  issues: [
    {
      type: "ORDER_PAYMENT_PENDING",
      title: "Pedido com pagamento pendente",
      severity: "warning",
      orderId: 11,
      createdAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  jobs: [
    {
      id: 7,
      status: "OPEN",
      orderId: 11,
      createdAt: "2026-05-01T12:00:00.000Z",
      updatedAt: "2026-05-01T12:05:00.000Z",
      orderStatus: "READY_FOR_PICKUP",
      orderPaymentStatus: "PAID",
    },
  ],
  offers: [
    {
      id: 9,
      deliveryJobId: 7,
      driverProfileId: 30,
      driverName: "Ana Driver",
      status: "OFFERED",
      offeredAt: "2026-05-01T12:01:00.000Z",
      expiresAt: "2026-05-01T12:03:00.000Z",
      distanceMeters: 1200,
      orderId: 11,
    },
  ],
} satisfies OperationOverview;

describe("DashboardPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockAuth = buildAuth();

    jest.mocked(ordersService.stats).mockResolvedValue({
      total: 12,
      active: 3,
      delivered: 7,
      cancelled: 2,
      revenueCents: 28_560,
      statusCounts: {},
    });
    jest.mocked(ordersService.list).mockResolvedValue(
      paginated<Order>([pendingOrder], { total: 2 }),
    );
    jest.mocked(deliveryRequestsService.stats).mockResolvedValue({
      total: 6,
      active: 2,
      delivered: 3,
      cancelled: 1,
      feeCents: 5_240,
      statusCounts: {},
    });
    jest.mocked(operationsService.overview).mockResolvedValue(overview);
    jest
      .mocked(operationsService.runDispatchCycle)
      .mockResolvedValue({ created: 1, expired: 0 });
    jest.mocked(operationsService.expireOffer).mockResolvedValue({
      ...overview.offers[0],
      status: "EXPIRED",
    });
    jest
      .mocked(sellersService.list)
      .mockResolvedValue(paginated<Seller>(sellers));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the unified operation dashboard without the products card", async () => {
    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText("Operação")).toBeInTheDocument();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByText("Entregas avulsas")).toBeInTheDocument();
    expect(screen.getByText("Total dos pedidos")).toBeInTheDocument();
    expect(screen.getByText("Total das entregas")).toBeInTheDocument();
    expect(screen.queryByText("Produtos cadastrados")).toBeNull();

    expect(screen.getByText("Fila Atenção")).toBeInTheDocument();
    expect(screen.getByText("Jobs e ofertas")).toBeInTheDocument();
    expect(screen.getByText("Despachos ativos")).toBeInTheDocument();
    expect(
      await screen.findByText("Pedido com pagamento pendente"),
    ).toBeInTheDocument();
    expect(screen.getByText("Oferta #9")).toBeInTheDocument();
    expect(screen.getByText("Job #7")).toBeInTheDocument();
  });

  it("starts multi-company sellers in all-companies mode without seller filters", async () => {
    renderWithQueryClient(<DashboardPage />);

    await screen.findByText("Pedidos aguardando aceite");

    const orderStatsParams = lastCallArg(jest.mocked(ordersService.stats));
    const deliveryStatsParams = lastCallArg(
      jest.mocked(deliveryRequestsService.stats),
    );
    const pendingOrdersParams = lastCallArg(jest.mocked(ordersService.list));
    const overviewParams = lastCallArg(jest.mocked(operationsService.overview));

    expect(orderStatsParams).toEqual(
      expect.objectContaining({
        createdFrom: expect.any(String),
        createdTo: expect.any(String),
      }),
    );
    expect(orderStatsParams).not.toHaveProperty("sellerId");
    expect(deliveryStatsParams).not.toHaveProperty("requesterSellerId");
    expect(pendingOrdersParams).toEqual({
      page: 1,
      limit: 1,
      status: "PENDING",
    });
    expect(overviewParams).toEqual({});
  });

  it("keeps the pending-order alert global when a company is selected", async () => {
    renderWithQueryClient(<DashboardPage />);

    await screen.findByText("Pedidos aguardando aceite");

    const sellerSelect = screen.getByRole("combobox", { name: /Empresas/i });
    sellerSelect.focus();
    fireEvent.keyDown(sellerSelect, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Loja Norte" }));

    await waitFor(() => {
      expect(lastCallArg(jest.mocked(ordersService.stats))).toEqual(
        expect.objectContaining({ sellerId: 21 }),
      );
      expect(lastCallArg(jest.mocked(deliveryRequestsService.stats))).toEqual(
        expect.objectContaining({ requesterSellerId: 21 }),
      );
      expect(lastCallArg(jest.mocked(operationsService.overview))).toEqual({
        sellerId: 21,
      });
      expect(lastCallArg(jest.mocked(ordersService.list))).toEqual({
        page: 1,
        limit: 1,
        status: "PENDING",
      });
    });
    expect(screen.getByText(/Loja Centro/)).toBeInTheDocument();
  });

  it("shows the first pending order seller when all companies are selected", async () => {
    const { container } = renderWithQueryClient(<DashboardPage />);

    expect(
      await screen.findByText("Pedidos aguardando aceite"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Loja Centro/)).toBeInTheDocument();
    expect(screen.getByText("2 pendente(s)")).toBeInTheDocument();
    expect(container.querySelector('a[href="/orders/11"]')).toBeTruthy();
  });

  it("runs the dispatch-cycle action from the operational section", async () => {
    mockAuth = { ...buildAuth(), isAdmin: true };

    renderWithQueryClient(<DashboardPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Reprocessar despacho/ }),
    );

    await waitFor(() => {
      expect(operationsService.runDispatchCycle).toHaveBeenCalledTimes(1);
    });
  });

  it("hides the pending-order alert when there are no pending orders", async () => {
    jest
      .mocked(ordersService.list)
      .mockResolvedValueOnce(paginated<Order>([], { total: 0 }));

    renderWithQueryClient(<DashboardPage />);

    await waitFor(() => {
      expect(ordersService.list).toHaveBeenCalled();
    });
    expect(screen.queryByText("Pedidos aguardando aceite")).toBeNull();
  });
});

function buildAuth() {
  const user = {
    id: 1,
    name: "Lucas Indaiatuba",
    email: "lucas@pediobra.local",
    roles: ["SELLER"],
    sellers: sellers.map((seller) => ({
      sellerId: seller.id,
      membershipRole: "OWNER",
      canEditSeller: true,
      canManageSellerProducts: true,
      canManageSellerStaff: true,
      jobTitle: null,
      seller,
    })),
    driverProfiles: [],
  } satisfies AuthUser;

  return {
    user,
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    hasRole: jest.fn(),
    isAdmin: false,
    isSeller: true,
    isDriver: false,
    sellerIds: sellers.map((seller) => seller.id),
    canAccessSeller: jest.fn(),
    canEditSeller: jest.fn(),
    canManageSellerProducts: jest.fn(),
    canManageSellerStaff: jest.fn(),
    membershipFor: jest.fn(),
  };
}

function lastCallArg(mock: {
  mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> };
}) {
  const calls = mock.mock.calls;
  return calls[calls.length - 1]?.[0];
}

function paginated<T>(
  data: T[],
  meta: Partial<Paginated<T>["meta"]> = {},
): Paginated<T> {
  return {
    data,
    meta: {
      page: 1,
      limit: 10,
      total: data.length,
      totalPages: 1,
      ...meta,
    },
  };
}

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
