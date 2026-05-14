import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import SellerProductImportReviewPage from "./page";
import { productsService } from "@/lib/api/products";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";

const mockAuth = {
  isAdmin: true,
  isLoading: false,
};

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("@/lib/api/seller-product-imports", () => ({
  sellerProductImportsService: {
    listProductReview: jest.fn(),
    approveProduct: jest.fn(),
    linkProduct: jest.fn(),
    rejectProduct: jest.fn(),
  },
}));

jest.mock("@/lib/api/products", () => ({
  productsService: {
    list: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SellerProductImportReviewPage", () => {
  beforeEach(() => {
    mockAuth.isAdmin = true;
    mockAuth.isLoading = false;
    jest.mocked(sellerProductImportsService.listProductReview).mockResolvedValue(
      {
        data: [makeReviewRow()],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    );
    jest.mocked(sellerProductImportsService.approveProduct).mockResolvedValue({
      id: 123,
      sellerId: 10,
      createdByUserId: 1,
      status: "APPLIED",
      mode: "MERGE_UPSERT",
    });
    jest.mocked(sellerProductImportsService.linkProduct).mockResolvedValue({
      id: 123,
      sellerId: 10,
      createdByUserId: 1,
      status: "APPLIED",
      mode: "MERGE_UPSERT",
    });
    jest.mocked(sellerProductImportsService.rejectProduct).mockResolvedValue({
      id: 123,
      sellerId: 10,
      createdByUserId: 1,
      status: "APPLIED",
      mode: "MERGE_UPSERT",
    });
    jest.mocked(productsService.list).mockResolvedValue({
      data: [
        {
          id: 77,
          categoryId: null,
          name: "Martelo Global",
          brand: "ObraFlow",
          unit: "UN",
          size: "500g",
        },
      ],
      meta: { page: 1, limit: 6, total: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lists pending rows and lets admins approve, link, or reject", async () => {
    renderWithQueryClient(<SellerProductImportReviewPage />);

    expect(
      await screen.findByText("Argamassa ACIII"),
    ).toBeInTheDocument();
    expect(screen.getByText("Deposito Indaiatuba")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Aprovar produto/i }));
    expect(sellerProductImportsService.approveProduct).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole("button", { name: /Confirmar aprovação/i }),
    );
    await waitFor(() => {
      expect(sellerProductImportsService.approveProduct).toHaveBeenCalledWith(
        9,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Aprovar produto/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Selecionar produto/i }),
    );
    fireEvent.change(screen.getByPlaceholderText("Buscar produto por nome"), {
      target: { value: "Martelo" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: /Martelo Global/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar vínculo/i }),
    );
    await waitFor(() => {
      expect(sellerProductImportsService.linkProduct).toHaveBeenCalledWith(
        9,
        77,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));
    const confirmRejectButton = await screen.findByRole("button", {
      name: /Confirmar rejeição/i,
    });
    expect(confirmRejectButton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Motivo para rejeitar"), {
      target: { value: "Produto duplicado." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Confirmar rejeição/i }),
    );
    await waitFor(() => {
      expect(sellerProductImportsService.rejectProduct).toHaveBeenCalledWith(
        9,
        "Produto duplicado.",
      );
    });
  });

  it("blocks non-admin users from the review UI", () => {
    mockAuth.isAdmin = false;

    renderWithQueryClient(<SellerProductImportReviewPage />);

    expect(
      screen.getByText("Apenas admins podem revisar produtos globais importados."),
    ).toBeInTheDocument();
    expect(sellerProductImportsService.listProductReview).not.toHaveBeenCalled();
  });
});

function makeReviewRow() {
  return {
    id: 9,
    jobId: 123,
    rowNumber: 2,
    status: "PENDING_PRODUCT_REVIEW" as const,
    matchStrategy: "NEW_CANDIDATE",
    matchConfidenceBps: 0,
    existingProductId: null,
    createdProductId: null,
    sellerProductId: null,
    warnings: ["Sem match confiavel."],
    errors: [],
    createdAt: "2026-05-06T12:00:00.000Z",
    normalizedPayload: {
      product: {
        name: "Argamassa ACIII",
        brand: "Quartzolit",
        unit: "UN",
        size: "20kg",
        barcodes: ["789999"],
      },
      sellerProduct: {
        sku: "ERP-9",
        unitPriceCents: 3290,
        stockAmount: 4,
        active: true,
      },
    },
    job: {
      id: 123,
      sellerId: 10,
      createdByUserId: 1,
      status: "PENDING_PRODUCT_REVIEW" as const,
      mode: "MERGE_UPSERT",
      seller: { id: 10, name: "Deposito Indaiatuba" },
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
