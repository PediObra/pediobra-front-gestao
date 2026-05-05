import { inferPublicRegionFromAddress } from "./used-listings";

describe("inferPublicRegionFromAddress", () => {
  it("extracts neighborhood, city and state from seller-style addresses", () => {
    expect(
      inferPublicRegionFromAddress(
        "Estrada Doutor Rafael Elias Jose Aun, 300 - Vila Avai - Indaiatuba/SP",
      ),
    ).toEqual({
      neighborhood: "Vila Avai",
      city: "Indaiatuba",
      state: "SP",
    });
  });

  it("extracts public region from Google-style addresses with state and CEP", () => {
    expect(
      inferPublicRegionFromAddress(
        "Av. Alberto Santos Dumont - Sao Jose, Formoso do Araguaia - TO, 77470-000",
      ),
    ).toEqual({
      neighborhood: "Sao Jose",
      city: "Formoso do Araguaia",
      state: "TO",
    });
  });

  it("returns empty fields when address is empty", () => {
    expect(inferPublicRegionFromAddress("")).toEqual({
      neighborhood: "",
      city: "",
      state: "",
    });
  });

  it("does not treat free typed text as public state", () => {
    expect(inferPublicRegionFromAddress("asdas")).toEqual({
      neighborhood: "",
      city: "",
      state: "",
    });
  });

  it("does not infer public region without a valid Brazilian state", () => {
    expect(inferPublicRegionFromAddress("Rua A - Bairro B - Cidade C")).toEqual(
      {
        neighborhood: "",
        city: "",
        state: "",
      },
    );
  });
});
