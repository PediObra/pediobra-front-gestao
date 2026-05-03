import type {
  UsedListing,
  UsedListingCondition,
  UsedListingStatus,
} from "@/lib/api/types";

export const USED_LISTING_CONDITION_LABEL: Record<UsedListingCondition, string> =
  {
    USED: "Usado",
    SURPLUS: "Sobra",
    OPEN_BOX: "Aberto",
    PARTIAL: "Parcial",
    EXCESS_LOT: "Lote excedente",
    USED_TOOL: "Ferramenta usada",
    OTHER: "Outro",
  };

export const USED_LISTING_STATUS_LABEL: Record<UsedListingStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  REJECTED: "Rejeitado",
};

export function usedListingRegion(listing: Pick<
  UsedListing,
  "publicNeighborhood" | "publicCity" | "publicState"
>) {
  const cityState = [listing.publicCity, listing.publicState]
    .filter(Boolean)
    .join(" - ");
  return [listing.publicNeighborhood, cityState].filter(Boolean).join(", ");
}

export function usedListingQuantity(listing: Pick<
  UsedListing,
  "quantity" | "unit" | "remainingAmountDescription"
>) {
  if (listing.remainingAmountDescription) {
    return listing.remainingAmountDescription;
  }

  if (listing.quantity && listing.unit) {
    return `${listing.quantity} ${listing.unit}`;
  }

  if (listing.quantity) {
    return String(listing.quantity);
  }

  return "Quantidade a combinar";
}
