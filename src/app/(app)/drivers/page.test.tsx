import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { toast } from "sonner";
import DriversListPage from "./page";
import { driversService } from "@/lib/api/drivers";
import { operationsService } from "@/lib/api/operations";
import type { AuthUser, DriverProfile, Paginated } from "@/lib/api/types";

const routerPush = jest.fn();
let mockAuth = buildAuth({ isAdmin: true });

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/drivers", () => ({
  driversService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/operations", () => ({
  operationsService: {
    cleanupDriverLocations: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const drivers = [
  {
    id: 30,
    userId: 10,
    cpf: "12345678900",
    cnh: "12345678901",
    phone: "11999999999",
    address: "Rua A",
    status: "APPROVED",
    user: {
      id: 10,
      name: "Ana Driver",
      email: "ana.driver@pediobra.local",
      createdAt: "2026-05-01T12:00:00.000Z",
    },
    vehicles: [],
  },
] satisfies DriverProfile[];

describe("DriversListPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockAuth = buildAuth({ isAdmin: true });
    jest
      .mocked(driversService.list)
      .mockResolvedValue(paginated<DriverProfile>(drivers));
    jest.mocked(operationsService.cleanupDriverLocations).mockResolvedValue({
      deleted: 42,
      retentionHours: 48,
      cutoff: "2026-05-05T12:00:00.000Z",
      batchSize: 5000,
      batches: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lets admins manually clean old driver GPS history from a confirmation dialog", async () => {
    renderWithQueryClient(<DriversListPage />);

    expect(await screen.findByText("Ana Driver")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Limpar histórico de GPS/i }),
    );

    expect(
      screen.getByRole("heading", { name: /Limpar histórico antigo de GPS/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pontos de histórico com mais de 48 horas/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /^Limpar histórico$/i }),
    );

    await waitFor(() => {
      expect(operationsService.cleanupDriverLocations).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Histórico antigo de GPS limpo: 42 ponto(s) apagado(s).",
    );
  });

  it("hides the manual GPS cleanup action when the viewer is not admin", async () => {
    mockAuth = buildAuth({ isAdmin: false });

    renderWithQueryClient(<DriversListPage />);

    expect(await screen.findByText("Ana Driver")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Limpar histórico de GPS/i }),
    ).toBeNull();
  });
});

function buildAuth({ isAdmin }: { isAdmin: boolean }) {
  const user = {
    id: 1,
    name: "Admin PediObra",
    email: "admin@pediobra.local",
    roles: [isAdmin ? "ADMIN" : "SELLER"],
    sellers: [],
    driverProfiles: [],
  } satisfies AuthUser;

  return {
    user,
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    hasRole: jest.fn(),
    isAdmin,
    isSeller: !isAdmin,
    isDriver: false,
    needsSellerOnboarding: false,
    sellerIds: [],
    canAccessSeller: jest.fn(),
    canEditSeller: jest.fn(),
    canManageSellerProducts: jest.fn(),
    canManageSellerStaff: jest.fn(),
    membershipFor: jest.fn(),
  };
}

function paginated<T>(data: T[]): Paginated<T> {
  return {
    data,
    meta: {
      page: 1,
      limit: 10,
      total: data.length,
      totalPages: 1,
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
