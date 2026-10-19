"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Notice } from "@/components/auth/form-bits";
import { deleteDocument } from "@/app/(app)/jobs/[id]/actions";
import {
  DOC_ACCEPT,
  checkDocument,
  uploadDocuments,
  type UploadKind,
} from "@/lib/jobs/upload-documents";
import { ConfirmButton } from "./confirm-button";

// Plans and other job documents go to the private "plans" bucket. Job
// editors (admins and the job's supervisors) can add them. Images are
// compressed on the device before upload.
export function DocumentUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<UploadKind>("plans");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setResult(null);
    const list = [...files].slice(0, 40);
    const bad = list.filter((f) => checkDocument(f));
    const good = list.filter((f) => !checkDocument(f));
    if (!good.length) {
      setResult({
        tone: "error",
        text: "Only PDF, JPG and PNG files up to 50 MB can be added.",
      });
      if (input.current) input.current.value = "";
      return;
    }
    const res = await uploadDocuments(
      jobId,
      good.map((file) => ({ file, kind })),
      (n, total) => setBusy(`Uploading ${n} of ${total}…`),
    );
    setBusy(null);
    if (input.current) input.current.value = "";
    const failed = res.failed + bad.length;
    if (res.saved) router.refresh();
    setResult(
      failed
        ? {
            tone: "error",
            text: res.saved
              ? `${res.saved} added. ${failed} couldn't be added (PDF, JPG or PNG up to 50 MB).`
              : "Those files couldn't be uploaded. Plans must be PDF, JPG or PNG.",
          }
        : {
            tone: "ok",
            text: `${res.saved} file${res.saved === 1 ? "" : "s"} added.`,
          },
    );
  }

  return (
    <div className="border-t border-mortar px-5 py-4">
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="doc-kind" className="sr-only">
          Document type
        </label>
        <select
          id="doc-kind"
          className="input w-auto py-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as UploadKind)}
        >
          <option value="plans">Plans</option>
          <option value="front_elevation">Front elevation</option>
          <option value="color_selection">Color selection</option>
          <option value="other">Other</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-bold text-limestone has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60">
          <Upload className="size-4" aria-hidden />
          {busy ?? "Upload Files"}
          <input
            ref={input}
            type="file"
            accept={DOC_ACCEPT}
            multiple
            disabled={!!busy}
            onChange={(e) => upload(e.target.files)}
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
