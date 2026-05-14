import { fireEvent, render, screen, within } from "@testing-library/react";
import { MobileSidebar, Sidebar } from "./sidebar";

const mockUsePathname = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("MobileSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUsePathname.mockReturnValue("/orders");
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isSeller: false,
    });
  });

  it("opens the primary navigation from the mobile menu button", () => {
    render(<MobileSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menu de navegação" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Menu de navegação" });
    const nav = within(dialog).getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(within(nav).getByRole("link", { name: /Operação/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(nav).getByRole("link", { name: /Produtos/ })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(
      within(nav).getByRole("link", { name: /Importações pendentes/ }),
    ).toHaveAttribute("href", "/seller-product-imports/product-review");
    expect(within(nav).getByRole("link", { name: /Blog/ })).toHaveAttribute(
      "href",
      "/blog-posts",
    );
    expect(within(nav).getByRole("link", { name: /Pedidos/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).queryByRole("link", { name: /Dashboard/ })).toBeNull();
  });

  it("closes the drawer after choosing a navigation link", () => {
    render(<MobileSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menu de navegação" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /Produtos/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows operation links for sellers without admin-only links", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isSeller: true,
    });
    mockUsePathname.mockReturnValue("/dashboard");

    render(<Sidebar />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(within(nav).getByRole("link", { name: /Operação/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Operação/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(nav).getByRole("link", { name: /Produtos/ })).toHaveAttribute(
      "href",
      "/seller-products",
    );
    expect(within(nav).getByRole("link", { name: /Pedidos/ })).toBeInTheDocument();
    expect(nav.querySelector('a[href="/operations"]')).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Motoristas/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Usuários/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Pagamentos/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Blog/ })).toBeNull();
    expect(
      within(nav).queryByRole("link", { name: /Importações pendentes/ }),
    ).toBeNull();
  });

  it("highlights the admin import review entry over the products prefix", () => {
    mockUsePathname.mockReturnValue("/seller-product-imports/product-review");

    render(<Sidebar />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(
      within(nav).getByRole("link", { name: /Importações pendentes/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: /Produtos/ }),
    ).not.toHaveAttribute("aria-current");
  });

  it("toggles the desktop sidebar collapsed state", () => {
    render(<Sidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Recolher navegação" }),
    );

    expect(
      screen.getByRole("button", { name: "Expandir navegação" }),
    ).toBeInTheDocument();
    expect(
      window.localStorage.getItem("pediobra:sidebar-collapsed"),
    ).toBe("true");
  });
});
