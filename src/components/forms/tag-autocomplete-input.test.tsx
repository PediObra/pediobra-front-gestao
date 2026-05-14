import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TagAutocompleteInput } from "./tag-autocomplete-input";

function Harness() {
  const [value, setValue] = useState("");

  return (
    <TagAutocompleteInput
      id="blog-tags"
      value={value}
      suggestions={["Materiais", "Orçamento"]}
      onChange={setValue}
      placeholder="Buscar categoria"
      ariaLabel="Categorias"
      addLabel="Adicionar"
      removeLabel="Remover"
      emptyLabel="Nenhuma categoria adicionada."
      createLabel="Criar categoria"
      suggestionsLabel="Categorias existentes"
      noSuggestionsLabel="Nenhuma categoria encontrada."
    />
  );
}

describe("TagAutocompleteInput", () => {
  it("selects an existing category from autocomplete suggestions", () => {
    render(<Harness />);

    const input = screen.getByRole("combobox", { name: "Categorias" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "mat" } });
    fireEvent.click(screen.getByRole("option", { name: "Materiais" }));

    expect(screen.getByText("Materiais")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("creates a new category when the typed value has no exact match", () => {
    render(<Harness />);

    const input = screen.getByRole("combobox", { name: "Categorias" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Logistica" } });
    fireEvent.click(
      screen.getByRole("option", { name: "Criar categoria Logistica" }),
    );

    expect(screen.getByText("Logistica")).toBeInTheDocument();
  });
});
