"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "pt-BR" | "en-US";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "pediobra-locale";

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
    "blog.public.brand": "PediObra Blog",
    "blog.public.backToSite": "Voltar ao PediObra",
    "blog.public.controls": "Preferências do blog",
    "blog.public.language": "Idioma",
    "blog.public.theme": "Tema",
    "blogCms.list.title": "Blog",
    "blogCms.list.description":
      "Crie, publique e otimize artigos para tráfego orgânico.",
    "blogCms.list.new": "Novo artigo",
    "blogCms.list.searchPlaceholder": "Buscar por título, slug ou conteúdo…",
    "blogCms.list.tagPlaceholder": "Filtrar por tag…",
    "blogCms.list.allStatuses": "Todos os status",
    "blogCms.list.empty": "Nenhum artigo encontrado.",
    "blogCms.list.bulkDelete": "Excluir selecionados",
    "blogCms.list.bulkConfirmTitle": "Excluir artigos selecionados?",
    "blogCms.list.bulkConfirmDescription":
      "Essa ação arquiva os artigos selecionados e remove eles das listagens públicas.",
    "blogCms.table.post": "Artigo",
    "blogCms.table.status": "Status",
    "blogCms.table.tags": "Tags",
    "blogCms.table.updated": "Atualizado",
    "blogCms.table.selected": "{count} selecionado(s)",
    "blogCms.new.title": "Novo artigo",
    "blogCms.new.description":
      "Publique conteúdo indexável para SEO com imagens, tags e metadados.",
    "blogCms.edit.fallbackTitle": "Editar artigo",
    "blogCms.edit.description": "Ajuste conteúdo, mídia, status e SEO.",
    "blogCms.form.content": "Conteúdo",
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
    "blogCms.form.tags": "Tags",
    "blogCms.form.tagsPlaceholder": "materiais, cimento, orçamento",
    "blogCms.form.tagsHelp": "Separe tags por vírgula.",
    "blogCms.form.readingTime": "Tempo de leitura",
    "blogCms.form.readingTimeHelp":
      "Opcional. Se vazio, o backend calcula pelo conteúdo.",
    "blogCms.form.coverImages": "Imagens do post",
    "blogCms.form.coverImagesDescription":
      "Envie capa e galeria. A primeira imagem vira capa por padrão.",
    "blogCms.form.clearImages": "Remover imagens atuais",
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
    "blogCms.editor.paragraph": "Parágrafo",
    "blogCms.editor.heading2": "Título H2",
    "blogCms.editor.heading3": "Título H3",
    "blogCms.editor.bold": "Negrito",
    "blogCms.editor.italic": "Itálico",
    "blogCms.editor.bulletList": "Lista",
    "blogCms.editor.orderedList": "Lista numerada",
    "blogCms.editor.quote": "Citação",
    "blogCms.editor.link": "Link",
    "blogCms.editor.image": "Imagem",
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
    "blog.public.brand": "PediObra Blog",
    "blog.public.backToSite": "Back to PediObra",
    "blog.public.controls": "Blog preferences",
    "blog.public.language": "Language",
    "blog.public.theme": "Theme",
    "blogCms.list.title": "Blog",
    "blogCms.list.description":
      "Create, publish, and optimize articles for organic traffic.",
    "blogCms.list.new": "New article",
    "blogCms.list.searchPlaceholder": "Search by title, slug, or content…",
    "blogCms.list.tagPlaceholder": "Filter by tag…",
    "blogCms.list.allStatuses": "All statuses",
    "blogCms.list.empty": "No articles found.",
    "blogCms.list.bulkDelete": "Delete selected",
    "blogCms.list.bulkConfirmTitle": "Delete selected articles?",
    "blogCms.list.bulkConfirmDescription":
      "This archives the selected articles and removes them from public lists.",
    "blogCms.table.post": "Article",
    "blogCms.table.status": "Status",
    "blogCms.table.tags": "Tags",
    "blogCms.table.updated": "Updated",
    "blogCms.table.selected": "{count} selected",
    "blogCms.new.title": "New article",
    "blogCms.new.description":
      "Publish indexable SEO content with images, tags, and metadata.",
    "blogCms.edit.fallbackTitle": "Edit article",
    "blogCms.edit.description": "Adjust content, media, status, and SEO.",
    "blogCms.form.content": "Content",
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
    "blogCms.form.tags": "Tags",
    "blogCms.form.tagsPlaceholder": "materials, cement, budgeting",
    "blogCms.form.tagsHelp": "Separate tags with commas.",
    "blogCms.form.readingTime": "Reading time",
    "blogCms.form.readingTimeHelp":
      "Optional. If empty, the backend calculates it from the content.",
    "blogCms.form.coverImages": "Post images",
    "blogCms.form.coverImagesDescription":
      "Upload cover and gallery images. The first image becomes cover by default.",
    "blogCms.form.clearImages": "Remove current images",
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
    "blogCms.editor.paragraph": "Paragraph",
    "blogCms.editor.heading2": "Heading H2",
    "blogCms.editor.heading3": "Heading H3",
    "blogCms.editor.bold": "Bold",
    "blogCms.editor.italic": "Italic",
    "blogCms.editor.bulletList": "List",
    "blogCms.editor.orderedList": "Numbered list",
    "blogCms.editor.quote": "Quote",
    "blogCms.editor.link": "Link",
    "blogCms.editor.image": "Image",
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
  document.cookie = `${STORAGE_KEY}=${locale};path=/;max-age=31536000;samesite=lax`;
  window.localStorage.setItem(STORAGE_KEY, locale);
}

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "pt-BR";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "pt-BR" || stored === "en-US") return stored;

  return window.navigator.language.toLowerCase().startsWith("en")
    ? "en-US"
    : "pt-BR";
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  useEffect(() => {
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
      t: (key, values) =>
        interpolate(dictionaries[locale][key] ?? key, values),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return value;
}
