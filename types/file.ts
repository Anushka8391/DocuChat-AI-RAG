export interface UploadedFileMetadata {
  id: string;
  userId: string;
  name: string;
  size: number;
  mimeType: string;
  bucket: string;
  path: string;
  extension: "md" | "txt";
  createdAt: string;
  downloadUrl: string | null;
}

export interface FileListResponse {
  files: UploadedFileMetadata[];
  message?: string;
}

export interface FileUploadResponse {
  file: UploadedFileMetadata;
  message?: string;
}
