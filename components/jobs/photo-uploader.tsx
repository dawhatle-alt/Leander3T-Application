"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Notice } from "@/components/auth/form-bits";
import { recordPhotos } from "@/app/(app)/jobs/[id]/actions";
import { fileDate, resizeImage } from "@/lib/jobs/resize-image";
import { createClient } from "@/lib/supabase/client";

type Trade = "brick" | "stone" | "stucco";

// Pick or take photos, shrink them on the device, upload straight to storage
// (the database checks the person may add photos to this job), then record them.
export function PhotoUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [trade, setTrade] = useState<Trade | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, 30);
    const supabase = createClient();
    const done: { path: string; takenOn: string }[] = [];
    let unreadable = 0;
    setResult(null);

    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      let blob: Blob;
      try {
        blob = await resizeImage(file);
      } catch {
        unreadable++;
        continue;
      }
      const path = `${jobId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (!error) done.push({ path, takenOn: fileDate(file) });
    }

    if (done.length) {
      setBusy("Saving…");
      const res = await recordPhotos(
        done.map((d) => ({
          jobId,
          path: d.path,
          caption: caption.trim() || null,
          trade: trade || null,
          takenOn: d.takenOn,
        })),
      );
      if (res.error) {
        setResult({ tone: "error", text: res.error });
      } else {
        const failed = list.length - res.saved;
        setResult({
          tone: failed ? "error" : "ok",
          text:
            `${res.saved} photo${res.saved === 1 ? "" : "s"} added.` +
            (failed
              ? ` ${failed} couldn't be added${unreadable ? " (set the phone camera to “Most Compatible” for HEIC photos)" : ""}.`
              : ""),
        });
        setCaption("");
        router.refresh();
      }
    } else {
      setResult({
        tone: "error",
        text: unreadable
          ? "Those photos couldn't be read. On iPhone, set Camera → Formats to “Most Compatible”."
          : "Those photos couldn't be uploaded. You may not have access to add photos to this job.",
      });
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="rounded-md border border-dashed border-mortar-2 bg-paper px-5 py-4 shadow-card">
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="photo-caption" className="label">
            Caption{" "}
            <span className="font-normal text-ink-muted">
              (optional, applies to this batch)
            </span>
          </label>
          <input
            id="photo-caption"
            className="input"
            value={caption}
            maxLength={120}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. North wall, detail course"
          />
        </div>
        <div className="w-40">
          <label htmlFor="photo-trade" className="label">
            Trade
          </label>
          <select
            id="photo-trade"
            className="input"
            value={trade}
            onChange={(e) => setTrade(e.target.value as Trade | "")}
          >
            <option value="">—</option>
            <option value="brick">Brick</option>
            <option value="stone">Stone</option>
            <option value="stucco">Stucco</option>
          </select>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-fire px-[18px] py-[11px] text-[14.5px] font-bold text-primary-foreground shadow-[0_6px_18px_rgba(228,89,15,0.35)] has-[:disabled]:pointer-events-none has-[:disabled]:opacity-60">
          <Camera className="size-[18px]" aria-hidden />
          {busy ?? "Add Photos"}
          <input
            ref={input}
            type="file"
            accept="image/*"
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
