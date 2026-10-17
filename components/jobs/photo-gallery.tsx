"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { deletePhoto } from "@/app/(app)/jobs/[id]/actions";
import { ConfirmButton } from "./confirm-button";

export type GalleryPhoto = {
  id: string;
  url: string | null;
  label: string;
  date: string;
  canDelete: boolean;
};

export function PhotoGallery({
  jobId,
  photos,
}: {
  jobId: string;
  photos: GalleryPhoto[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  if (!photos.length) {
    return <p className="text-ink-muted">No photos yet.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(p)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-mortar shadow-card"
            >
              {p.url && (
                // Signed storage URLs; next/image would re-host them.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={p.label || "Job photo"}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/75 to-transparent px-3.5 py-2.5 text-left font-mono text-[11.5px] text-white uppercase">
                {[p.label, p.date].filter(Boolean).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.label || "Job photo"}
          className="fixed inset-0 z-[100] flex flex-col bg-charcoal/95 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 pb-3 text-limestone"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-xs tracking-[0.1em] uppercase">
              {[open.label, open.date].filter(Boolean).join(" · ")}
            </span>
            <span className="flex items-center gap-2">
              {open.canDelete && (
                <ConfirmButton
                  label="Delete photo"
                  className="text-limestone"
                  onConfirm={async () => {
                    const res = await deletePhoto(jobId, open.id);
                    if (!res.error) {
                      setOpen(null);
                      router.refresh();
                    }
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="grid size-9 place-items-center rounded-md hover:bg-limestone/10"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </span>
          </div>
          {open.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={open.url}
              alt={open.label || "Job photo"}
              className="mx-auto max-h-full min-h-0 max-w-full flex-1 object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
