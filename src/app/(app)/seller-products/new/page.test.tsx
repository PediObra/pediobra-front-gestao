import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import NewSellerProductPage from "./page";
import { productsService } from "@/lib/api/products";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { sellerProductsService } from "@/lib/api/seller-products";
import { sellersService } from "@/lib/api/sellers";
import type {
  AuthUser,
  Paginated,
  Product,
  Seller,
  SellerProduct,
} from "@/lib/api/types";

const routerPush = jest.fn();
let mockAuth: ReturnType<typeof buildSellerAuth>;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/products", () => ({
  productsService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/sellers", () => ({
  sellersService: {
    list: jest.fn(),
  },
}));

jest.mock("@/lib/api/seller-products", () => ({
  sellerProductsService: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/lib/api/seller-product-imports", () => ({
  sellerProductImportsService: {
    createProductReview: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const seller = {
  id: 20,
  name: "Deposito Indaiatuba Local",
  email: "indaiatuba@pediobra.local",
  address: "Rua Teste",
  cep: "13300000",
  phone: "11999999999",
} satisfies Seller;

const product = {
  id: 100,
  categoryId: null,
  name: "Cimento CP-II 50kg",
  brand: "Votoran",
  unit: "UN",
  active: true,
} satisfies Product;

mockAuth = buildSellerAuth();

describe("NewSellerProductPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockAuth = buildSellerAuth();
    jest
      .mocked(productsService.list)
      .mockResolvedValue(paginated<Product>([product]));
    jest
      .mocked(sellerProductsService.list)
      .mockResolvedValue(paginated<SellerProduct>([]));
    jest.mocked(sellerProductsService.create).mockResolvedValue({
      id: 300,
      sellerId: seller.id,
      productId: product.id,
      unitPriceCents: 3290,
      stockAmount: 4,
    } as SellerProduct);
    jest
      .mocked(sellerProductImportsService.createProductReview)
      .mockResolvedValue({
        id: 77,
        sellerId: seller.id,
        createdByUserId: 10,
        status: "PENDING_PRODUCT_REVIEW",
        mode: "MANUAL_PRODUCT_REVIEW",
      });
    jest.mocked(sellersService.list).mockResolvedValue(paginated<Seller>([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the authenticated seller store without depending on the admin sellers query", async () => {
    renderWithQueryClient(<NewSellerProductPage />);

    await waitFor(() => {
      expect(sellerProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ sellerId: seller.id }),
      );
    });

    const storeSelect = screen.getByRole("combobox", {
      name: /loja|empresa/i,
    });
    fireEvent.click(storeSelect);

    expect(
      await screen.findByRole("option", { name: seller.name }),
    ).toBeInTheDocument();
    expect(sellersService.list).not.toHaveBeenCalled();
  });

  it("sends typed products without a catalog selection to external review", async () => {
    renderWithQueryClient(<NewSellerProductPage />);

    await waitFor(() => {
      expect(sellerProductsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ sellerId: seller.id }),
      );
    });

    fireEvent.change(screen.getByRole("combobox", { name: /produto/i }), {
      target: { value: "Argamassa ACIII" },
    });
    fireEvent.change(screen.getByLabelText(/Marca/i), {
      target: { value: "Quartzolit" },
    });
    fireEvent.change(screen.getByLabelText(/Unidade/i), {
      target: { value: "UN" },
    });
    fireEvent.change(screen.getByLabelText(/Tamanho/i), {
      target: { value: "20kg" },
    });
    fireEvent.change(screen.getByLabelText(/Preço unitário/i), {
      target: { value: "32,90" },
    });
    fireEvent.change(screen.getByLabelText(/Estoque operacional/i), {
      target: { value: "4" },
    });

    expect(screen.getByText(/revisão externa/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Enviar para revisão/i }),
    );

    await waitFor(() => {
      expect(
        sellerProductImportsService.createProductReview,
      ).toHaveBeenCalledWith({
        sellerId: seller.id,
        product: {
          name: "Argamassa ACIII",
          brand: "Quartzolit",
          unit: "UN",
          size: "20kg",
        },
        sellerProduct: {
          unitPriceCents: 3290,
          stockAmount: 4,
          active: true,
        },
      });
    });
    expect(sellerProductsService.create).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/seller-product-imports/77");
  });
});

function buildSellerAuth() {
  const user = {
    id: 10,
    name: "Lucas Indaiatuba",
    email: "lucas@pediobra.local",
    roles: ["SELLER"],
    sellers: [
      {
        sellerId: seller.id,
        membershipRole: "OWNER",
        canEditSeller: true,
        canManageSellerProducts: true,
        canManageSellerStaff: true,
        jobTitle: null,
        seller,
      },
    ],
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
    needsSellerOnboarding: false,
    sellerIds: [seller.id],
    canAccessSeller: jest.fn((sellerId: number) => sellerId === seller.id),
    canEditSeller: jest.fn((sellerId: number) => sellerId === seller.id),
    canManageSellerProducts: jest.fn(
      (sellerId: number) => sellerId === seller.id,
    ),
    canManageSellerStaff: jest.fn((sellerId: number) => sellerId === seller.id),
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
