import { cookies } from "next/headers";

export type Locale = "pt-BR" | "en-US";
const LOCALE_COOKIE = "pediobra-locale";

const publicBlogCopy = {
  "pt-BR": {
    brand: "PediObra Blog",
    backToSite: "Voltar ao PediObra",
    heroEyebrow: "Guias para comprar melhor e tocar obra sem desperdício",
    heroTitle: "Blog PediObra",
    heroDescription:
      "Conteúdo prático sobre materiais de construção, entrega, orçamento, planejamento de obra e decisões de compra para quem quer construir com menos atraso e mais clareza.",
    articlesStat: "Artigos",
    focusStat: "Foco",
    focusValue: "Obra",
    languageStat: "Idioma",
    languageValue: "PT-BR",
    featured: "Artigo em destaque",
    readNow: "Ler agora",
    comingSoon: "Em breve",
    comingSoonTitle: "Novos guias de obra estão sendo preparados.",
    recentEyebrow: "Biblioteca de obra",
    recentTitle: "Artigos recentes",
    discoveryTitle: "Encontre guias por assunto",
    discoveryDescription:
      "Busque por materiais, orçamento, entrega ou planejamento e filtre por temas do blog.",
    searchPlaceholder: "Buscar no blog...",
    searchButton: "Buscar",
    clearFilters: "Limpar filtros",
    topicsTitle: "Assuntos populares",
    allTopics: "Todos",
    resultsFor: "Resultados para \"{search}\"",
    taggedWith: "Marcados com \"{tag}\"",
    emptyList: "Nenhum artigo publicado por enquanto.",
    previousPage: "Página anterior",
    nextPage: "Próxima página",
    pageOf: "Página {page} de {totalPages}",
    readMinutes: "{minutes} min de leitura",
    backToBlog: "Voltar ao blog",
    blog: "Blog",
    detailsTitle: "Detalhes do artigo",
    publishedBy: "Publicado por",
    updated: "Atualizado",
    reading: "Leitura",
    minutes: "{minutes} minutos",
    continueEyebrow: "Continue lendo",
    continueTitle: "Mais guias para sua obra",
    allArticles: "Todos os artigos",
  },
  "en-US": {
    brand: "PediObra Blog",
    backToSite: "Back to PediObra",
    heroEyebrow: "Guides to buy better and run jobs with less waste",
    heroTitle: "PediObra Blog",
    heroDescription:
      "Practical content about building materials, delivery, budgeting, job planning, and purchase decisions for teams that want fewer delays and clearer execution.",
    articlesStat: "Articles",
    focusStat: "Focus",
    focusValue: "Construction",
    languageStat: "Language",
    languageValue: "EN-US",
    featured: "Featured article",
    readNow: "Read now",
    comingSoon: "Coming soon",
    comingSoonTitle: "New construction guides are being prepared.",
    recentEyebrow: "Construction library",
    recentTitle: "Recent articles",
    discoveryTitle: "Find guides by topic",
    discoveryDescription:
      "Search for materials, budgeting, delivery, or planning and filter by blog topics.",
    searchPlaceholder: "Search the blog...",
    searchButton: "Search",
    clearFilters: "Clear filters",
    topicsTitle: "Popular topics",
    allTopics: "All",
    resultsFor: "Results for \"{search}\"",
    taggedWith: "Tagged with \"{tag}\"",
    emptyList: "No published articles yet.",
    previousPage: "Previous page",
    nextPage: "Next page",
    pageOf: "Page {page} of {totalPages}",
    readMinutes: "{minutes} min read",
    backToBlog: "Back to blog",
    blog: "Blog",
    detailsTitle: "Article details",
    publishedBy: "Published by",
    updated: "Updated",
    reading: "Reading",
    minutes: "{minutes} minutes",
    continueEyebrow: "Keep reading",
    continueTitle: "More guides for your jobsite",
    allArticles: "All articles",
  },
} as const;

export type PublicBlogCopy = Record<
  keyof (typeof publicBlogCopy)["pt-BR"],
  string
>;

export const DEFAULT_PUBLIC_BLOG_COPY: PublicBlogCopy = publicBlogCopy["pt-BR"];

export function getPublicBlogCopy(locale: Locale): PublicBlogCopy {
  return publicBlogCopy[locale];
}

export async function getPublicBlogLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;

  return locale === "en-US" ? "en-US" : "pt-BR";
}

export function publicBlogText(
  value: string,
  replacements: Record<string, string | number>,
) {
  return value.replace(/\{(\w+)\}/g, (match, key) =>
    replacements[key] === undefined ? match : String(replacements[key]),
  );
}
