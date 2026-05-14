import { hasBlogPostCta, isValidBlogCtaHref } from "./blog-cta";

describe("blog CTA helpers", () => {
  it("requires a title, button text, and href before rendering a CTA", () => {
    expect(
      hasBlogPostCta({
        ctaTitle: "Pronto para comprar melhor?",
        ctaButtonText: "Abrir orçamento",
        ctaHref: "/orcamento",
      }),
    ).toBe(true);

    expect(
      hasBlogPostCta({
        ctaTitle: "Pronto para comprar melhor?",
        ctaButtonText: "Abrir orçamento",
        ctaHref: "",
      }),
    ).toBe(false);
  });

  it("accepts public URLs, internal paths, mail, and phone CTA hrefs", () => {
    expect(isValidBlogCtaHref("https://instagram.com/obraflow")).toBe(true);
    expect(isValidBlogCtaHref("/blog/materiais")).toBe(true);
    expect(isValidBlogCtaHref("mailto:contato@obraflow.com")).toBe(true);
    expect(isValidBlogCtaHref("tel:+5511999999999")).toBe(true);
    expect(isValidBlogCtaHref("javascript:alert(1)")).toBe(false);
    expect(isValidBlogCtaHref("//evil.test")).toBe(false);
  });
});
