"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { addNote, deleteNote } from "@/app/(app)/jobs/[id]/actions";
import type { FormState } from "@/lib/validation/auth";
import { ConfirmButton } from "./confirm-button";

export function NoteForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addNote,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="px-5 py-4">
      <input type="hidden" name="jobId" value={jobId} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <label htmlFor="note-body" className="sr-only">
        Add a note
      </label>
      <textarea
        id="note-body"
        name="body"
        rows={2}
        maxLength={4000}
        placeholder="Add a note for the team…"
        className="input mb-3 resize-y"
      />
      <Button type="submit" variant="dark" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add Note"}
      </Button>
    </form>
  );
}

export function DeleteNoteButton({
  jobId,
  noteId,
}: {
  jobId: string;
  noteId: string;
}) {
  return (
    <ConfirmButton label="Delete" onConfirm={() => deleteNote(jobId, noteId)} />
  );
}
