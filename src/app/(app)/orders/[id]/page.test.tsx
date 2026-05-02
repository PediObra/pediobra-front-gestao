import { Suspense, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrderDetailPage from "./page";
import { ordersService } from "@/lib/api/orders";
import type { AuthUser, Order } from "@/lib/api/types";

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");

  return {
    ...actual,
    use: () => ({ id: "1" }),
  };
});

const mockUser: AuthUser = {
  id: 1,
  name: "Lucas Indaiatuba",
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
        name: "Deposito Indaiatuba Local",
        email: "deposito@pediobra.local",
        address: "Rua A",
        cep: "00000000",
        phone: "11999999999",
      },
    },
  ],
  driverProfiles: [],
};
const mockAdminUser: AuthUser = {
  ...mockUser,
  id: 99,
  name: "Master",
  email: "master@pediobra.local",
  roles: ["ADMIN"],
  sellers: [],
};

let mockAuth = {
  user: mockUser,
  isAdmin: false,
};

let mockOrder = makeOrder();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/orders", () => ({
  ordersService: {
    getById: jest.fn(),
    updateStatus: jest.fn(),
    assignDriver: jest.fn(),
    confirmPickup: jest.fn(),
    confirmCustomerPickup: jest.fn(),
    addEvidence: jest.fn(),
  },
}));

jest.mock("@/lib/api/drivers", () => ({
  driversService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/payments", () => ({
  paymentsService: {
    createMock: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("OrderDetailPage status actions", () => {
  beforeEach(() => {
    mockAuth = {
      user: mockUser,
      isAdmin: false,
    };
    mockOrder = makeOrder();
    jest.mocked(ordersService.getById).mockResolvedValue(mockOrder);
    jest.mocked(ordersService.updateStatus).mockImplementation((_id, payload) =>
      Promise.resolve({ ...mockOrder, status: payload.status } as Order),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders direct status buttons instead of the status select", async () => {
    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    expect(
      await screen.findByRole("button", { name: "Aceitar pedido" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Não aceitar" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Novo status")).toBeNull();
  });

  it("confirms first-step acceptance before updating the order", async () => {
    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Aceitar pedido" }),
    );
    expect(await screen.findByText("Aceitar pedido?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar aceite" }));

    await waitFor(() => {
      expect(ordersService.updateStatus).toHaveBeenCalledWith(1, {
        status: "CONFIRMED",
        cancellationReason: undefined,
      });
    });
  });

  it("confirms first-step refusal with the default refusal reason", async () => {
    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Não aceitar" }),
    );
    expect(await screen.findByText("Não aceitar pedido?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar recusa" }));

    await waitFor(() => {
      expect(ordersService.updateStatus).toHaveBeenCalledWith(1, {
        status: "CANCELLED",
        cancellationReason: "Loja recusou o pedido",
      });
    });
  });

  it("applies non-cancellation next steps directly after the first phase", async () => {
    mockOrder = makeOrder({ status: "CONFIRMED" });
    jest.mocked(ordersService.getById).mockResolvedValue(mockOrder);

    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Em preparo" }));

    await waitFor(() => {
      expect(ordersService.updateStatus).toHaveBeenCalledWith(1, {
        status: "PREPARING",
      });
    });
    expect(screen.queryByText("Cancelar pedido?")).toBeNull();
  });

  it("confirms later cancellations with the default cancellation reason", async () => {
    mockOrder = makeOrder({ status: "CONFIRMED" });
    jest.mocked(ordersService.getById).mockResolvedValue(mockOrder);

    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Cancelar pedido" }),
    );
    expect(await screen.findByText("Cancelar pedido?")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    await waitFor(() => {
      expect(ordersService.updateStatus).toHaveBeenCalledWith(1, {
        status: "CANCELLED",
        cancellationReason: "Pedido cancelado pela loja",
      });
    });
  });

  it("does not show driver-managed delivery statuses to seller users", async () => {
    mockOrder = makeOrder({
      status: "PICKED_UP",
      assignedDriverProfileId: 30,
    });
    jest.mocked(ordersService.getById).mockResolvedValue(mockOrder);

    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    await screen.findByText("Motorista");

    expect(screen.queryByRole("button", { name: "Em rota" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Falha na entrega" }),
    ).toBeNull();
  });

  it("does not expose manual driver assignment or driver-managed statuses to admin users", async () => {
    mockAuth = {
      user: mockAdminUser,
      isAdmin: true,
    };
    mockOrder = makeOrder({
      status: "PICKED_UP",
      assignedDriverProfileId: 30,
    });
    jest.mocked(ordersService.getById).mockResolvedValue(mockOrder);

    renderWithQueryClient(<OrderDetailPage params={resolvedParams()} />);

    await screen.findByText("Motorista");

    expect(screen.queryByText("Atribuir motorista")).toBeNull();
    expect(screen.queryByRole("button", { name: "Em rota" })).toBeNull();
  });
});

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    clientUserId: 10,
    sellerId: 20,
    customerAddressId: 30,
    status: "PENDING",
    paymentStatus: "AUTHORIZED",
    totalAmountCents: 10_000,
    deliveryFeeCents: 1_000,
    deliveryAddress: "Rua Voluntario Joao dos Santos, 2005",
    deliveryCep: "13330-230",
    contactPhone: "11999999999",
    notes: null,
    assignedDriverProfileId: null,
    assignedDriverProfile: null,
    clientUser: {
      id: 10,
      name: "Ana Souza",
      email: "ana@pediobra.local",
      createdAt: "2026-05-01T12:00:00.000Z",
    },
    seller: {
      id: 20,
      name: "Deposito Indaiatuba Local",
      email: "deposito@pediobra.local",
      address: "Rua A",
      cep: "00000000",
      phone: "11999999999",
    },
    items: [],
    payments: [],
    evidences: [],
    statusHistory: [],
    createdAt: "2026-05-01T12:00:00.000Z",
    updatedAt: "2026-05-01T12:00:00.000Z",
    active: true,
    ...overrides,
  } as Order;
}

function resolvedParams() {
  return Promise.resolve({ id: "1" });
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
