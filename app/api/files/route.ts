import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { ragService } from "@/services/rag/rag.service";
import type { ApiError, FileListResponse, FileUploadResponse, UploadedFileMetadata } from "@/types";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  getUploadValidationMessage,
  isAllowedUploadFile,
  sanitizeFileName,
} from "@/validators/file";

export const dynamic = "force-dynamic";

const STORAGE_BUCKET_NAME = "knowledge-files";

type UploadedFileRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  bucket_name: string;
  storage_path: string;
  created_at: string;
};

function mapRowToMetadata(
  row: UploadedFileRow,
  downloadUrl: string | null,
): UploadedFileMetadata {
  const lowerName = row.file_name.toLowerCase();
  const extension = lowerName.endsWith(".pdf") ? "pdf" : lowerName.endsWith(".md") ? "md" : "txt";

  return {
    id: row.id,
    userId: row.user_id,
    name: row.file_name,
    size: row.file_size,
    mimeType: row.mime_type,
    bucket: row.bucket_name,
    path: row.storage_path,
    extension,
    createdAt: row.created_at,
    downloadUrl,
  };
}

function isMissingMetadataTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("uploaded_files") ||
    error?.message?.includes("schema cache")
  );
}

function isMissingDocumentsTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("public.documents") ||
    error?.message?.includes("match_documents") ||
    error?.message?.includes("schema cache")
  );
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function ensureStorageBucket() {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.createBucket(STORAGE_BUCKET_NAME, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
  });

  if (
    error &&
    !error.message.toLowerCase().includes("already exists") &&
    !error.message.toLowerCase().includes("duplicate")
  ) {
    throw error;
  }

  return admin;
}

async function createDownloadUrl(bucket: string, path: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    const payload: ApiError = {
      error: "Unauthorized.",
      details: "Please sign in to view your uploaded files.",
    };

    return NextResponse.json(payload, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("uploaded_files")
      .select("id, user_id, file_name, file_size, mime_type, bucket_name, storage_path, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingMetadataTable(error)) {
        const payload: FileListResponse = {
          files: [],
          message:
            "Run the uploaded_files SQL migration once to persist upload metadata in your database.",
        };

        return NextResponse.json(payload, { status: 200 });
      }

      throw error;
    }

    const files = await Promise.all(
      (data ?? []).map(async (row: UploadedFileRow) => {
        const downloadUrl = await createDownloadUrl(row.bucket_name, row.storage_path);
        return mapRowToMetadata(row, downloadUrl);
      }),
    );

    const payload: FileListResponse = { files };
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to load uploaded files.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    const payload: ApiError = {
      error: "Unauthorized.",
      details: "Please sign in before uploading a file.",
    };

    return NextResponse.json(payload, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      const payload: ApiError = {
        error: "Missing file.",
        details: "Send the upload request as multipart form data with a `file` field.",
      };

      return NextResponse.json(payload, { status: 400 });
    }

    if (!isAllowedUploadFile(file)) {
      const payload: ApiError = {
        error: "Unsupported file type.",
        details: getUploadValidationMessage(file.name),
      };

      return NextResponse.json(payload, { status: 400 });
    }

    const admin = await ensureStorageBucket();
    const storagePath = `${user.id}/${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;

    console.error("[api/files POST] upload start", {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "text/plain",
      bucketName: STORAGE_BUCKET_NAME,
      storagePath,
    });

    console.error("[api/files POST] storage upload request", {
      table: `storage.objects via bucket ${STORAGE_BUCKET_NAME}`,
      storagePath,
      contentType: file.type || "text/plain",
      upsert: false,
    });

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type || "text/plain",
        upsert: false,
      });

    console.error("[api/files POST] storage upload result", {
      storagePath,
      uploadError: uploadError ?? null,
    });

    if (uploadError) {
      console.error("[api/files POST] storage upload failed", uploadError, {
        userId: user.id,
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      throw uploadError;
    }

    console.error("[api/files POST] inserting uploaded_files row", {
      table: "public.uploaded_files",
      values: {
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "text/plain",
        bucket_name: STORAGE_BUCKET_NAME,
        storage_path: storagePath,
      },
      returning: "id, user_id, file_name, file_size, mime_type, bucket_name, storage_path, created_at",
    });

    const { data, error: insertError } = await admin
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "text/plain",
        bucket_name: STORAGE_BUCKET_NAME,
        storage_path: storagePath,
      })
      .select("id, user_id, file_name, file_size, mime_type, bucket_name, storage_path, created_at")
      .single<UploadedFileRow>();

    console.error("[api/files POST] uploaded_files insert result", {
      table: "public.uploaded_files",
      storagePath,
      insertError: insertError ?? null,
      returnedRow: data ?? null,
    });

    if (insertError) {
      console.error("[api/files POST] uploaded_files insert failed; rolling back storage object", insertError, {
        userId: user.id,
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      await admin.storage.from(STORAGE_BUCKET_NAME).remove([storagePath]);

      console.error("[api/files POST] storage rollback completed", {
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      if (isMissingMetadataTable(insertError)) {
        const payload: ApiError = {
          error: "Upload metadata table is missing.",
          details:
            "Run the uploaded_files SQL migration, then retry the upload so metadata can be stored in the database.",
        };

        return NextResponse.json(payload, { status: 500 });
      }

      throw insertError;
    }

    const downloadUrl = await createDownloadUrl(STORAGE_BUCKET_NAME, storagePath);

    console.error("[api/files POST] uploaded_files row persisted", {
      table: "public.uploaded_files",
      rowId: data.id,
      storagePath,
      downloadUrl,
    });

    let message = `${file.name} uploaded successfully.`;

    try {
      console.error("[api/files POST] starting ragService.indexUploadedFile", {
        fileId: data.id,
        userId: user.id,
        fileName: file.name,
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      const indexingResult = await ragService.indexUploadedFile({
        fileId: data.id,
        userId: user.id,
        fileName: file.name,
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      console.error("[api/files POST] ragService.indexUploadedFile result", {
        fileId: data.id,
        userId: user.id,
        chunkCount: indexingResult.chunkCount,
        message: indexingResult.message,
      });

      message = `${file.name} uploaded and indexed into ${indexingResult.chunkCount} chunks.`;
    } catch (indexError) {
      console.error("[api/files POST] ragService.indexUploadedFile failed", indexError, {
        userId: user.id,
        fileId: data.id,
        fileName: file.name,
        storagePath,
        bucketName: STORAGE_BUCKET_NAME,
      });

      if (isMissingDocumentsTable(indexError as { code?: string; message?: string })) {
        message = `${file.name} uploaded successfully. You can chat with the attached file now, and full vector search will work after running the \`20260411_create_rag_documents.sql\` migration.`;
      } else {
        message = `${file.name} uploaded successfully, but retrieval indexing is pending. ${getErrorMessage(indexError)}`;
      }
    }

    const payload: FileUploadResponse = {
      file: mapRowToMetadata(data, downloadUrl),
      message,
    };

    console.error("[api/files POST] response payload", {
      fileId: data.id,
      storagePath,
      message,
      payload,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("[api/files POST] fatal upload handler error", error);

    const payload: ApiError = {
      error: "Unable to upload the file.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
