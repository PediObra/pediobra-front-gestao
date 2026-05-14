import { renderToString } from "react-dom/server";
import { PreferencesControls } from "@/components/preferences/preferences-controls";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme/provider";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

describe("PreferencesControls", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders from provider initial values before reading browser preferences", () => {
    window.localStorage.setItem("obraflow-theme", "dark");
    window.localStorage.setItem("obraflow-locale", "en-US");

    const markup = renderToString(
      <ThemeProvider initialTheme="system">
        <I18nProvider initialLocale="pt-BR">
          <PreferencesControls />
        </I18nProvider>
      </ThemeProvider>,
    );

    expect(markup).toContain('aria-label="Tema"');
    expect(markup).toContain("lucide-monitor");
    expect(markup).not.toContain('aria-label="Theme"');
    expect(markup).not.toContain("lucide-moon");
  });
});
