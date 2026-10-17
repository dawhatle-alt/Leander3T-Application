"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

// Everything here runs as the signed-in person: the database decides who may
// add or remove notes, photos and documents on a job.

const uuid = z.guid();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

async function session() {
  const me = await getSessionProfile();
  if (!me) throw new Error("signed-out");
  return { me, supabase: await createClient() };
}

const pathFor = (jobId: string) => `/jobs/${jobId}`;

// ---------------------------------------------------------------- notes
export async function addNote(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      jobId: uuid,
      body: z.string().trim().min(1, "Write a note first.").max(4000),
    })
    .safeParse({ jobId: formData.get("jobId"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { me, supabase } = await session();
  const { error } = await supabase.from("job_notes").insert({
    job_id: parsed.data.jobId,
    body: parsed.data.body,
    author_id: me.id,
  });
  if (error) return { error: "Your note couldn't be saved." };
  revalidatePath(pathFor(parsed.data.jobId));
  return { message: "Note added." };
}

export async function deleteNote(jobId: string, noteId: string) {
  if (!uuid.safeParse(jobId).success || !uuid.safeParse(noteId).success) return;
  const { supabase } = await session();
  await supabase
    .from("job_notes")
    .delete()
    .eq("id", noteId)
    .eq("job_id", jobId);
  revalidatePath(pathFor(jobId));
}

// ---------------------------------------------------------------- photos
const photoSchema = z.object({
  jobId: uuid,
  path: z.string().min(40).max(200),
  caption: z.string().trim().max(120).nullable(),
  trade: z.enum(["brick", "stone", "stucco"]).nullable(),
  takenOn: date,
});

/** Record photos already uploaded to storage by the browser. */
export async function recordPhotos(
  items: z.input<typeof photoSchema>[],
): Promise<{ error?: string; saved: number }> {
  const parsed = z.array(photoSchema).min(1).max(30).safeParse(items);
  if (!parsed.success)
    return { error: "Those photos couldn't be saved.", saved: 0 };
  const jobId = parsed.data[0].jobId;
  if (
    parsed.data.some(
      (p) => p.jobId !== jobId || !p.path.startsWith(`${jobId}/`),
    )
  ) {
    return { error: "Those photos couldn't be saved.", saved: 0 };
  }

  const { me, supabase } = await session();
  const { error } = await supabase.from("job_photos").insert(
    parsed.data.map((p) => ({
      job_id: p.jobId,
      storage_path: p.path,
      caption: p.caption || null,
      trade: p.trade,
      taken_on: p.takenOn,
      uploaded_by: me.id,
    })),
  );
  if (error) {
    // Don't leave orphaned files behind.
    await supabase.storage
      .from("photos")
      .remove(parsed.data.map((p) => p.path));
    return { error: "Those photos couldn't be saved.", saved: 0 };
  }
  revalidatePath(pathFor(jobId));
  return { saved: parsed.data.length };
}

export async function deletePhoto(
  jobId: string,
  photoId: string,
): Promise<{ error?: string }> {
  if (!uuid.safeParse(jobId).success || !uuid.safeParse(photoId).success)
    return { error: "Not found." };
  const { supabase } = await session();
  const { data } = await supabase
    .from("job_photos")
    .delete()
    .eq("id", photoId)
    .eq("job_id", jobId)
    .select("storage_path");
  if (!data?.length) return { error: "That photo couldn't be deleted." };
  await supabase.storage.from("photos").remove(data.map((d) => d.storage_path));
  revalidatePath(pathFor(jobId));
  return {};
}

// ---------------------------------------------------------------- documents
const docSchema = z.object({
  jobId: uuid,
  path: z.string().min(40).max(260),
  fileName: z.string().trim().min(1).max(200),
  kind: z.enum(["plans", "front_elevation", "color_selection", "other"]),
});

export async function recordDocument(
  input: z.input<typeof docSchema>,
): Promise<{ error?: string }> {
  const parsed = docSchema.safeParse(input);
  if (
    !parsed.success ||
    !parsed.data.path.startsWith(`${parsed.data.jobId}/`)
  ) {
    return { error: "That file couldn't be saved." };
  }
  const { me, supabase } = await session();
  const d = parsed.data;
  const { error } = await supabase.from("job_documents").insert({
    job_id: d.jobId,
    kind: d.kind,
    storage_path: d.path,
    file_name: d.fileName,
    uploaded_by: me.id,
  });
  if (error) {
    await supabase.storage.from("plans").remove([d.path]);
    return { error: "That file couldn't be saved." };
  }
  revalidatePath(pathFor(d.jobId));
  return {};
}

export async function deleteDocument(jobId: string, documentId: string) {
  if (!uuid.safeParse(jobId).success || !uuid.safeParse(documentId).success)
    return;
  const { supabase } = await session();
  const { data } = await supabase
    .from("job_documents")
    .delete()
    .eq("id", documentId)
    .eq("job_id", jobId)
    .select("storage_path");
  if (data?.length)
    await supabase.storage
      .from("plans")
      .remove(data.map((d) => d.storage_path));
  revalidatePath(pathFor(jobId));
}
