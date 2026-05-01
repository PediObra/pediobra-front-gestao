import { api } from "./client";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string | null;
}

export interface ResolvedPlace {
  placeId: string;
  formattedAddress: string;
  latitude: string;
  longitude: string;
  cep?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export const geoService = {
  autocomplete: (query: string, sessionToken: string) =>
    api.get<PlaceSuggestion[]>("/geo/places/autocomplete", {
      query: { query, sessionToken },
    }),

  resolve: (placeId: string, sessionToken: string) =>
    api.get<ResolvedPlace>("/geo/places/resolve", {
      query: { placeId, sessionToken },
    }),
};
