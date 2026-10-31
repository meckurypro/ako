// src/lib/cropImage.ts
// Crop an image file to an exact aspect ratio (centered) and re-encode it small.
//
// A page's hero slides must all share one aspect ratio, and the banner has its own.
// Rather than reject anything that isn't already that shape, we crop to it on upload —
// so what the editor previews is exactly what visitors see.

import type { ThumbSpec } from "./thumbnailSpec";

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

/**
 * Draw an explicit source rectangle of a loaded image into a canvas of the given spec's shape and encode it (WebP,
 * else JPEG, stepping quality down until it fits the bucket limit). The output is never larger than the source
 * rectangle (a small picture is not blown up), and never larger than the spec's own size.
 */
export async function exportSpecCrop(
  img: HTMLImageElement | ImageBitmap,
  src: { x: number; y: number; width: number; height: number },
  spec: ThumbSpec,
  opts: { name?: string } = {}
): Promise<File> {
  const outW = Math.max(16, Math.min(spec.outWidth, Math.round(src.width)));
  const outH = Math.max(16, Math.round(outW / spec.ratio));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, outW, outH);

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
  return new File([blob], `${opts.name ?? "thumbnail"}.${ext}`, { type });
}

/** Centre-crop a picture that is already (about) the spec's shape to exactly that shape and size. No UI. */
export async function cropToSpec(file: File, spec: ThumbSpec): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That image couldn't be read. Try a JPEG, PNG or WebP.");
  }
  try {
    let w = bitmap.width;
    let h = Math.round(w / spec.ratio);
    if (h > bitmap.height) {
      h = bitmap.height;
      w = Math.round(h * spec.ratio);
    }
    return await exportSpecCrop(bitmap, { x: Math.round((bitmap.width - w) / 2), y: Math.round((bitmap.height - h) / 2), width: w, height: h }, spec);
  } finally {
    bitmap.close();
  }
}

/** Load an already-uploaded picture back into a File so it can be re-cropped (public bucket, CORS-enabled). */
export async function fetchImageFile(url: string): Promise<File> {
  let res: Response;
  try {
    res = await fetch(url, { mode: "cors" });
  } catch {
    throw new Error("Couldn't load that picture to crop it. Choose it again from your device.");
  }
  if (!res.ok) throw new Error("Couldn't load that picture to crop it. Choose it again from your device.");
  const blob = await res.blob();
  return new File([blob], "thumbnail", { type: blob.type || "image/jpeg" });
}
