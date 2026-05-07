import { api } from "./client";
import type { CreateSellerPayload } from "./sellers";
import type { Seller } from "./types";

function appendOptional(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;

  if (typeof File !== "undefined" && value instanceof File) {
    formData.append(key, value);
    return;
  }

  formData.append(key, String(value));
}

function buildSellerFormData(payload: CreateSellerPayload) {
  const formData = new FormData();

  appendOptional(formData, "name", payload.name);
  appendOptional(formData, "email", payload.email);
  appendOptional(formData, "placeId", payload.placeId);
  appendOptional(formData, "address", payload.address);
  appendOptional(formData, "cep", payload.cep);
  appendOptional(formData, "phone", payload.phone);
  appendOptional(formData, "logo", payload.logo);
  appendOptional(formData, "primaryColor", payload.primaryColor);
  appendOptional(formData, "secondaryColor", payload.secondaryColor);
  appendOptional(formData, "latitude", payload.latitude);
  appendOptional(formData, "longitude", payload.longitude);

  return formData;
}

export const sellerOnboardingService = {
  createSeller: (payload: CreateSellerPayload) =>
    api.post<Seller>(
      "/seller-onboarding/seller",
      buildSellerFormData(payload),
    ),
};
