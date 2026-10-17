"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Notice } from "@/components/auth/form-bits";
import { deleteDocument, recordDocument } from "@/app/(app)/jobs/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "./confirm-button";

type Kind = "plans" | "front_elevation" | "color_selection" | "other";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 50 * 1024 * 1024;

// Plans and other job documents go to the private "plans" bucket. Job
// editors (admins and the job's supervisors) can add them.
export function DocumentUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>("plans");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That file is over 50 MB.");
      return;
    }
    setBusy(true);
    const safe =
      file.name
        .replace(/[^\w.\- ]+/g, "")
        .replace(/\s+/g, "-")
        .slice(-80) || "file";
    const path = `${jobId}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await createClient()
      .storage.from("plans")
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
    const res = upErr
      ? {
          error: "That file couldn't be uploaded. Plans must be PDF or images.",
        }
      : await recordDocument({ jobId, path, fileName: file.name, kind });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="border-t border-mortar px-5 py-4">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="doc-kind" className="sr-only">
          Document type
        </label>
        <select
          id="doc-kind"
          className="input w-auto py-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          <option value="plans">Plans</option>
          <option value="front_elevation">Front elevation</option>
          <option value="color_selection">Color selection</option>
          <option value="other">Other</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-bold text-limestone has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60">
          <Upload className="size-4" aria-hidden />
          {busy ? "Uploading…" : "Upload File"}
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}

export function DeleteDocumentButton({
  jobId,
  documentId,
}: {
  jobId: string;
  documentId: string;
}) {
  return (
    <ConfirmButton
      label="Delete"
      onConfirm={() => deleteDocument(jobId, documentId)}
    />
  );
}
