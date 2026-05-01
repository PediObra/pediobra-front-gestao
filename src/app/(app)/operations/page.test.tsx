import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import OperationsPage from "./page";
import { operationsService } from "@/lib/api/operations";
import { sellersService } from "@/lib/api/sellers";

let mockIsAdmin = true;
let mockUser = {
  id: 1,
  name: "Lucas",
  email: "lucas@pediobra.local",
  roles: ["SELLER"],
  sellers: [
    {
      sellerId: 20,
      membershipRole: "OWNER",
      canEditSeller: true,
      canManageSellerProducts: true,
      canManageSellerStaff: true,
      jobTitle: null,
      seller: {
        id: 20,
        name: "Loja Centro",
        email: "centro@pediobra.local",
        address: "Rua A",
        cep: "00000000",
        phone: "11999999999",
      },
    },
    {
      sellerId: 21,
      membershipRole: "OWNER",
      canEditSeller: true,
      canManageSellerProducts: true,
      canManageSellerStaff: true,
      jobTitle: null,
      seller: {
        id: 21,
        name: "Loja Norte",
        email: "norte@pediobra.local",
        address: "Rua B",
        cep: "00000000",
        phone: "11999999999",
      },
    },
  ],
  driverProfiles: [],
};

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ isAdmin: mockIsAdmin, user: mockUser }),
}));

jest.mock("@/lib/api/operations", () => ({
  operationsService: {
    overview: jest.fn(),
    runDispatchCycle: jest.fn(),
    expireOffer: jest.fn(),
  },
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    list: jest.fn(),
  },
}));

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
      orderId: 10,
      createdAt: "2026-05-01T12:00:00.000Z",
    },
  ],
  jobs: [
    {
      id: 7,
      status: "OPEN",
      orderId: 10,
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
      orderId: 10,
    },
  ],
};

describe("OperationsPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockIsAdmin = true;
    mockUser = {
      id: 1,
      name: "Lucas",
      email: "lucas@pediobra.local",
      roles: ["SELLER"],
      sellers: [
        {
          sellerId: 20,
          membershipRole: "OWNER",
          canEditSeller: true,
          canManageSellerProducts: true,
          canManageSellerStaff: true,
          jobTitle: null,
          seller: {
            id: 20,
            name: "Loja Centro",
            email: "centro@pediobra.local",
            address: "Rua A",
            cep: "00000000",
            phone: "11999999999",
          },
        },
        {
          sellerId: 21,
          membershipRole: "OWNER",
          canEditSeller: true,
          canManageSellerProducts: true,
          canManageSellerStaff: true,
          jobTitle: null,
          seller: {
            id: 21,
            name: "Loja Norte",
            email: "norte@pediobra.local",
            address: "Rua B",
            cep: "00000000",
            phone: "11999999999",
          },
        },
      ],
      driverProfiles: [],
    };
    jest.mocked(operationsService.overview).mockResolvedValue(overview as never);
    jest.mocked(sellersService.list).mockResolvedValue({
      data: [
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
      ],
      meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
    } as never);
    jest
      .mocked(operationsService.runDispatchCycle)
      .mockResolvedValue({ created: 1, expired: 0 });
    jest.mocked(operationsService.expireOffer).mockResolvedValue({} as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders summary cards, attention queue, jobs, and offers", async () => {
    renderWithQueryClient(<OperationsPage />);

    expect(await screen.findByText("Pedidos ativos")).toBeInTheDocument();
    expect(screen.getByText("Fila Atenção")).toBeInTheDocument();
    expect(
      await screen.findByText("Pedido com pagamento pendente"),
    ).toBeInTheDocument();
    expect(screen.getByText("Oferta #9")).toBeInTheDocument();
    expect(screen.getByText("Job #7")).toBeInTheDocument();
  });

  it("runs the dispatch-cycle action", async () => {
    renderWithQueryClient(<OperationsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Reprocessar despacho/ }),
    );

    await waitFor(() => {
      expect(operationsService.runDispatchCycle).toHaveBeenCalledTimes(1);
    });
  });

  it("starts with all companies and filters overview by selected seller", async () => {
    mockIsAdmin = false;
    renderWithQueryClient(<OperationsPage />);

    await waitFor(() => {
      expect(operationsService.overview).toHaveBeenCalledWith({});
    });

    const sellerSelect = screen.getByRole("combobox", { name: /Empresas/i });
    sellerSelect.focus();
    fireEvent.keyDown(sellerSelect, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Loja Norte" }));

    await waitFor(() => {
      expect(operationsService.overview).toHaveBeenLastCalledWith({
        sellerId: 21,
      });
    });
  });

  it("keeps seller driver alerts visible without linking to admin-only driver pages", async () => {
    mockIsAdmin = false;
    jest.mocked(operationsService.overview).mockResolvedValueOnce({
      ...overview,
      issues: [
        {
          type: "ONLINE_DRIVER_STALE_LOCATION",
          title: "Motorista online sem localizacao recente",
          severity: "warning",
          driverProfileId: 30,
          lastLocationAt: "2026-05-01T12:00:00.000Z",
        },
      ],
      jobs: [],
      offers: [],
    } as never);

    const { container } = renderWithQueryClient(<OperationsPage />);

    expect(
      await screen.findByText("Motorista online sem localizacao recente"),
    ).toBeInTheDocument();
    expect(screen.getByText("Motorista #30")).toBeInTheDocument();
    expect(screen.getByText(/Oriente o motorista/)).toBeInTheDocument();
    expect(container.querySelector('a[href="/drivers/30"]')).toBeNull();
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
