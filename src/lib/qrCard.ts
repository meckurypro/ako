// src/lib/qrCard.ts
// Renders a custom page's QR code as a downloadable card: the page URL plus the QR code on a white background.
// Same content as the Print view. Two formats:
//   • portrait  9:16 (1080×1920) — URL on top, QR code below it.
//   • landscape 16:9 (1920×1080) — URL and QR code side by side.
import QRCode from "qrcode";

export type QrCardFormat = "portrait" | "landscape";

export const QR_CARD_SIZES: Record<QrCardFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

const FONT = `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

/** Break at natural URL boundaries (after "/", "." or "-") so a slug is never torn apart. */
function tokens(text: string): string[] {
  return text.match(/[^/.\-]*[/.\-]?/g)?.filter(Boolean) ?? [text];
}

/** Greedy wrap on URL boundaries; a single token wider than the box is split by character as a last resort. */
function wrapTokens(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const tok of tokens(text)) {
    if (ctx.measureText(line + tok).width <= maxWidth) {
      line += tok;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    if (ctx.measureText(tok).width <= maxWidth) {
      line = tok;
    } else {
      for (const ch of tok) {
        if (line && ctx.measureText(line + ch).width > maxWidth) {
          lines.push(line);
          line = ch;
        } else line += ch;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

const MIN_ORPHAN = 6; // a last line shorter than this ("s", "gs") looks like a mistake — keep it with the rest

/**
 * Pick the font size for the URL.
 *  1. Prefer ONE line: shrink the text until the whole URL fits (down to `minSingle`).
 *  2. Only if that would make it too small (a long URL), wrap on "/", "." and "-" boundaries at the largest size
 *     that fits the box, and never leave a tiny dangling tail on the last line.
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number, maxLines: number, maxSize: number, minSingle: number) {
  for (let size = maxSize; size >= minSingle; size -= 2) {
    ctx.font = `800 ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) return { size, lines: [text] };
  }
  for (let size = maxSize; size >= 28; size -= 2) {
    ctx.font = `800 ${size}px ${FONT}`;
    const lines = wrapTokens(ctx, text, maxWidth);
    const orphan = lines.length > 1 && lines[lines.length - 1].length < MIN_ORPHAN;
    if (!orphan && lines.length <= maxLines && lines.length * size * 1.2 <= maxHeight) return { size, lines };
  }
  ctx.font = `800 28px ${FONT}`;
  return { size: 28, lines: wrapTokens(ctx, text, maxWidth) };
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], size: number, x: number, top: number, align: CanvasTextAlign) {
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lh = size * 1.2;
  lines.forEach((l, i) => ctx.fillText(l, x, top + i * lh));
  return lines.length * lh;
}

export async function renderQrCard(url: string, format: QrCardFormat): Promise<Blob> {
  const { width: W, height: H } = QR_CARD_SIZES[format];
  const display = url.replace(/^https?:\/\//, "");
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, { width: 1000, margin: 2, errorCorrectionLevel: "M" });

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (format === "portrait") {
    const pad = 90;
    const textW = W - pad * 2;
    // URL on top…
    ctx.fillStyle = "#000000";
    const { size, lines } = fitText(ctx, display, textW, 520, 4, 132, 64);
    const textH = lines.length * size * 1.2;
    const qrSize = 800;
    const captionSize = 44;
    const gap = 110;
    const blockH = textH + gap + qrSize + 60 + captionSize;
    const top = Math.max(pad, (H - blockH) / 2);
    drawLines(ctx, lines, size, W / 2, top, "center");
    // …QR code below it.
    const qrY = top + textH + gap;
    ctx.drawImage(qrCanvas, (W - qrSize) / 2, qrY, qrSize, qrSize);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.font = `500 ${captionSize}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Scan to open", W / 2, qrY + qrSize + 60);
  } else {
    const pad = 100;
    const qrSize = 800;
    const gap = 100;
    const qrX = W - pad - qrSize;
    const qrY = (H - qrSize) / 2;
    const textW = qrX - gap - pad;
    // URL on the left…
    ctx.fillStyle = "#000000";
    const captionSize = 44;
    const { size, lines } = fitText(ctx, display, textW, 640, 5, 120, 56);
    const textH = lines.length * size * 1.2;
    const blockH = textH + 50 + captionSize;
    const top = (H - blockH) / 2;
    drawLines(ctx, lines, size, pad, top, "left");
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.font = `500 ${captionSize}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Scan to open", pad, top + textH + 50);
    // …QR code beside it.
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image"))), "image/png"),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
