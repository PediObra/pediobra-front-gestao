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

export function inferPublicRegionFromAddress(
  address: string | null | undefined,
) {
  const parts = (address ?? "")
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  const lastPart = parts.at(-1) ?? "";
  const cityState = parseCityState(lastPart);
  if (cityState) {
    return {
      neighborhood: parts.at(-2) ?? "",
      city: cityState.city,
      state: cityState.state,
    };
  }

  const state = parseState(lastPart);
  if (state) {
    const locality = splitNeighborhoodCity(parts.at(-2) ?? "");

    return {
      neighborhood: locality.neighborhood || parts.at(-3) || "",
      city: locality.city || parts.at(-2) || "",
      state,
    };
  }

  return emptyPublicRegion();
}

function parseCityState(value: string) {
  const match = value.trim().match(/^(.+?)[,/]\s*([A-Z]{2})(?:\b|$)/i);
  if (!match) return null;
  const state = normalizeBrazilianState(match[2]);
  if (!state) return null;

  return {
    city: match[1].trim(),
    state,
  };
}

function parseState(value: string) {
  const match = value.trim().match(/^([A-Z]{2})(?:\b|$)/i);
  return normalizeBrazilianState(match?.[1]);
}

function splitNeighborhoodCity(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { neighborhood: "", city: "" };
  }

  return {
    neighborhood: parts.slice(0, -1).join(", "),
    city: parts.at(-1) ?? "",
  };
}

function normalizeBrazilianState(value: string | undefined) {
  const state = value?.trim().toUpperCase() ?? "";
  return BRAZILIAN_STATES.has(state) ? state : "";
}

function emptyPublicRegion() {
  return { neighborhood: "", city: "", state: "" };
}

const BRAZILIAN_STATES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);
