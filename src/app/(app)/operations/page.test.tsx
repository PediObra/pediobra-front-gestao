import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import OperationsPage from "./page";
import { operationsService } from "@/lib/api/operations";

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ isAdmin: true }),
}));

jest.mock("@/lib/api/operations", () => ({
  operationsService: {
    overview: jest.fn(),
    runDispatchCycle: jest.fn(),
    expireOffer: jest.fn(),
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
  beforeEach(() => {
    jest.mocked(operationsService.overview).mockResolvedValue(overview as never);
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

    fireEvent.click(await screen.findByRole("button", { name: /Reprocessar despacho/ }));

    await waitFor(() => {
      expect(operationsService.runDispatchCycle).toHaveBeenCalledTimes(1);
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
