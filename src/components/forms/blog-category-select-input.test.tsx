import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ProductCategory } from "@/lib/api/types";
import { BlogCategorySelectInput } from "./blog-category-select-input";

const categories: ProductCategory[] = [
  {
    id: 1,
    name: "Materiais",
    slug: "materiais",
    children: [
      {
        id: 2,
        parentId: 1,
        name: "Cimento",
        slug: "cimento",
      },
    ],
  },
  {
    id: 3,
    name: "Ferramentas",
    slug: "ferramentas",
    children: [],
  },
];

function Harness() {
  const [value, setValue] = useState("");

  return (
    <div>
      <label htmlFor="blog-tags">Categorias</label>
      <BlogCategorySelectInput
        id="blog-tags"
        value={value}
        categories={categories}
        onChange={setValue}
        placeholder="Selecionar categoria"
        emptyLabel="Nenhuma categoria adicionada."
        removeLabel="Remover"
        noOptionsLabel="Nenhuma categoria cadastrada."
      />
    </div>
  );
}

describe("BlogCategorySelectInput", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: jest.fn(),
    });
  });

  it("adds a category from the catalog select", async () => {
    render(<Harness />);

    openCategorySelect();
    fireEvent.click(await screen.findByRole("option", { name: "Cimento" }));

    expect(screen.getByText("Cimento")).toBeInTheDocument();
  });

  it("removes a selected category", async () => {
    render(<Harness />);

    openCategorySelect();
    fireEvent.click(await screen.findByRole("option", { name: "Cimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover: Cimento" }));

    expect(screen.queryByText("Cimento")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhuma categoria adicionada.")).toBeInTheDocument();
  });
});

function openCategorySelect() {
  fireEvent.click(screen.getByRole("combobox", { name: "Categorias" }));
}
