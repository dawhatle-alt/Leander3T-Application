"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  ENTITIES,
  entitySchema,
  isEntityKind,
  type EntityValues,
} from "./entities";

// Administration edits its lists as the signed-in person; row-level security
// allows only admins to write them.

export type AdminResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};

const guid = z.guid();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

function friendly(code: string | undefined) {
  if (code === "23505") return "That name is already in the list.";
  if (code === "42501") return "Only Administration can change this list.";
  return "That couldn't be saved. Try again.";
}

export async function saveEntity(input: {
  kind: string;
  id: string | null;
  values: EntityValues;
}): Promise<AdminResult> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can change this list." };
  if (!isEntityKind(input.kind)) return { error: "Not found." };
  if (input.id && !guid.safeParse(input.id).success)
    return { error: "Not found." };
  const def = ENTITIES[input.kind];

  const parsed = entitySchema(input.kind).safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const t: Loose = supabase.from(def.table as "builders");
  const res = input.id
    ? await t.update(parsed.data).eq("id", input.id).select("id")
    : await t.insert(parsed.data).select("id");
  if (res.error) return { error: friendly(res.error.code) };
  if (!res.data?.length) return { error: friendly("42501") };

  for (const p of def.paths) revalidatePath(p);
  return { id: res.data[0].id };
}

/** Switch a record off (hidden from new choices) or back on. */
export async function setEntityActive(
  kind: string,
  id: string,
  active: boolean,
): Promise<AdminResult> {
  const me = await getSessionProfile();
  if (me?.role !== "admin")
    return { error: "Only Administration can change this list." };
  if (!isEntityKind(kind) || !guid.safeParse(id).success)
    return { error: "Not found." };
  const def = ENTITIES[kind];

  const supabase = await createClient();
  const t: Loose = supabase.from(def.table as "builders");
  const { data, error } = await t.update({ active }).eq("id", id).select("id");
  if (error || !data?.length)
    return { error: friendly(error?.code ?? "42501") };
  for (const p of def.paths) revalidatePath(p);
  return { id };
}
