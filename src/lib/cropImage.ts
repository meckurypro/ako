// src/lib/cropImage.ts
// Crop an image file to an exact aspect ratio (centered) and re-encode it small.
//
// A page's hero slides must all share one aspect ratio, and the banner has its own.
// Rather than reject anything that isn't already that shape, we crop to it on upload —
// so what the editor previews is exactly what visitors see.

const MAX_BYTES = 4.5 * 1024 * 1024; // under the 5MB avatars-bucket limit

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function cropToAspect(
  file: File,
  aspect: number,
  opts: { maxWidth?: number } = {}
): Promise<File> {
  const maxWidth = opts.maxWidth ?? 1600;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That image couldn't be read. Try a JPEG, PNG or WebP.");
  }

  // Largest centered rectangle of the requested shape.
  let cropW = bitmap.width;
  let cropH = Math.round(cropW / aspect);
  if (cropH > bitmap.height) {
    cropH = bitmap.height;
    cropW = Math.round(cropH * aspect);
  }
  const sx = Math.round((bitmap.width - cropW) / 2);
  const sy = Math.round((bitmap.height - cropH) / 2);

  const outW = Math.min(maxWidth, cropW);
  const outH = Math.round(outW / aspect);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, outW, outH);
  bitmap.close();

  // WebP where supported (much smaller), JPEG otherwise; step quality down until it fits.
  let type = "image/webp";
  let quality = 0.86;
  let blob = await canvasToBlob(canvas, type, quality);
  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    blob = await canvasToBlob(canvas, type, quality);
  }
  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, type, quality);
  }
  if (!blob) throw new Error("Couldn't process that image.");

  const ext = type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `page-image.${ext}`, { type });
}

/** Width / height of a picked file (EXIF orientation applied). */
export async function readImageAspect(file: File): Promise<number> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const a = bitmap.width / bitmap.height;
    bitmap.close();
    return a;
  } catch {
    throw new Error("That image couldn't be read. Try a JPEG, PNG or WebP.");
  }
}

/**
 * Draw an explicit source rectangle of a loaded image into a square canvas and encode it (WebP, else JPEG, stepping
 * quality down until it fits the bucket limit). Used by the avatar cropper, where the person chooses the rectangle.
 */
export async function exportSquareCrop(
  img: HTMLImageElement,
  src: { x: number; y: number; size: number },
  opts: { outSize?: number; name?: string } = {}
): Promise<File> {
  const out = Math.max(64, Math.min(opts.outSize ?? 1024, Math.round(src.size)));
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, src.x, src.y, src.size, src.size, 0, 0, out, out);

  let type = "image/webp";
  let quality = 0.88;
  let blob = await canvasToBlob(canvas, type, quality);
  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    blob = await canvasToBlob(canvas, type, quality);
  }
  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, type, quality);
  }
  if (!blob) throw new Error("Couldn't process that image.");
  const ext = type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${opts.name ?? "avatar"}.${ext}`, { type });
}
