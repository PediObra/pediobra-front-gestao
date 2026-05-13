import { api } from "./client";

export type StorageBucketKey =
  | "deliveries"
  | "orders"
  | "products"
  | "sellers"
  | "usedListings"
  | "catalogImports";

export interface PresignedUpload {
  bucket: string;
  objectName: string;
  uploadUrl: string;
  publicUrl?: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface UploadedStorageObject {
  bucket: string;
  objectName: string;
  publicUrl?: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface DirectUploadOptions {
  bucketKey: StorageBucketKey;
  prefix: string;
}

const UPLOAD_MODE = process.env.NEXT_PUBLIC_UPLOAD_MODE ?? "presigned";

export function shouldUsePresignedUploads() {
  return UPLOAD_MODE !== "multipart";
}

function contentTypeFor(file: File) {
  if (file.type) return file.type;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".csv")) return "text/csv";
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".tsv")) return "text/tab-separated-values";
  if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lowerName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

export async function createPresignedUpload(
  file: File,
  options: DirectUploadOptions,
) {
  return api.post<PresignedUpload>("/storage/presigned-upload", {
    bucketKey: options.bucketKey,
    fileName: file.name,
    contentType: contentTypeFor(file),
    contentLength: file.size,
    prefix: options.prefix,
  });
}

export async function uploadFileToStorage(
  file: File,
  options: DirectUploadOptions,
): Promise<UploadedStorageObject> {
  const presigned = await createPresignedUpload(file, options);
  const response = await fetch(presigned.uploadUrl, {
    method: presigned.method,
    headers: presigned.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error("Upload direto para o armazenamento falhou.");
  }

  return {
    bucket: presigned.bucket,
    objectName: presigned.objectName,
    publicUrl: presigned.publicUrl,
    fileName: file.name,
    contentType: contentTypeFor(file),
    size: file.size,
  };
}

export function uploadFilesToStorage(
  files: File[],
  options: DirectUploadOptions,
) {
  return Promise.all(files.map((file) => uploadFileToStorage(file, options)));
}

export async function sha256File(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(digest));

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
