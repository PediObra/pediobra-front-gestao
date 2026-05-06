import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ImportSellerProductsForm } from "./import-seller-products-form";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import type { Seller } from "@/lib/api/types";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/api/seller-product-imports", () => ({
  sellerProductImportsService: {
    getMapping: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const sellers: Seller[] = [
  {
    id: 3,
    name: "Deposito Indaiatuba Local",
    email: "indaiatuba@sellers.pediobra.local",
    address: "Estrada Doutor Rafael Elias Jose Aun, 300",
    cep: "13348000",
    phone: "19940000003",
    logo: null,
  },
];

describe("ImportSellerProductsForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.mocked(sellerProductImportsService.getMapping).mockResolvedValue({
      sellerId: 3,
      canonicalFields: ["product.name", "sellerProduct.unitPriceCents"],
      mappings: [
        { canonicalField: "product.name", sourceColumn: "nome_produto" },
        {
          canonicalField: "sellerProduct.unitPriceCents",
          sourceColumn: "preco",
        },
      ],
    });
    jest.mocked(sellerProductImportsService.create).mockResolvedValue({
      id: 77,
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates an import job from the page form and redirects to its detail", async () => {
    renderWithQueryClient(
      <ImportSellerProductsForm sellers={sellers} initialSellerId={3} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome do produto/)).toHaveValue(
        "nome_produto",
      );
    });
    expect(screen.getByLabelText(/Preco/)).toHaveValue("preco");

    const file = new File(["nome_produto,preco"], "ofertas.csv", {
      type: "text/csv",
    });
    fireEvent.change(screen.getByLabelText("Arquivo CSV"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Criar importacao/i }));

    await waitFor(() => {
      expect(sellerProductImportsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: 3,
          file,
          mapping: expect.arrayContaining([
            {
              canonicalField: "product.name",
              sourceColumn: "nome_produto",
            },
            {
              canonicalField: "sellerProduct.unitPriceCents",
              sourceColumn: "preco",
            },
          ]),
        }),
      );
    });
    expect(mockPush).toHaveBeenCalledWith("/seller-product-imports/77");
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
