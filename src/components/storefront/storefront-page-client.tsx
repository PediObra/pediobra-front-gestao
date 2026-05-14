"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Droplets,
  Flower2,
  Grid3X3,
  Hammer,
  Home,
  Layers,
  Leaf,
  Link2,
  type LucideIcon,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Paintbrush,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Umbrella,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import type { PlaceSuggestion, ResolvedPlace } from "@/lib/api/geo";
import {
  storefrontCheckoutService,
  storefrontGeoService,
  type StorefrontProduct,
} from "@/lib/api/storefront";
import type {
  FulfillmentMethod,
  ProductCategory,
  SellerStorefront,
} from "@/lib/api/types";
import { centsToBRL } from "@/lib/formatters";
import {
  calculateDistanceMeters,
  formatDistanceShort,
} from "@/lib/geo-distance";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

const BASE_FEE_CENTS = 800;
const MINIMUM_FEE_CENTS = 1000;
const FEE_PER_KM_CENTS = 250;
type StorefrontView = "catalog" | "cart";
type StorefrontCategoryNode = ProductCategory & {
  children: ProductCategory[];
};
type CategoryVisual = {
  icon: LucideIcon;
  background: string;
  accent: string;
};

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "material-basico-de-obra": {
    icon: Box,
    background: "#fff7ed",
    accent: "#ea580c",
  },
  hidraulica: {
    icon: Droplets,
    background: "#eff6ff",
    accent: "#0284c7",
  },
  eletrica: {
    icon: Zap,
    background: "#fefce8",
    accent: "#ca8a04",
  },
  "tintas-e-acabamento": {
    icon: Paintbrush,
    background: "#fdf2f8",
    accent: "#db2777",
  },
  esquadrias: {
    icon: Layers,
    background: "#f5f3ff",
    accent: "#7c3aed",
  },
  "pisos-e-revestimentos": {
    icon: Grid3X3,
    background: "#f0fdfa",
    accent: "#0f766e",
  },
  "banheiro-e-cozinha": {
    icon: Home,
    background: "#ecfeff",
    accent: "#0891b2",
  },
  madeiras: {
    icon: Leaf,
    background: "#f7fee7",
    accent: "#65a30d",
  },
  "ferragens-e-fixacao": {
    icon: Link2,
    background: "#f8fafc",
    accent: "#475569",
  },
  ferramentas: {
    icon: Hammer,
    background: "#fffbeb",
    accent: "#d97706",
  },
  "seguranca-e-epi": {
    icon: ShieldCheck,
    background: "#f0fdf4",
    accent: "#16a34a",
  },
  "cobertura-e-telhados": {
    icon: Umbrella,
    background: "#eef2ff",
    accent: "#4f46e5",
  },
  "jardim-e-area-externa": {
    icon: Flower2,
    background: "#f0fdf4",
    accent: "#059669",
  },
  "drywall-e-forros": {
    icon: Layers,
    background: "#faf5ff",
    accent: "#9333ea",
  },
};

const FALLBACK_VISUAL: CategoryVisual = {
  icon: Wrench,
  background: "#f4f4f5",
  accent: "#d97706",
};

