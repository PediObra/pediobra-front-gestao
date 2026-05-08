import { Suspense, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SellerTeamMemberPage from "./page";
import { sellersService } from "@/lib/api/sellers";
import type { Seller, UserWithRelations } from "@/lib/api/types";

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");

  return {
    ...actual,
    use: () => ({ id: "3", userId: "22" }),
  };
});

const pushMock = jest.fn();
const mockAuth = {
  user: { id: 10 },
  isAdmin: false,
  canManageSellerStaff: jest.fn(() => true),
  membershipFor: jest.fn(() => ({
    sellerId: 3,
    membershipRole: "EMPLOYEE",
    canEditSeller: false,
    canManageSellerProducts: false,
    canManageSellerStaff: true,
  })),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    getById: jest.fn(),
    getUserAccess: jest.fn(),
    updateUserAccess: jest.fn(),
    removeUserAccess: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SellerTeamMemberPage", () => {
  beforeEach(() => {
    mockAuth.user = { id: 10 };
    mockAuth.isAdmin = false;
    mockAuth.canManageSellerStaff.mockReturnValue(true);
    mockAuth.membershipFor.mockReturnValue({
      sellerId: 3,
      membershipRole: "EMPLOYEE",
      canEditSeller: false,
      canManageSellerProducts: false,
      canManageSellerStaff: true,
    });
    jest.mocked(sellersService.getById).mockResolvedValue(makeSeller());
    jest.mocked(sellersService.getUserAccess).mockResolvedValue(makeUser());
    jest.mocked(sellersService.updateUserAccess).mockResolvedValue(makeUser());
    jest.mocked(sellersService.removeUserAccess).mockResolvedValue(makeUser());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("saves seller-specific team access", async () => {
    renderWithQueryClient(<SellerTeamMemberPage params={resolvedParams()} />);

    expect(
      await screen.findByRole("heading", { name: "Lucas Indaiatuba" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cargo"), {
      target: { value: "Gerente" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar acesso/i }));

    await waitFor(() => {
      expect(sellersService.updateUserAccess).toHaveBeenCalledWith(3, 22, {
        jobTitle: "Gerente",
        membershipRole: "EMPLOYEE",
        canEditSeller: false,
        canManageSellerProducts: true,
        canManageSellerStaff: false,
      });
    });
  });

  it("removes only the seller access and returns to the seller page", async () => {
    renderWithQueryClient(<SellerTeamMemberPage params={resolvedParams()} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /remover usuário da loja/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^remover da loja$/i }));

    await waitFor(() => {
      expect(sellersService.removeUserAccess).toHaveBeenCalledWith(3, 22);
    });
    expect(pushMock).toHaveBeenCalledWith("/sellers/3");
  });

  it("does not let the current owner remove their own owner role or access", async () => {
    mockAuth.user = { id: 22 };
    mockAuth.membershipFor.mockReturnValue({
      sellerId: 3,
      membershipRole: "OWNER",
      canEditSeller: true,
      canManageSellerProducts: true,
      canManageSellerStaff: true,
    });
    jest.mocked(sellersService.getUserAccess).mockResolvedValue(
      makeUser({
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
    );

    renderWithQueryClient(<SellerTeamMemberPage params={resolvedParams()} />);

    expect(
      await screen.findByText("Você não pode remover seu próprio papel de owner."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cargo")).not.toBeInTheDocument();
    expect(screen.queryByText("Dono")).not.toBeInTheDocument();
    expect(
      screen.getByText("Você não pode remover seu próprio acesso da loja."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remover usuário da loja/i }),
    ).not.toBeInTheDocument();
  });

  it("does not offer owner promotion to staff managers", async () => {
    renderWithQueryClient(<SellerTeamMemberPage params={resolvedParams()} />);

    expect(
      await screen.findByRole("heading", { name: "Lucas Indaiatuba" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Papel na loja"));

    expect(
      screen.queryByRole("option", { name: "Proprietário" }),
    ).not.toBeInTheDocument();
  });

  it("does not let staff managers edit or remove owners", async () => {
    jest.mocked(sellersService.getUserAccess).mockResolvedValue(
      makeUser({
        sellers: [
          {
            sellerId: 3,
            jobTitle: null,
            membershipRole: "OWNER",
            canEditSeller: true,
            canManageSellerProducts: true,
            canManageSellerStaff: true,
            seller: makeSeller(),
          },
        ],
      }),
    );

    renderWithQueryClient(<SellerTeamMemberPage params={resolvedParams()} />);

    expect(
      await screen.findByText(
        "Apenas proprietários podem alterar o acesso de outro proprietário.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Papel na loja")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /salvar acesso/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remover usuário da loja/i }),
    ).toBeDisabled();
  });
});

function makeSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    id: 3,
    name: "Deposito Indaiatuba Local",
    email: "indaiatuba@sellers.pediobra.local",
    address: "Rua A, 10",
    cep: "13348000",
    phone: "19940000003",
    logo: null,
    ...overrides,
  };
}

function makeUser(
  overrides: Partial<UserWithRelations> = {},
): UserWithRelations {
  return {
    id: 22,
    name: "Lucas Indaiatuba",
    email: "lucas@sellers.pediobra.local",
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

function resolvedParams() {
  return Promise.resolve({ id: "3", userId: "22" });
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
