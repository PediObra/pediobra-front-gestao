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

    expect(within(nav).getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(nav).getByRole("link", { name: /Pedidos/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Operação/ })).toHaveAttribute(
      "href",
      "/operations",
    );
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
    mockUsePathname.mockReturnValue("/operations");

    render(<Sidebar />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação principal",
    });

    expect(within(nav).getByRole("link", { name: /Operação/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Pedidos/ })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Motoristas/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Usuários/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Pagamentos/ })).toBeNull();
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
