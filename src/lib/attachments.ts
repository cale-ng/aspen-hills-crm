import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "./supabase/server";
import {
  type Attachment,
  type AttachmentRow,
  type ContextKind,
  rowToAttachment,
} from "./types";

export const STORAGE_BUCKET = "attachments";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME types treated as plain text for inline extraction. */
const TEXT_LIKE_PREFIXES = ["text/"];
const TEXT_LIKE_EXACT = new Set([
  "application/json",
  "application/xml",
  "application/x-yaml",
  "message/rfc822", // .eml
]);

function isTextLike(mime: string | undefined): boolean {
  if (!mime) return false;
  if (TEXT_LIKE_EXACT.has(mime)) return true;
  return TEXT_LIKE_PREFIXES.some((p) => mime.startsWith(p));
}

function extOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

export async function listAttachments(opportunityId: string): Promise<Attachment[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listAttachments: ${error.message}`);
  return (data as AttachmentRow[]).map(rowToAttachment);
}

export interface UploadInput {
  opportunityId: string;
  file: File;
  kind: ContextKind;
  tag?: string | null;
  note?: string | null;
}

export async function uploadAttachment(input: UploadInput): Promise<Attachment> {
  const { opportunityId, file, kind, tag, note } = input;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 10MB.`
    );
  }

  const supabase = supabaseServer();
  const attachmentId = randomUUID();
  const ext = extOf(file.name);
  const storagePath = `${opportunityId}/${attachmentId}${ext}`;

  // Upload to Supabase Storage.
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Storage upload failed: ${storageError.message}`);
  }

  // Inline text extraction for text-based MIME types.
  let extractedText: string | null = null;
  if (isTextLike(file.type)) {
    try {
      extractedText = buf.toString("utf-8").slice(0, 200_000); // cap at 200K chars
    } catch {
      extractedText = null;
    }
  }

  // Insert metadata row.
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      id: attachmentId,
      opportunity_id: opportunityId,
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_path: storagePath,
      is_reference: false,
      kind,
      tag: tag ?? null,
      note: note ?? null,
      extracted_text: extractedText,
    })
    .select("*")
    .single();

  if (error) {
    // Best-effort rollback of the uploaded file.
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Attachment insert failed: ${error.message}`);
  }

  return rowToAttachment(data as AttachmentRow);
}

export async function deleteAttachment(id: string): Promise<void> {
  const supabase = supabaseServer();

  const { data: row, error: fetchError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(`deleteAttachment lookup: ${fetchError.message}`);
  if (!row) return;

  if (row.storage_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
  }

  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) throw new Error(`deleteAttachment: ${error.message}`);
}

/** Generate a short-lived signed URL for viewing/downloading an attachment. */
export async function signedUrlFor(
  id: string,
  expiresInSec = 300
): Promise<string | null> {
  const supabase = supabaseServer();
  const { data: row } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!row?.storage_path) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(row.storage_path, expiresInSec);

  if (error) return null;
  return data?.signedUrl ?? null;
}
