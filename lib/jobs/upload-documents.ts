"use client";

import { recordDocuments } from "@/app/(app)/jobs/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "./resize-image";

export type UploadKind =
  "plans" | "front_elevation" | "color_selection" | "other";

export const DOC_ACCEPT = "application/pdf,image/jpeg,image/png";
export const DOC_MAX_BYTES = 50 * 1024 * 1024;
const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

// Plans and elevations carry dimensions and callouts, so they keep more
// detail than job photos: longest side 3200px, JPEG at 0.85. A 6–12 MB
// scanned or exported elevation typically lands around 0.8–1.5 MB.
const DOC_IMAGE = { maxSide: 3200, quality: 0.85 };

/** Why a file can't be added, or null if it's fine. */
export function checkDocument(file: File): string | null {
  if (!DOC_TYPES.has(file.type)) return "Only PDF, JPG and PNG files.";
  if (file.size > DOC_MAX_BYTES) return "Over 50 MB.";
  return null;
}

/**
 * Shrinks JPG/PNG images to a compressed JPEG before upload. Keeps the
 * original when compressing wouldn't make it smaller. PDFs go up as-is.
 */
async function prepare(
  file: File,
): Promise<{ body: Blob; contentType: string; name: string }> {
  if (file.type === "application/pdf")
    return { body: file, contentType: file.type, name: file.name };
  try {
    const small = await resizeImage(file, DOC_IMAGE);
    if (small.size < file.size) {
      return {
        body: small,
        contentType: "image/jpeg",
        name: file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg",
      };
    }
  } catch {
    // Unreadable in this browser: upload the original instead.
  }
  return { body: file, contentType: file.type, name: file.name };
}

const safeName = (name: string) =>
  name
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-80) || "file";

/**
 * Compresses, uploads and records documents for one job. Returns how many
 * were saved; the rest failed (no access, network, or bad file).
 */
export async function uploadDocuments(
  jobId: string,
  items: { file: File; kind: UploadKind }[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ saved: number; failed: number }> {
  const supabase = createClient();
  const uploaded: { path: string; fileName: string; kind: UploadKind }[] = [];

  for (const [i, item] of items.entries()) {
    onProgress?.(i + 1, items.length);
    if (checkDocument(item.file)) continue;
    const { body, contentType, name } = await prepare(item.file);
    const path = `${jobId}/${crypto.randomUUID()}-${safeName(name)}`;
    const { error } = await supabase.storage
      .from("plans")
      .upload(path, body, { contentType, upsert: false });
    if (!error) uploaded.push({ path, fileName: name, kind: item.kind });
  }

  if (!uploaded.length) return { saved: 0, failed: items.length };
  const res = await recordDocuments(uploaded.map((u) => ({ jobId, ...u })));
  const saved = res.error ? 0 : uploaded.length;
  return { saved, failed: items.length - saved };
}
