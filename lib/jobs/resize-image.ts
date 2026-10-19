// Shrinks an image in the browser before upload. Photos default to longest
// side 2000px, JPEG at quality 0.82: a 4 MB phone photo becomes roughly
// 400–700 KB, which uploads in seconds on a job-site cell signal and is still
// sharp for review. Plans and elevations pass a larger size so dimensions and
// callouts stay readable.
export const MAX_SIDE = 2000;

export async function resizeImage(
  file: File,
  {
    maxSide = MAX_SIDE,
    quality = 0.82,
  }: { maxSide?: number; quality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  // JPEG has no transparency; paint white first so clear areas of a PNG
  // don't turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode"))),
      "image/jpeg",
      quality,
    ),
  );
}

/** The photo's own date (from the file), as YYYY-MM-DD in Central time. */
export function fileDate(file: File): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date(file.lastModified || Date.now()));
}
