import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import DashboardPage from "./page";
import { ordersService } from "@/lib/api/orders";
import { productsService } from "@/lib/api/products";
import { deliveryRequestsService } from "@/lib/api/delivery-requests";
import type { Order, Paginated } from "@/lib/api/types";

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Lucas Indaiatuba",
      email: "lucas@pediobra.local",
      roles: ["SELLER"],
      sellers: [],
      driverProfiles: [],
    },
    isAdmin: false,
    isSeller: true,
    sellerIds: [20],
  }),
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

jest.mock("@/lib/api/products", () => ({
  productsService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/drivers", () => ({
  driversService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/delivery-requests", () => ({
  deliveryRequestsService: {
    stats: jest.fn(),
    list: jest.fn(),
  },
}));

const pendingOrder = {
  id: 11,
  sellerId: 20,
  status: "PENDING",
  paymentStatus: "AUTHORIZED",
  createdAt: "2026-05-01T12:00:00.000Z",
  totalAmountCents: 10_000,
} as Order;

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.mocked(ordersService.stats).mockResolvedValue({
      total: 0,
      active: 0,
      delivered: 0,
      cancelled: 0,
      revenueCents: 0,
      statusCounts: {},
    });
    jest.mocked(ordersService.list).mockImplementation((params = {}) => {
      if (params.status === "PENDING") {
        return Promise.resolve(
          paginated<Order>([pendingOrder], { total: 2 }),
        );
      }

      return Promise.resolve(paginated<Order>([]));
    });
    jest.mocked(productsService.list).mockResolvedValue(paginated([]));
    jest.mocked(deliveryRequestsService.stats).mockResolvedValue({
      total: 0,
      active: 0,
      delivered: 0,
      cancelled: 0,
      feeCents: 0,
      statusCounts: {},
    });
    jest.mocked(deliveryRequestsService.list).mockResolvedValue(paginated([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a pending-order alert linked to the oldest pending order", async () => {
    const { container } = renderWithQueryClient(<DashboardPage />);

    expect(
      await screen.findByText("Pedidos aguardando aceite"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 pendente(s)")).toBeInTheDocument();
    expect(screen.getByText("#0011 precisa de atenção.")).toBeInTheDocument();
    expect(container.querySelector('a[href="/orders/11"]')).toBeTruthy();
  });

  it("loads pending orders outside the selected dashboard period", async () => {
    renderWithQueryClient(<DashboardPage />);

    await screen.findByText("Pedidos aguardando aceite");
    fireEvent.click(screen.getByRole("tab", { name: "Ontem" }));

    await waitFor(() => {
      const pendingCalls = jest
        .mocked(ordersService.list)
        .mock.calls.filter(([params]) => params?.status === "PENDING");

      expect(pendingCalls).toHaveLength(1);
      expect(pendingCalls[0]?.[0]).toEqual({
        page: 1,
        limit: 1,
        status: "PENDING",
        sellerId: 20,
      });
    });
  });

  it("hides the pending-order alert when there are no pending orders", async () => {
    jest.mocked(ordersService.list).mockImplementation((params = {}) => {
      if (params.status === "PENDING") {
        return Promise.resolve(paginated<Order>([], { total: 0 }));
      }

      return Promise.resolve(paginated<Order>([]));
    });

    renderWithQueryClient(<DashboardPage />);

    await waitFor(() => {
      expect(ordersService.list).toHaveBeenCalled();
    });
    expect(screen.queryByText("Pedidos aguardando aceite")).toBeNull();
  });
});

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
