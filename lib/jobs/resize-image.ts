// Shrinks a phone photo in the browser before upload: longest side 2000px,
// JPEG at quality 0.82. A 4 MB phone photo becomes roughly 400–700 KB, which
// uploads in seconds on a job-site cell signal and is still sharp for review.
export const MAX_SIDE = 2000;

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode"))),
      "image/jpeg",
      0.82,
    ),
  );
}

/** The photo's own date (from the file), as YYYY-MM-DD in Central time. */
export function fileDate(file: File): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date(file.lastModified || Date.now()));
}
