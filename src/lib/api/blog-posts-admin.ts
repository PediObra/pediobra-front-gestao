import { api, apiRequest } from "./client";
import type {
  BlogPost,
  BlogPostContentFormat,
  BlogPostStatus,
  Paginated,
} from "./types";

export interface ListAdminBlogPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  status?: BlogPostStatus;
  authorUserId?: number;
  publishedFrom?: string;
  publishedTo?: string;
}

export interface BlogPostImageInput {
  file: File;
  altText?: string;
  caption?: string;
  position?: number;
  isCover?: boolean;
}

export interface SaveBlogPostPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  contentFormat?: BlogPostContentFormat;
  contentEditorData?: string;
  status?: BlogPostStatus;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  readingTimeMinutes?: number;
  publishedAt?: string;
  tags?: string[];
  images?: BlogPostImageInput[];
  clearImages?: boolean;
}

export interface CreateBlogPostPayload extends SaveBlogPostPayload {
  title: string;
  content: string;
}

export type UpdateBlogPostPayload = SaveBlogPostPayload;

export interface BlogEditorUploadResponse {
  url: string;
  objectName: string;
  bucket: string;
}

function appendOptional(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, String(value));
}

function buildBlogPostFormData(
  payload: CreateBlogPostPayload | UpdateBlogPostPayload,
) {
  const formData = new FormData();

  appendOptional(formData, "title", payload.title);
  appendOptional(formData, "slug", payload.slug);
  appendOptional(formData, "excerpt", payload.excerpt);
  appendOptional(formData, "content", payload.content);
  appendOptional(formData, "contentFormat", payload.contentFormat);
  appendOptional(formData, "contentEditorData", payload.contentEditorData);
  appendOptional(formData, "status", payload.status);
  appendOptional(formData, "seoTitle", payload.seoTitle);
  appendOptional(formData, "seoDescription", payload.seoDescription);
  appendOptional(formData, "seoKeywords", payload.seoKeywords);
  appendOptional(formData, "canonicalUrl", payload.canonicalUrl);
  appendOptional(formData, "readingTimeMinutes", payload.readingTimeMinutes);
  appendOptional(formData, "publishedAt", payload.publishedAt);
  appendOptional(formData, "clearImages", payload.clearImages);

  if (payload.tags) {
    formData.append("tags", JSON.stringify(payload.tags));
  }

  if (payload.images?.length) {
    for (const image of payload.images) {
      formData.append("images", image.file);
    }

    formData.append(
      "imageMetadata",
      JSON.stringify(
        payload.images.map((image, index) => ({
          altText: image.altText || undefined,
          caption: image.caption || undefined,
          position: image.position ?? index,
          isCover: image.isCover ?? index === 0,
        })),
      ),
    );
  }

  return formData;
}

export const blogPostsAdminService = {
  list: (params: ListAdminBlogPostsParams = {}) =>
    api.get<Paginated<BlogPost>>("/blog-posts/admin", { query: params }),

  getById: (id: number) => api.get<BlogPost>(`/blog-posts/admin/${id}`),

  create: (payload: CreateBlogPostPayload) =>
    api.post<BlogPost>("/blog-posts", buildBlogPostFormData(payload)),

  update: (id: number, payload: UpdateBlogPostPayload) =>
    api.patch<BlogPost>(`/blog-posts/${id}`, buildBlogPostFormData(payload)),

  remove: (id: number) => api.delete<BlogPost>(`/blog-posts/${id}`),

  removeMany: (ids: number[]) =>
    apiRequest<{ deleted: number }>("/blog-posts/bulk", {
      method: "DELETE",
      body: { ids },
    }),

  uploadEditorImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post<BlogEditorUploadResponse>("/blog-posts/uploads", formData);
  },
};
