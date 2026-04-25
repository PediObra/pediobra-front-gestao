import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "@/lib/i18n";
import { MobileSidebar } from "./sidebar";

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
    mockUsePathname.mockReturnValue("/orders");
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isSeller: false,
    });
  });

  it("opens the primary navigation from the mobile menu button", () => {
    renderWithProviders(<MobileSidebar />);

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
  });

  it("closes the drawer after choosing a navigation link", () => {
    renderWithProviders(<MobileSidebar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menu de navegação" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /Produtos/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

function renderWithProviders(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}
