import {
  getPublishFields,
  parseCommaList,
  slugifyBlogSlug,
} from "./blog-post-editor";

describe("blog post editor helpers", () => {
  it("slugifies Portuguese titles without accents", () => {
    expect(slugifyBlogSlug("Materiais de Construção")).toBe(
      "materiais-de-construcao",
    );
  });

  it("deduplicates comma-separated keyword input by normalized value", () => {
    expect(parseCommaList("cimento, obra, cimento,  entrega ")).toEqual([
      "cimento",
      "obra",
      "entrega",
    ]);
  });

  it("publishes immediately when no publish date is selected", () => {
    const now = new Date("2026-04-24T12:00:00.000Z");

    expect(getPublishFields("", now)).toEqual({
      status: "PUBLISHED",
      publishedAt: "2026-04-24T12:00:00.000Z",
    });
  });

  it("keeps a selected future publish date while marking the post published", () => {
    expect(
      getPublishFields("2026-05-01T09:30", new Date("2026-04-24T12:00:00Z")),
    ).toEqual({
      status: "PUBLISHED",
      publishedAt: "2026-05-01T12:30:00.000Z",
    });
  });
});
