import { normalizePublicBlogSlugs } from "./public-blog-cache";

describe("public blog cache helpers", () => {
  it("normalizes unique blog slugs", () => {
    expect(
      normalizePublicBlogSlugs([
        " Materiais-De-Construcao ",
        "materiais-de-construcao",
        "planejamento-de-obra",
      ]),
    ).toEqual(["materiais-de-construcao", "planejamento-de-obra"]);
  });

  it("rejects values that are not safe blog slugs", () => {
    expect(
      normalizePublicBlogSlugs([
        "",
        null,
        "/blog/materiais",
        "../materiais",
        "materiais?preview=1",
        "materiais_de_construcao",
      ]),
    ).toEqual([]);
  });
});
