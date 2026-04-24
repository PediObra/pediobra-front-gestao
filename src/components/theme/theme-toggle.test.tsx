import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme-provider";
import { DEFAULT_THEME, useThemeStore } from "@/lib/theme-store";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    useThemeStore.setState({ theme: DEFAULT_THEME });
  });

  it("toggles from light mode to dark mode", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ativar modo escuro" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveStyle({ colorScheme: "dark" });
    expect(
      screen.getByRole("button", { name: "Ativar modo claro" }),
    ).toBeInTheDocument();
  });

  it("toggles from dark mode to light mode", () => {
    useThemeStore.setState({ theme: "dark" });

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("dark");

    fireEvent.click(screen.getByRole("button", { name: "Ativar modo claro" }));

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveStyle({ colorScheme: "light" });
  });
});