export function StorefrontPageClient({
  storefront,
  products,
  categories: productCategories,
}: {
  storefront: SellerStorefront;
  products: StorefrontProduct[];
  categories: ProductCategory[];
}) {
  const router = useRouter();
  const canDeliver = storefront.allowedFulfillmentMethods.includes("DELIVERY");
  const canPickup =
    storefront.allowedFulfillmentMethods.includes("STORE_PICKUP");
  const [activeView, setActiveView] = useState<StorefrontView>("catalog");
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>(canDeliver ? "DELIVERY" : "STORE_PICKUP");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState<PlaceSuggestion | null>(
    null,
  );
  const [resolvedDeliveryPlace, setResolvedDeliveryPlace] =
    useState<ResolvedPlace | null>(null);
  const [deliveryResolvePending, setDeliveryResolvePending] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const categories = useMemo(
    () =>
      productCategories.length > 0
        ? normalizeCategoryTree(productCategories)
        : buildStorefrontCategoryTree(products),
    [productCategories, products],
  );
  const selectedParentCategory =
    categories.find((category) => category.id === parentCategoryId) ?? null;
  const selectedParentChildIds = useMemo(
    () =>
      new Set(
        selectedParentCategory?.children.map((category) => category.id) ?? [],
      ),
    [selectedParentCategory],
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    return products.filter((product) => {
      const productCategory = product.product?.category ?? null;

      if (categoryId && productCategory?.id !== categoryId) {
        return false;
      }

      if (parentCategoryId && !categoryId) {
        const productParentId = productCategory?.parent?.id;
        const productCategoryId = productCategory?.id;

        if (
          productParentId !== parentCategoryId &&
          productCategoryId !== parentCategoryId &&
          (productCategoryId
            ? !selectedParentChildIds.has(productCategoryId)
            : true)
        ) {
          return false;
        }
      }

      if (!normalizedSearch) return true;

      const haystack = [
        product.product?.name,
        product.product?.brand,
        product.sku,
        getProductCategory(product),
        productCategory?.parent?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return haystack.includes(normalizedSearch);
    });
  }, [
    products,
    searchTerm,
    parentCategoryId,
    categoryId,
    selectedParentChildIds,
  ]);
  const cartItems = useMemo(
    () =>
      products
        .map((product) => ({
          product,
          quantity: quantities[product.id] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [products, quantities],
  );
  const subtotalCents = cartItems.reduce(
    (sum, item) => sum + item.product.unitPriceCents * item.quantity,
    0,
  );
  const cartDistinctCount = cartItems.length;
  const cartTotalQuantity = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const deliveryDistanceMeters = calculateDistanceMeters(
    storefront.seller,
    resolvedDeliveryPlace,
  );
  const estimatedDeliveryFeeCents =
    fulfillmentMethod === "DELIVERY" && deliveryDistanceMeters !== undefined
      ? calculateEstimatedDeliveryFee(deliveryDistanceMeters)
      : 0;
  const totalCents = subtotalCents + estimatedDeliveryFeeCents;

  function switchView(view: StorefrontView) {
    setActiveView(view);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function selectParentCategory(id: number) {
    setParentCategoryId((currentId) => (currentId === id ? null : id));
    setCategoryId(null);
  }

  function selectCategory(id: number) {
    setCategoryId((currentId) => (currentId === id ? null : id));
  }

  function updateQuantity(product: StorefrontProduct, delta: number) {
    setQuantities((current) => {
      const next = Math.max(
        0,
        Math.min(product.stockAmount, (current[product.id] ?? 0) + delta),
      );

      return {
        ...current,
        [product.id]: next,
      };
    });
  }

  function validateCheckout() {
    if (cartItems.length === 0) return "Adicione ao menos um produto.";
    if (!customerName.trim()) return "Informe seu nome.";
    if (!customerEmail.trim()) return "Informe seu email.";
    if (!customerPhone.trim()) return "Informe seu telefone.";
    if (fulfillmentMethod === "DELIVERY") {
      if (!deliveryPlace?.placeId || !resolvedDeliveryPlace) {
        return "Selecione o endereco de entrega nas sugestoes.";
      }
      if (deliveryResolvePending) {
        return "Aguarde a validacao do endereco.";
      }
    }

    return null;
  }

  function openCheckoutDialog() {
    const error = validateCheckout();
    setFormError(error);
    if (!error) setCheckoutDialogOpen(true);
  }

  async function submitCheckout() {
    const error = validateCheckout();
    setFormError(error);
    if (error) return;

    setCheckoutPending(true);
    try {
      const response = await storefrontCheckoutService.checkout(
        storefront.slug,
        {
          customerName,
          customerEmail,
          customerPhone,
          fulfillmentMethod,
          deliveryPlaceId:
            fulfillmentMethod === "DELIVERY"
              ? deliveryPlace?.placeId
              : undefined,
          deliveryAddress:
            fulfillmentMethod === "DELIVERY"
              ? resolvedDeliveryPlace?.formattedAddress
              : undefined,
          deliveryCep:
            fulfillmentMethod === "DELIVERY" ? resolvedDeliveryPlace?.cep : null,
          deliveryLatitude:
            fulfillmentMethod === "DELIVERY"
              ? resolvedDeliveryPlace?.latitude
              : undefined,
          deliveryLongitude:
            fulfillmentMethod === "DELIVERY"
              ? resolvedDeliveryPlace?.longitude
              : undefined,
          notes: notes.trim() || null,
          items: cartItems.map((item) => ({
            sellerProductId: item.product.id,
            quantity: item.quantity,
          })),
        },
      );

      toast.success("Pedido criado para a loja.");
      router.push(
        `/lojas/${storefront.slug}/pedido/${response.order.publicToken}`,
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.displayMessage
          : "Nao foi possivel criar o pedido.";
      toast.error(message);
      setFormError(message);
    } finally {
      setCheckoutPending(false);
    }
  }

  async function resolveDelivery(place: PlaceSuggestion) {
    setDeliveryPlace(place);
    setDeliveryAddress(place.description);
    setResolvedDeliveryPlace(null);
    setDeliveryResolvePending(true);

    try {
      const resolved = await storefrontGeoService.resolve(
        place.placeId,
        placesSessionToken,
      );
      setResolvedDeliveryPlace(resolved);
    } catch {
      toast.error("Nao foi possivel validar este endereco.");
      setDeliveryPlace(null);
    } finally {
      setDeliveryResolvePending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] pb-24 text-[#1f1f1f] lg:pb-0">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#8a5a00] hover:underline"
            >
              <ArrowLeft className="size-4" />
              Voltar ao ObraFlow
            </Link>

            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-[#f3c36c] bg-[#fff7e8] px-4 py-2 text-sm font-semibold text-[#7a4b00] shadow-sm transition hover:border-[#e6a52e] hover:bg-[#fff0cf]"
              onClick={() => switchView("cart")}
            >
              <span className="relative flex size-8 items-center justify-center rounded-full bg-[#f6a000] text-white">
                <ShoppingCart className="size-4" />
                {cartDistinctCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-[#1f1f1f] px-1.5 text-center text-[11px] leading-5 text-white">
                    {cartDistinctCount}
                  </span>
                )}
              </span>
              <span>Carrinho</span>
              {cartItems.length > 0 && (
                <span className="hidden text-[#4e4639] sm:inline">
                  {centsToBRL(subtotalCents)}
                </span>
              )}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#fff2d6] text-[#c77800]">
                  <Store className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a5a00]">
                    Loja oficial
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {storefront.publicName}
                  </h1>
                </div>
              </div>
            </div>

            {storefront.seller && (
              <div className="rounded-lg border border-[#ead9bd] bg-[#fffaf1] p-4 text-sm text-[#5f5b53]">
                <div className="flex items-start gap-2 font-medium text-[#1f1f1f]">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#c77800]" />
                  {storefront.seller.address}
                </div>
                {storefront.seller.phone && (
                  <p className="mt-2">Telefone: {storefront.seller.phone}</p>
                )}
              </div>
            )}
          </div>
        </div>

      </header>

      {activeView === "catalog" ? (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5a00]">
                  Produtos
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Catálogo da loja
                </h2>
              </div>
              <div className="relative w-full lg:w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8275]" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar produto"
                  className="h-11 bg-white pl-10"
                />
              </div>
            </div>

            <CategoryShowcase
              categories={categories}
              selectedParentCategory={selectedParentCategory}
              parentCategoryId={parentCategoryId}
              categoryId={categoryId}
              onSelectParent={selectParentCategory}
              onSelectCategory={selectCategory}
            />

            {filteredProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-black/15 bg-white p-10 text-center">
                <PackageCheck className="mx-auto size-10 text-[#b68735]" />
                <h3 className="mt-4 text-lg font-semibold">
                  Nenhum produto encontrado
                </h3>
                <p className="mt-2 text-sm text-[#6e675e]">
                  Ajuste a busca ou escolha outra categoria.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    slug={storefront.slug}
                    quantity={quantities[product.id] ?? 0}
                    onDecrement={() => updateQuantity(product, -1)}
                    onIncrement={() => updateQuantity(product, 1)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5a00]">
                Carrinho
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Revise e finalize
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => switchView("catalog")}
            >
              Continuar comprando
            </Button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <CheckoutStep
              icon={<ShoppingCart className="size-4" />}
              title="Produtos"
              detail={`${cartTotalQuantity} item(ns)`}
              active
            />
            <CheckoutStep
              icon={<Truck className="size-4" />}
              title="Entrega"
              detail={
                fulfillmentMethod === "DELIVERY"
                  ? "Receber no endereço"
                  : "Retirar na loja"
              }
              active={cartItems.length > 0}
            />
            <CheckoutStep
              icon={<UserRound className="size-4" />}
              title="Dados"
              detail="Pagamento direto"
              active={cartItems.length > 0}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
            <section className="space-y-5">
              <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">Seu pedido</h3>
                  <span className="text-sm text-[#6e675e]">
                    {cartDistinctCount} produto(s)
                  </span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/15 p-8 text-center">
                    <ShoppingCart className="mx-auto size-9 text-[#b68735]" />
                    <h4 className="mt-3 font-semibold">
                      Seu carrinho está vazio
                    </h4>
                    <p className="mt-2 text-sm text-[#6e675e]">
                      Adicione produtos do catálogo para continuar.
                    </p>
                    <Button
                      type="button"
                      className="mt-5 cursor-pointer"
                      onClick={() => switchView("catalog")}
                    >
                      Ver produtos
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-black/10">
                    {cartItems.map((item) => (
                      <CartLine
                        key={item.product.id}
                        product={item.product}
                        quantity={item.quantity}
                        onDecrement={() => updateQuantity(item.product, -1)}
                        onIncrement={() => updateQuantity(item.product, 1)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Truck className="size-5 text-[#c77800]" />
                  <h3 className="text-lg font-bold">Entrega ou retirada</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!canDeliver}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-4 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                      fulfillmentMethod === "DELIVERY"
                        ? "border-[#f6a000] bg-[#fff5df] text-[#7a4b00]"
                        : "border-black/10 bg-white text-[#5f5b53] hover:border-[#e6a52e]",
                    )}
                    onClick={() => setFulfillmentMethod("DELIVERY")}
                  >
                    <span>Receber</span>
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!canPickup}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-4 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                      fulfillmentMethod === "STORE_PICKUP"
                        ? "border-[#f6a000] bg-[#fff5df] text-[#7a4b00]"
                        : "border-black/10 bg-white text-[#5f5b53] hover:border-[#e6a52e]",
                    )}
                    onClick={() => setFulfillmentMethod("STORE_PICKUP")}
                  >
                    <span>Retirar</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                {fulfillmentMethod === "DELIVERY" && (
                  <div className="mt-5 space-y-2">
                    <Label htmlFor="storefront-delivery-address">
                      Endereço de entrega
                    </Label>
                    <AddressAutocomplete
                      id="storefront-delivery-address"
                      value={deliveryAddress}
                      placeholder="Digite seu endereço"
                      sessionToken={placesSessionToken}
                      selectedPlaceId={deliveryPlace?.placeId}
                      referencePoint={storefront.seller}
                      geoApi={storefrontGeoService}
                      queryKeyPrefix="storefront-geo"
                      onChange={(value) => {
                        setDeliveryAddress(value);
                        setDeliveryPlace(null);
                        setResolvedDeliveryPlace(null);
                      }}
                      onSelect={(place) => void resolveDelivery(place)}
                    />
                    {deliveryResolvePending && (
                      <p className="flex items-center gap-2 text-xs text-[#6e675e]">
                        <Loader2 className="size-3.5 animate-spin" />
                        Calculando frete...
                      </p>
                    )}
                    {deliveryDistanceMeters !== undefined && (
                      <p className="flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        {formatDistanceShort(deliveryDistanceMeters)} da loja ·
                        frete estimado {centsToBRL(estimatedDeliveryFeeCents)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="size-5 text-[#c77800]" />
                  <h3 className="text-lg font-bold">Dados do pedido</h3>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="storefront-customer-name">Nome</Label>
                    <Input
                      id="storefront-customer-name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storefront-customer-email">Email</Label>
                    <Input
                      id="storefront-customer-email"
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storefront-customer-phone">Telefone</Label>
                    <Input
                      id="storefront-customer-phone"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storefront-notes">Observações</Label>
                    <Textarea
                      id="storefront-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#f3c36c] bg-[#fffaf1] p-5 shadow-sm">
                <h3 className="text-lg font-bold">Resumo</h3>
                <p className="mt-1 text-sm text-[#6e675e]">
                  Pagamento combinado direto com a loja.
                </p>

                <div className="mt-5 space-y-2 border-t border-[#ead9bd] pt-4">
                  <PriceLine label="Produtos" value={subtotalCents} />
                  <PriceLine
                    label="Frete"
                    value={
                      fulfillmentMethod === "DELIVERY"
                        ? estimatedDeliveryFeeCents
                        : 0
                    }
                  />
                  <PriceLine label="Total" value={totalCents} strong />
                </div>

                {formError && (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                <Button
                  type="button"
                  className="mt-5 h-12 w-full cursor-pointer text-base"
                  onClick={openCheckoutDialog}
                >
                  Finalizar pedido
                </Button>
              </div>
            </aside>
          </div>
        </main>
      )}

      {cartDistinctCount > 0 && activeView === "catalog" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white p-3 shadow-2xl lg:hidden">
          <button
            type="button"
            className="flex h-12 w-full cursor-pointer items-center justify-between rounded-md bg-[#f6a000] px-4 font-bold text-black"
            onClick={() => switchView("cart")}
          >
            <span>Ver carrinho</span>
            <span>{centsToBRL(subtotalCents)}</span>
          </button>
        </div>
      )}

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar pedido?</DialogTitle>
            <DialogDescription>
              A loja receberá o pedido e o pagamento será feito direto com ela
              na entrega ou retirada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-md border border-border p-4 text-sm">
            <PriceLine label="Produtos" value={subtotalCents} />
            <PriceLine
              label="Frete"
              value={
                fulfillmentMethod === "DELIVERY"
                  ? estimatedDeliveryFeeCents
                  : 0
              }
            />
            <PriceLine label="Total" value={totalCents} strong />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCheckoutDialogOpen(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={checkoutPending}
              onClick={() => void submitCheckout()}
            >
              {checkoutPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryShowcase({
  categories,
  selectedParentCategory,
  parentCategoryId,
  categoryId,
  onSelectParent,
  onSelectCategory,
}: {
  categories: StorefrontCategoryNode[];
  selectedParentCategory: StorefrontCategoryNode | null;
  parentCategoryId: number | null;
  categoryId: number | null;
  onSelectParent: (id: number) => void;
  onSelectCategory: (id: number) => void;
}) {
  const parentCarouselRef = useRef<HTMLDivElement | null>(null);
  const childCarouselRef = useRef<HTMLDivElement | null>(null);
  const showParentControls = categories.length > 4;
  const showChildControls = (selectedParentCategory?.children.length ?? 0) > 4;

  function scrollCarousel(
    ref: React.RefObject<HTMLDivElement | null>,
    direction: -1 | 1,
  ) {
    const node = ref.current;
    if (!node) return;

    node.scrollBy({
      left: direction * Math.max(320, node.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  if (categories.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-[#ead9bd] bg-[#fffaf1] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5a00]">
            Categorias
          </p>
        </div>
        {parentCategoryId && (
          <button
            type="button"
            className="cursor-pointer rounded-full border border-[#ead9bd] bg-white px-3 py-1.5 text-xs font-bold text-[#7a4b00] transition hover:border-[#f6a000]"
            onClick={() => onSelectParent(parentCategoryId)}
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div className="relative">
        {showParentControls && (
          <CarouselArrow
            label="Categorias anteriores"
            direction="left"
            onClick={() => scrollCarousel(parentCarouselRef, -1)}
          />
        )}
        <div
          ref={parentCarouselRef}
          className={cn(
            "flex snap-x gap-4 overflow-hidden scroll-smooth pb-2",
            showParentControls && "px-11",
          )}
        >
          {categories.map((category) => (
            <ParentCategoryTile
              key={category.id}
              category={category}
              active={parentCategoryId === category.id}
              onClick={() => onSelectParent(category.id)}
            />
          ))}
        </div>
        {showParentControls && (
          <CarouselArrow
            label="Próximas categorias"
            direction="right"
            onClick={() => scrollCarousel(parentCarouselRef, 1)}
          />
        )}
      </div>

      {selectedParentCategory?.children.length ? (
        <div className="relative border-t border-[#ead9bd] pt-3">
          {showChildControls && (
            <CarouselArrow
              label="Subcategorias anteriores"
              direction="left"
              compact
              onClick={() => scrollCarousel(childCarouselRef, -1)}
            />
          )}
          <div
            ref={childCarouselRef}
            className={cn(
              "flex snap-x gap-2 overflow-hidden scroll-smooth",
              showChildControls && "px-11",
            )}
          >
            {selectedParentCategory.children.map((subcategory) => (
              <SubcategoryChip
                key={subcategory.id}
                label={subcategory.name}
                active={categoryId === subcategory.id}
                onClick={() => onSelectCategory(subcategory.id)}
              />
            ))}
          </div>
          {showChildControls && (
            <CarouselArrow
              label="Próximas subcategorias"
              direction="right"
              compact
              onClick={() => scrollCarousel(childCarouselRef, 1)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function CarouselArrow({
  label,
  direction,
  compact,
  onClick,
}: {
  label: string;
  direction: "left" | "right";
  compact?: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#ead9bd] bg-white text-[#7a4b00] shadow-md transition hover:border-[#f6a000] hover:bg-[#fff2d6]",
        compact ? "size-8" : "size-10",
        direction === "left" ? "left-0" : "right-0",
      )}
      onClick={onClick}
    >
      <Icon className={compact ? "size-4" : "size-5"} />
    </button>
  );
}

function ParentCategoryTile({
  category,
  active,
  onClick,
}: {
  category: ProductCategory;
  active: boolean;
  onClick: () => void;
}) {
  const visual = CATEGORY_VISUALS[category.slug] ?? FALLBACK_VISUAL;
  const Icon = visual.icon;

  return (
    <button
      type="button"
      className="group flex w-24 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl p-1 text-center"
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="relative flex size-16 items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 rounded-2xl border transition",
            active ? "scale-105 border-[#f6a000]" : "border-black/10",
          )}
          style={{ backgroundColor: visual.background }}
        />
        <span
          className="absolute -right-1 top-1 size-7 rounded-full opacity-20 transition group-hover:scale-110"
          style={{ backgroundColor: visual.accent }}
        />
        <span className="absolute -bottom-2 -left-2 size-9 rounded-full bg-white/70" />
        <Icon
          className={cn(
            "relative size-8 transition group-hover:scale-110",
            active && "scale-110",
          )}
          style={{ color: visual.accent }}
          strokeWidth={2.25}
        />
      </span>
      <span
        className={cn(
          "line-clamp-2 text-xs font-bold leading-4",
          active ? "text-[#8a5a00]" : "text-[#3f3a33]",
        )}
      >
        {category.name}
      </span>
    </button>
  );
}

function SubcategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-[#f6a000] bg-[#f6a000] text-black"
          : "border-black/10 bg-white text-[#5f5b53] hover:border-[#e6a52e]",
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  slug,
  quantity,
  onDecrement,
  onIncrement,
}: {
  product: StorefrontProduct;
  slug: string;
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const imageUrl = getProductImageUrl(product);
  const title = getProductTitle(product);
  const category = getProductCategory(product);
  const isOutOfStock = product.stockAmount <= 0;

  return (
    <article className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/lojas/${slug}/produto/${product.id}`}
        className="block aspect-square bg-[#eee7db]"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={640}
            height={640}
            unoptimized={
              imageUrl.includes("localhost") || imageUrl.includes("127.0.0.1")
            }
            className="size-full object-contain p-3 transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#8a8275]">
            <PackageCheck className="size-10" />
          </div>
        )}
      </Link>

      <div className="space-y-3 p-4">
        {category && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a5a00]">
            {category}
          </p>
        )}
        <Link
          href={`/lojas/${slug}/produto/${product.id}`}
          className="line-clamp-2 min-h-12 text-base font-semibold leading-6 hover:underline"
        >
          {title}
        </Link>
        <p className="text-sm text-[#6e675e]">Estoque: {product.stockAmount}</p>
        <div className="flex items-end justify-between gap-3">
          <span className="text-xl font-bold text-[#a85f00]">
            {centsToBRL(product.unitPriceCents)}
          </span>
          {quantity > 0 ? (
            <QuantityControls
              quantity={quantity}
              disabledIncrement={quantity >= product.stockAmount}
              onDecrement={onDecrement}
              onIncrement={onIncrement}
            />
          ) : (
            <button
              type="button"
              className="h-10 cursor-pointer rounded-md bg-[#f6a000] px-4 text-sm font-bold text-black transition hover:bg-[#df8f00] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isOutOfStock}
              onClick={onIncrement}
            >
              {isOutOfStock ? "Indisponível" : "Adicionar"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CartLine({
  product,
  quantity,
  onDecrement,
  onIncrement,
}: {
  product: StorefrontProduct;
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const imageUrl = getProductImageUrl(product);

  return (
    <div className="grid gap-4 py-4 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-md bg-[#eee7db]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={getProductTitle(product)}
            width={160}
            height={160}
            unoptimized={
              imageUrl.includes("localhost") || imageUrl.includes("127.0.0.1")
            }
            className="size-full object-contain p-2"
          />
        ) : (
          <PackageCheck className="size-8 text-[#8a8275]" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{getProductTitle(product)}</p>
        <p className="mt-1 text-sm text-[#6e675e]">
          {centsToBRL(product.unitPriceCents)} cada
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <QuantityControls
          quantity={quantity}
          disabledIncrement={quantity >= product.stockAmount}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
        />
        <p className="w-28 text-right font-bold">
          {centsToBRL(product.unitPriceCents * quantity)}
        </p>
      </div>
    </div>
  );
}

function QuantityControls({
  quantity,
  disabledIncrement,
  onDecrement,
  onIncrement,
}: {
  quantity: number;
  disabledIncrement: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex h-10 items-center overflow-hidden rounded-md border border-black/10 bg-white">
      <button
        type="button"
        className="flex size-10 cursor-pointer items-center justify-center hover:bg-[#f4ead8]"
        onClick={onDecrement}
      >
        <Minus className="size-4" />
      </button>
      <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
      <button
        type="button"
        className="flex size-10 cursor-pointer items-center justify-center hover:bg-[#f4ead8] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabledIncrement}
        onClick={onIncrement}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function CheckoutStep({
  icon,
  title,
  detail,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        active
          ? "border-[#f3c36c] bg-[#fffaf1]"
          : "border-black/10 bg-white text-[#6e675e]",
      )}
    >
      <div className="flex items-center gap-2 font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#fff2d6] text-[#c77800]">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-2 text-sm text-[#6e675e]">{detail}</p>
    </div>
  );
}

function PriceLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        strong && "text-base font-bold",
      )}
    >
      <span>{label}</span>
      <span>{centsToBRL(value)}</span>
    </div>
  );
}

function calculateEstimatedDeliveryFee(distanceMeters: number) {
  const distanceKm = distanceMeters / 1000;

  return Math.max(
    MINIMUM_FEE_CENTS,
    BASE_FEE_CENTS + Math.ceil(distanceKm * FEE_PER_KM_CENTS),
  );
}

function buildStorefrontCategoryTree(products: StorefrontProduct[]) {
  const parents = new Map<number, StorefrontCategoryNode>();
  const childIdsByParent = new Map<number, Set<number>>();

  for (const product of products) {
    const category = product.product?.category;
    if (!category) continue;

    const parent = category.parent ?? category;
    const existingParent = parents.get(parent.id);

    if (!existingParent) {
      parents.set(parent.id, { ...parent, children: [] });
      childIdsByParent.set(parent.id, new Set());
    }

    if (!category.parent || category.id === parent.id) {
      continue;
    }

    const childIds = childIdsByParent.get(parent.id);
    if (childIds?.has(category.id)) continue;

    parents.get(parent.id)?.children.push({ ...category, children: [] });
    childIds?.add(category.id);
  }

  return Array.from(parents.values())
    .map((parent) => ({
      ...parent,
      children: parent.children.sort(compareCategories),
    }))
    .sort(compareCategories);
}

function normalizeCategoryTree(categories: ProductCategory[]) {
  return categories
    .filter((category) => !category.parentId)
    .map((category) => ({
      ...category,
      children: (category.children ?? [])
        .map((child) => ({ ...child, children: child.children ?? [] }))
        .sort(compareCategories),
    }))
    .sort(compareCategories);
}

function compareCategories(a: ProductCategory, b: ProductCategory) {
  const sortOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (sortOrder !== 0) return sortOrder;

  return a.name.localeCompare(b.name, "pt-BR");
}

function getProductTitle(product: StorefrontProduct) {
  return product.product?.name ?? `Produto #${product.id}`;
}

function getProductCategory(product: StorefrontProduct) {
  return product.product?.category?.name ?? null;
}

function getProductImageUrl(product: StorefrontProduct) {
  const image =
    product.product?.images
      ?.toSorted((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .at(0)?.url ?? null;

  return image ? resolveMediaUrl(image) : null;
}
