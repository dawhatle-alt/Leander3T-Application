"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Notice } from "@/components/auth/form-bits";
import {
  DOC_ACCEPT,
  checkDocument,
  type UploadKind,
} from "@/lib/jobs/upload-documents";

export type PendingFile = { id: string; file: File; kind: UploadKind };

const GROUPS: { kind: UploadKind; title: string; hint: string }[] = [
  {
    kind: "front_elevation",
    title: "Front Elevation",
    hint: "Snapshot or PDF of the front of the house.",
  },
  { kind: "plans", title: "Plans", hint: "Plan set pages or the full PDF." },
];

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Files picked on the new-job form. They're held here until the job is
// created, then uploaded (images compressed) against the new job.
export function NewJobFiles({
  files,
  onChange,
  disabled,
}: {
  files: PendingFile[];
  onChange: (next: PendingFile[]) => void;
  disabled?: boolean;
}) {
  const [rejected, setRejected] = useState<string | null>(null);

  function add(kind: UploadKind, list: FileList | null) {
    if (!list?.length) return;
    const picked = [...list];
    const bad = picked.filter((f) => checkDocument(f));
    setRejected(
      bad.length
        ? `${bad.map((f) => f.name).join(", ")} — only PDF, JPG and PNG files up to 50 MB.`
        : null,
    );
    onChange([
      ...files,
      ...picked
        .filter((f) => !checkDocument(f))
        .map((file) => ({ id: crypto.randomUUID(), file, kind })),
    ]);
  }

  return (
    <section className="overflow-hidden rounded-md border border-mortar bg-paper shadow-card">
      <header className="border-b border-mortar px-6 py-4">
        <h2 className="font-display text-[22px] font-bold uppercase">
          Front Elevation & Plans
        </h2>
        <p className="text-[13.5px] text-ink-muted">
          PDF, JPG or PNG. Add as many as you need — images are compressed
          before they upload. Files upload when you create the job.
        </p>
      </header>
      {rejected && (
        <div className="px-6 pt-4 [&>p]:mb-0">
          <Notice tone="error">{rejected}</Notice>
        </div>
      )}
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <FileGroup
            key={g.kind}
            {...g}
            disabled={disabled}
            files={files.filter((f) => f.kind === g.kind)}
            onAdd={(list) => add(g.kind, list)}
            onRemove={(id) => onChange(files.filter((f) => f.id !== id))}
          />
        ))}
      </div>
    </section>
  );
}

function FileGroup({
  kind,
  title,
  hint,
  files,
  disabled,
  onAdd,
  onRemove,
}: {
  kind: UploadKind;
  title: string;
  hint: string;
  files: PendingFile[];
  disabled?: boolean;
  onAdd: (list: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = `files-${kind}`;
  return (
    <div className="min-w-0">
      <p className="label" id={`${id}-label`}>
        {title}
      </p>
      <p className="mb-2 text-[12.5px] text-ink-muted">{hint}</p>
      {files.length > 0 && (
        <ul className="mb-3 rounded-sm border border-mortar">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2.5 border-b border-limestone px-3 py-2 last:border-b-0"
            >
              <FileText className="size-4 flex-none text-flame" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {f.file.name}
              </span>
              <span className="font-mono text-[11.5px] text-ink-muted">
                {size(f.file.size)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(f.id)}
                className="rounded-sm p-1 text-ink-muted hover:text-chalk disabled:opacity-50"
                aria-label={`Remove ${f.file.name}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border-[1.5px] border-dashed border-mortar-2 bg-limestone px-4 py-2 text-[13.5px] font-bold has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber">
        <Upload className="size-4" aria-hidden />
        {files.length ? `Add more` : `Add ${title}`}
        <input
          ref={input}
          type="file"
          accept={DOC_ACCEPT}
          multiple
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            onAdd(e.target.files);
            if (input.current) input.current.value = "";
          }}
          className="sr-only"
        />
      </label>
    </div>
  );
}
