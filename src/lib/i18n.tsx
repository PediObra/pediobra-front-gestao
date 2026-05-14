"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LOCALE_PREFERENCE_KEY,
  parseLocale,
  PREFERENCE_MAX_AGE_SECONDS,
  type Locale,
} from "@/lib/preferences";
import {
  useLanguageStore,
  type SupportedLanguage,
} from "@/lib/i18n/language-store";

export type { Locale } from "@/lib/preferences";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const dictionaries: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "common.cancel": "Cancelar",
    "common.create": "Criar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.loading": "Carregando…",
    "common.save": "Salvar",
    "common.search": "Buscar",
    "common.view": "Ver",
    "common.back": "Voltar",
    "common.active": "Ativo",
    "common.actions": "Ações",
    "common.add": "Adicionar",
    "common.optional": "opcional",
    "common.none": "Nenhum",
    "common.remove": "Remover",
    "common.preview": "Prévia",
    "common.upload": "Enviar imagem",
    "common.select": "Selecionar",
    "auth.adminOnly.title": "Acesso restrito ao master admin",
    "auth.adminOnly.description":
      "A gestão do blog está disponível apenas para usuários com perfil ADMIN.",
    "auth.adminOnly.action": "Voltar ao painel",
    "theme.light": "Claro",
    "theme.dark": "Escuro",
    "theme.system": "Sistema",
    "theme.label": "Tema",
    "locale.label": "Idioma",
    "locale.pt-BR": "Português",
    "locale.en-US": "English",
    "nav.blog": "Blog",
    "blog.public.brand": "ObraFlow Blog",
    "blog.public.backToSite": "Voltar ao ObraFlow",
    "blog.public.controls": "Preferências do blog",
    "blog.public.language": "Idioma",
    "blog.public.theme": "Tema",
    "blogCms.list.title": "Blog",
    "blogCms.list.description":
      "Crie, publique e otimize artigos para tráfego orgânico.",
    "blogCms.list.new": "Novo artigo",
    "blogCms.list.searchPlaceholder": "Buscar por título, slug ou conteúdo…",
    "blogCms.list.tagPlaceholder": "Filtrar por categoria…",
    "blogCms.list.allStatuses": "Todos os status",
    "blogCms.list.empty": "Nenhum artigo encontrado.",
    "blogCms.list.bulkDelete": "Excluir selecionados",
    "blogCms.list.bulkConfirmTitle": "Excluir artigos selecionados?",
    "blogCms.list.bulkConfirmDescription":
      "Essa ação arquiva os artigos selecionados e remove eles das listagens públicas.",
    "blogCms.table.post": "Artigo",
    "blogCms.table.status": "Status",
    "blogCms.table.tags": "Categorias",
    "blogCms.table.updated": "Atualizado",
    "blogCms.table.selected": "{count} selecionado(s)",
    "blogCms.new.title": "Novo artigo",
    "blogCms.new.description":
      "Publique conteúdo indexável para SEO com imagens, tags e metadados.",
    "blogCms.edit.fallbackTitle": "Editar artigo",
    "blogCms.edit.description": "Ajuste conteúdo, mídia, status e SEO.",
    "blogCms.form.content": "Conteúdo",
    "blogCms.form.cta": "Chamada de ação",
    "blogCms.form.ctaDescription":
      "Configure o bloco que aparece sempre no fim do artigo para levar o leitor ao próximo passo.",
    "blogCms.form.ctaTitle": "Título do CTA",
    "blogCms.form.ctaTitlePlaceholder": "Pronto para começar sua obra?",
    "blogCms.form.ctaDescriptionLabel": "Descrição do CTA",
    "blogCms.form.ctaDescriptionPlaceholder":
      "Explique rapidamente por que o leitor deve clicar.",
    "blogCms.form.ctaButtonText": "Texto do botão",
    "blogCms.form.ctaButtonPlaceholder": "Falar com a ObraFlow",
    "blogCms.form.ctaHref": "Link do botão",
    "blogCms.form.ctaHrefPlaceholder": "https://instagram.com/obraflow",
    "blogCms.form.ctaHrefHelp":
      "Use um link externo com https://, um caminho interno como /blog, mailto: ou tel:.",
    "blogCms.form.ctaOpenInNewTab": "Abrir em nova aba",
    "blogCms.form.ctaOpenInNewTabHelp":
      "Recomendado para Instagram, WhatsApp e links externos.",
    "blogCms.form.ctaOptionalHelp":
      "Opcional. Preencha título, botão e link para ativar o CTA no fim do artigo.",
    "blogCms.form.ctaPreviewEyebrow": "Prévia do CTA",
    "blogCms.form.ctaPreviewTitle": "Sua chamada aparece aqui",
    "blogCms.form.ctaPreviewDescription":
      "A descrição ajuda a dar contexto antes do clique.",
    "blogCms.form.ctaPreviewButton": "Texto do botão",
    "blogCms.form.main": "Informações principais",
    "blogCms.form.mainDescription":
      "Título, URL, resumo e conteúdo que aparecem no blog.",
    "blogCms.form.title": "Título",
    "blogCms.form.slug": "Slug",
    "blogCms.form.slugHelp":
      "Deixe em branco para o backend gerar a partir do título.",
    "blogCms.form.excerpt": "Resumo",
    "blogCms.form.excerptPlaceholder":
      "Resumo curto para listagens, SEO e compartilhamento.",
    "blogCms.form.status": "Status",
    "blogCms.form.publishedAt": "Data de publicação",
    "blogCms.form.publishedAtHelp":
      "Opcional. Sem data, o artigo é publicado imediatamente. Datas futuras ficam ocultas no blog até chegar o horário.",
    "blogCms.form.publishNow": "Publicar agora",
    "blogCms.form.publishDate": "Data",
    "blogCms.form.publishTime": "Hora",
    "blogCms.form.clearPublishDate": "Limpar data",
    "blogCms.form.useNow": "Usar agora",
    "blogCms.form.tags": "Categorias",
    "blogCms.form.tagsPlaceholder": "Selecionar categoria",
    "blogCms.form.tagsHelp":
      "Selecione uma ou mais categorias do catálogo cadastrado.",
    "blogCms.form.noCategories": "Nenhuma categoria adicionada.",
    "blogCms.form.createCategory": "Criar categoria",
    "blogCms.form.categorySuggestions": "Categorias do catálogo",
    "blogCms.form.noCategorySuggestions": "Nenhuma categoria cadastrada.",
    "blogCms.form.loadingCategories": "Carregando categorias…",
    "blogCms.form.readingTime": "Tempo de leitura (minutos)",
    "blogCms.form.readingTimeHelp":
      "Opcional. Se vazio, o servidor calcula pelo conteúdo.",
    "blogCms.form.readingTimePlaceholder": "Ex.: 5",
    "blogCms.form.coverImages": "Imagem do post (obrigatória)",
    "blogCms.form.coverImagesDescription":
      "Envie a capa do artigo. A primeira imagem vira capa por padrão.",
    "blogCms.form.clearImages": "Remover imagens atuais",
    "blogCms.form.imageRequired": "Adicione uma imagem de capa para o post.",
    "blogCms.form.imageRequiredEmpty": "Nenhuma capa adicionada.",
    "blogCms.form.imageSpecsTitle": "Especificação recomendada",
    "blogCms.form.imageSpecsResolutionLabel": "Resolução",
    "blogCms.form.imageSpecsResolutionValue": "1600 × 1000 px ideal",
    "blogCms.form.imageSpecsRatioLabel": "Proporção",
    "blogCms.form.imageSpecsRatioValue": "16:10, mínimo 1200 × 750 px",
    "blogCms.form.imageSpecsFormatsLabel": "Formatos",
    "blogCms.form.imageSpecsFormatsValue": "JPG, PNG, WEBP, AVIF ou GIF",
    "blogCms.form.imageSpecsSizeLabel": "Tamanho",
    "blogCms.form.imageSpecsSizeValue": "Até 10 MB",
    "blogCms.form.imageSpecsHelp":
      "Use imagem nítida, horizontal e sem texto pequeno. Ela aparece nas listagens, no topo do artigo e em compartilhamentos.",
    "blogCms.form.imageAlt": "Texto alternativo",
    "blogCms.form.imageCaption": "Legenda",
    "blogCms.form.imageCover": "Capa",
    "blogCms.form.addImage": "Adicionar imagem",
    "blogCms.form.seo": "SEO",
    "blogCms.form.seoDescription":
      "Metadados usados nas páginas, Open Graph, Twitter cards e sitemap.",
    "blogCms.form.seoTitle": "Título SEO",
    "blogCms.form.seoMetaDescription": "Descrição SEO",
    "blogCms.form.seoKeywords": "Palavras-chave",
    "blogCms.form.seoKeywordsPlaceholder":
      "Digite uma palavra e pressione Enter",
    "blogCms.form.noSeoKeywords": "Nenhuma palavra-chave adicionada.",
    "blogCms.form.canonicalUrl": "URL canônica",
    "blogCms.form.saveDraft": "Salvar rascunho",
    "blogCms.form.publish": "Publicar",
    "blogCms.form.update": "Salvar alterações",
    "blogCms.form.viewPublic": "Ver no blog",
    "blogCms.form.deleteTitle": "Excluir artigo?",
    "blogCms.form.deleteDescription":
      "O artigo será arquivado e deixará de aparecer para leitores.",
    "blogCms.form.editorPlaceholder":
      "Escreva o artigo aqui. Use subtítulos, listas, citações e imagens para facilitar a leitura.",
    "blogCms.preview.tabsLabel": "Modo do editor",
    "blogCms.preview.editTab": "Editar",
    "blogCms.preview.previewTab": "Preview blog",
    "blogCms.preview.helper":
      "Alterne para conferir a página pública antes de publicar.",
    "blogCms.preview.mode": "Modo preview",
    "blogCms.preview.exit": "Sair do preview",
    "blogCms.preview.untitled": "Título do artigo",
    "blogCms.preview.emptyContent": "O conteúdo do artigo aparecerá aqui.",
    "blogCms.preview.emptyDescription": "A descrição do artigo aparecerá aqui.",
    "blogCms.preview.backToBlog": "Voltar ao blog",
    "blogCms.preview.breadcrumb": "Caminho do artigo",
    "blogCms.preview.blog": "Blog",
    "blogCms.preview.publishNow": "Publicar agora",
    "blogCms.preview.readMinutes": "{minutes} min de leitura",
    "blogCms.preview.details": "Detalhes do artigo",
    "blogCms.preview.publishedBy": "Publicado por",
    "blogCms.preview.reading": "Leitura",
    "blogCms.preview.minutes": "{minutes} minutos",
    "blogCms.preview.ctaEyebrow": "Próximo passo",
    "blogCms.preview.ctaSupport": "Continue com uma ação prática",
    "blogCms.editor.paragraph": "Parágrafo",
    "blogCms.editor.heading2": "Título H2",
    "blogCms.editor.heading3": "Título H3",
    "blogCms.editor.bold": "Negrito",
    "blogCms.editor.italic": "Itálico",
    "blogCms.editor.bulletList": "Lista",
    "blogCms.editor.orderedList": "Lista numerada",
    "blogCms.editor.quote": "Citação",
    "blogCms.editor.link": "Link",
    "blogCms.editor.toolbar": "Ferramentas do editor",
    "blogCms.editor.linkTitle": "Adicionar link",
    "blogCms.editor.linkDescription":
      "Cole a URL que será aplicada ao texto selecionado.",
    "blogCms.editor.linkUrl": "URL do link",
    "blogCms.editor.applyLink": "Aplicar link",
    "blogCms.editor.removeLink": "Remover link",
    "blogCms.editor.image": "Imagem",
    "blogCms.editor.imageAltTitle": "Texto alternativo da imagem",
    "blogCms.editor.imageAltDescription":
      "Descreva brevemente a imagem para acessibilidade e SEO antes de inserir no conteúdo.",
    "blogCms.editor.insertImage": "Inserir imagem",
    "blogCms.editor.undo": "Desfazer",
    "blogCms.editor.redo": "Refazer",
    "blogCms.toast.created": "Artigo criado",
    "blogCms.toast.updated": "Artigo atualizado",
    "blogCms.toast.deleted": "Artigo excluído",
    "blogCms.toast.bulkDeleted": "{count} artigo(s) excluído(s)",
    "blogCms.toast.imageUploaded": "Imagem enviada",
    "blogCms.error.create": "Não foi possível criar o artigo",
    "blogCms.error.update": "Não foi possível salvar o artigo",
    "blogCms.error.delete": "Não foi possível excluir",
    "blogCms.error.imageUpload": "Não foi possível enviar a imagem",
    "blogCms.status.DRAFT": "Rascunho",
    "blogCms.status.PUBLISHED": "Publicado",
    "blogCms.status.SCHEDULED": "Agendado",
    "blogCms.status.ARCHIVED": "Arquivado",
  },
  "en-US": {
    "common.cancel": "Cancel",
    "common.create": "Create",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.search": "Search",
    "common.view": "View",
    "common.back": "Back",
    "common.active": "Active",
    "common.actions": "Actions",
    "common.add": "Add",
    "common.optional": "optional",
    "common.none": "None",
    "common.remove": "Remove",
    "common.preview": "Preview",
    "common.upload": "Upload image",
    "common.select": "Select",
    "auth.adminOnly.title": "Master admin only",
    "auth.adminOnly.description":
      "Blog management is available only to users with the ADMIN role.",
    "auth.adminOnly.action": "Back to dashboard",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
    "theme.label": "Theme",
    "locale.label": "Language",
    "locale.pt-BR": "Portuguese",
    "locale.en-US": "English",
    "nav.blog": "Blog",
    "blog.public.brand": "ObraFlow Blog",
    "blog.public.backToSite": "Back to ObraFlow",
    "blog.public.controls": "Blog preferences",
    "blog.public.language": "Language",
    "blog.public.theme": "Theme",
    "blogCms.list.title": "Blog",
    "blogCms.list.description":
      "Create, publish, and optimize articles for organic traffic.",
    "blogCms.list.new": "New article",
    "blogCms.list.searchPlaceholder": "Search by title, slug, or content…",
    "blogCms.list.tagPlaceholder": "Filter by category…",
    "blogCms.list.allStatuses": "All statuses",
    "blogCms.list.empty": "No articles found.",
    "blogCms.list.bulkDelete": "Delete selected",
    "blogCms.list.bulkConfirmTitle": "Delete selected articles?",
    "blogCms.list.bulkConfirmDescription":
      "This archives the selected articles and removes them from public lists.",
    "blogCms.table.post": "Article",
    "blogCms.table.status": "Status",
    "blogCms.table.tags": "Categories",
    "blogCms.table.updated": "Updated",
    "blogCms.table.selected": "{count} selected",
    "blogCms.new.title": "New article",
    "blogCms.new.description":
      "Publish indexable SEO content with images, tags, and metadata.",
    "blogCms.edit.fallbackTitle": "Edit article",
    "blogCms.edit.description": "Adjust content, media, status, and SEO.",
    "blogCms.form.content": "Content",
    "blogCms.form.cta": "Call to action",
    "blogCms.form.ctaDescription":
      "Configure the block that always appears at the end of the article to send readers to the next step.",
    "blogCms.form.ctaTitle": "CTA title",
    "blogCms.form.ctaTitlePlaceholder": "Ready to start your project?",
    "blogCms.form.ctaDescriptionLabel": "CTA description",
    "blogCms.form.ctaDescriptionPlaceholder":
      "Briefly explain why the reader should click.",
    "blogCms.form.ctaButtonText": "Button text",
    "blogCms.form.ctaButtonPlaceholder": "Contact ObraFlow",
    "blogCms.form.ctaHref": "Button link",
    "blogCms.form.ctaHrefPlaceholder": "https://instagram.com/obraflow",
    "blogCms.form.ctaHrefHelp":
      "Use an external https:// link, an internal path like /blog, mailto:, or tel:.",
    "blogCms.form.ctaOpenInNewTab": "Open in a new tab",
    "blogCms.form.ctaOpenInNewTabHelp":
      "Recommended for Instagram, WhatsApp, and external links.",
    "blogCms.form.ctaOptionalHelp":
      "Optional. Fill title, button, and link to activate the CTA at the end of the article.",
    "blogCms.form.ctaPreviewEyebrow": "CTA preview",
    "blogCms.form.ctaPreviewTitle": "Your callout appears here",
    "blogCms.form.ctaPreviewDescription":
      "The description gives context before the click.",
    "blogCms.form.ctaPreviewButton": "Button text",
    "blogCms.form.main": "Main information",
    "blogCms.form.mainDescription":
      "Title, URL, summary, and content shown on the blog.",
    "blogCms.form.title": "Title",
    "blogCms.form.slug": "Slug",
    "blogCms.form.slugHelp": "Leave blank for the backend to generate it.",
    "blogCms.form.excerpt": "Excerpt",
    "blogCms.form.excerptPlaceholder":
      "Short summary for lists, SEO, and sharing.",
    "blogCms.form.status": "Status",
    "blogCms.form.publishedAt": "Publish date",
    "blogCms.form.publishedAtHelp":
      "Optional. Without a date, the article publishes immediately. Future dates stay hidden from the blog until that time.",
    "blogCms.form.publishNow": "Publish now",
    "blogCms.form.publishDate": "Date",
    "blogCms.form.publishTime": "Time",
    "blogCms.form.clearPublishDate": "Clear date",
    "blogCms.form.useNow": "Use now",
    "blogCms.form.tags": "Categories",
    "blogCms.form.tagsPlaceholder": "Select category",
    "blogCms.form.tagsHelp":
      "Select one or more categories from the registered catalog.",
    "blogCms.form.noCategories": "No categories added.",
    "blogCms.form.createCategory": "Create category",
    "blogCms.form.categorySuggestions": "Catalog categories",
    "blogCms.form.noCategorySuggestions": "No categories registered.",
    "blogCms.form.loadingCategories": "Loading categories…",
    "blogCms.form.readingTime": "Reading time (minutes)",
    "blogCms.form.readingTimeHelp":
      "Optional. If empty, the server calculates it from the content.",
    "blogCms.form.readingTimePlaceholder": "E.g. 5",
    "blogCms.form.coverImages": "Post image (required)",
    "blogCms.form.coverImagesDescription":
      "Upload the article cover. The first image becomes the cover by default.",
    "blogCms.form.clearImages": "Remove current images",
    "blogCms.form.imageRequired": "Add a cover image for the post.",
    "blogCms.form.imageRequiredEmpty": "No cover added.",
    "blogCms.form.imageSpecsTitle": "Recommended specification",
    "blogCms.form.imageSpecsResolutionLabel": "Resolution",
    "blogCms.form.imageSpecsResolutionValue": "1600 × 1000 px ideal",
    "blogCms.form.imageSpecsRatioLabel": "Ratio",
    "blogCms.form.imageSpecsRatioValue": "16:10, minimum 1200 × 750 px",
    "blogCms.form.imageSpecsFormatsLabel": "Formats",
    "blogCms.form.imageSpecsFormatsValue": "JPG, PNG, WEBP, AVIF, or GIF",
    "blogCms.form.imageSpecsSizeLabel": "Size",
    "blogCms.form.imageSpecsSizeValue": "Up to 10 MB",
    "blogCms.form.imageSpecsHelp":
      "Use a sharp horizontal image without tiny text. It appears in lists, at the top of the article, and in shares.",
    "blogCms.form.imageAlt": "Alt text",
    "blogCms.form.imageCaption": "Caption",
    "blogCms.form.imageCover": "Cover",
    "blogCms.form.addImage": "Add image",
    "blogCms.form.seo": "SEO",
    "blogCms.form.seoDescription":
      "Metadata used in pages, Open Graph, Twitter cards, and sitemap.",
    "blogCms.form.seoTitle": "SEO title",
    "blogCms.form.seoMetaDescription": "SEO description",
    "blogCms.form.seoKeywords": "Keywords",
    "blogCms.form.seoKeywordsPlaceholder": "Type a keyword and press Enter",
    "blogCms.form.noSeoKeywords": "No keywords added.",
    "blogCms.form.canonicalUrl": "Canonical URL",
    "blogCms.form.saveDraft": "Save draft",
    "blogCms.form.publish": "Publish",
    "blogCms.form.update": "Save changes",
    "blogCms.form.viewPublic": "View blog page",
    "blogCms.form.deleteTitle": "Delete article?",
    "blogCms.form.deleteDescription":
      "The article will be archived and hidden from readers.",
    "blogCms.form.editorPlaceholder":
      "Write the article here. Use headings, lists, quotes, and images to make it easy to read.",
    "blogCms.preview.tabsLabel": "Editor mode",
    "blogCms.preview.editTab": "Edit",
    "blogCms.preview.previewTab": "Blog preview",
    "blogCms.preview.helper":
      "Switch modes to review the public page before publishing.",
    "blogCms.preview.mode": "Preview mode",
    "blogCms.preview.exit": "Exit preview",
    "blogCms.preview.untitled": "Article title",
    "blogCms.preview.emptyContent": "The article content will appear here.",
    "blogCms.preview.emptyDescription":
      "The article description will appear here.",
    "blogCms.preview.backToBlog": "Back to blog",
    "blogCms.preview.breadcrumb": "Article path",
    "blogCms.preview.blog": "Blog",
    "blogCms.preview.publishNow": "Publish now",
    "blogCms.preview.readMinutes": "{minutes} min read",
    "blogCms.preview.details": "Article details",
    "blogCms.preview.publishedBy": "Published by",
    "blogCms.preview.reading": "Reading",
    "blogCms.preview.minutes": "{minutes} minutes",
    "blogCms.preview.ctaEyebrow": "Next step",
    "blogCms.preview.ctaSupport": "Keep going with one practical action",
    "blogCms.editor.paragraph": "Paragraph",
    "blogCms.editor.heading2": "Heading H2",
    "blogCms.editor.heading3": "Heading H3",
    "blogCms.editor.bold": "Bold",
    "blogCms.editor.italic": "Italic",
    "blogCms.editor.bulletList": "List",
    "blogCms.editor.orderedList": "Numbered list",
    "blogCms.editor.quote": "Quote",
    "blogCms.editor.link": "Link",
    "blogCms.editor.toolbar": "Editor tools",
    "blogCms.editor.linkTitle": "Add link",
    "blogCms.editor.linkDescription":
      "Paste the URL that will be applied to the selected text.",
    "blogCms.editor.linkUrl": "Link URL",
    "blogCms.editor.applyLink": "Apply link",
    "blogCms.editor.removeLink": "Remove link",
    "blogCms.editor.image": "Image",
    "blogCms.editor.imageAltTitle": "Image alt text",
    "blogCms.editor.imageAltDescription":
      "Briefly describe the image for accessibility and SEO before inserting it into the content.",
    "blogCms.editor.insertImage": "Insert image",
    "blogCms.editor.undo": "Undo",
    "blogCms.editor.redo": "Redo",
    "blogCms.toast.created": "Article created",
    "blogCms.toast.updated": "Article updated",
    "blogCms.toast.deleted": "Article deleted",
    "blogCms.toast.bulkDeleted": "{count} article(s) deleted",
    "blogCms.toast.imageUploaded": "Image uploaded",
    "blogCms.error.create": "Could not create the article",
    "blogCms.error.update": "Could not save the article",
    "blogCms.error.delete": "Could not delete",
    "blogCms.error.imageUpload": "Could not upload the image",
    "blogCms.status.DRAFT": "Draft",
    "blogCms.status.PUBLISHED": "Published",
    "blogCms.status.SCHEDULED": "Scheduled",
    "blogCms.status.ARCHIVED": "Archived",
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = locale;
  document.cookie = `${LOCALE_PREFERENCE_KEY}=${locale};path=/;max-age=${PREFERENCE_MAX_AGE_SECONDS};samesite=lax`;

  try {
    window.localStorage.setItem(LOCALE_PREFERENCE_KEY, locale);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;

  try {
    return parseLocale(window.localStorage.getItem(LOCALE_PREFERENCE_KEY));
  } catch {
    return null;
  }
}

function interpolate(
  value: string,
  replacements?: Record<string, string | number>,
) {
  if (!replacements) return value;

  return value.replace(/\{(\w+)\}/g, (match, key) =>
    replacements[key] === undefined ? match : String(replacements[key]),
  );
}

export function I18nProvider({
  children,
  initialLocale = "pt-BR",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const hasSyncedStoredLocale = useRef(false);

  useEffect(() => {
    if (!hasSyncedStoredLocale.current) {
      hasSyncedStoredLocale.current = true;

      const storedLocale = getStoredLocale();
      if (storedLocale && storedLocale !== locale) {
        persistLocale(storedLocale);

        queueMicrotask(() => {
          setLocaleState(storedLocale);
        });

        return;
      }
    }

    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    persistLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => interpolate(dictionaries[locale][key] ?? key, values),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const fallbackLocale = languageToLocale(language);
  const fallbackValue = useMemo<I18nContextValue>(
    () => ({
      locale: fallbackLocale,
      setLocale: (nextLocale) => {
        persistLocale(nextLocale);
        setLanguage(localeToLanguage(nextLocale));
      },
      t: (key, values) =>
        interpolate(dictionaries[fallbackLocale][key] ?? key, values),
    }),
    [fallbackLocale, setLanguage],
  );

  return value ?? fallbackValue;
}

function languageToLocale(language: SupportedLanguage): Locale {
  return language === "en" ? "en-US" : "pt-BR";
}

function localeToLanguage(locale: Locale): SupportedLanguage {
  return locale === "en-US" ? "en" : "pt-BR";
}
