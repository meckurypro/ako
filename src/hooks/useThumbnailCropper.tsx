// src/hooks/useThumbnailCropper.tsx
//
// One call that turns "a file the person picked" into "a file in exactly the shape this project's thumbnail needs":
//   const cropper = useThumbnailCropper();
//   const ready = await cropper.request(file, spec);   // File, or null if they cancelled
//   …
//   return <>{…}{cropper.element}</>;
// A picture that is already the right shape is centre-cropped and resized silently. Anything else opens the crop
// sheet, locked to the required shape, so the person decides what is kept. Several files queue up one after another.
import { useCallback, useState, type ReactNode } from "react";
import { ThumbnailCropModal } from "../components/ThumbnailCropModal";
import { cropToSpec } from "../lib/cropImage";
import { matchesThumbSpec, type ThumbSpec } from "../lib/thumbnailSpec";
import { readImageDimensions } from "./useUploadProjectThumbnail";

interface Pending {
  id: number;
  file: File;
  spec: ThumbSpec;
  title?: string;
  note?: string;
  resolve: (file: File | null) => void;
}

let nextId = 1;

export function useThumbnailCropper(): {
  request: (file: File, spec: ThumbSpec, opts?: { title?: string; note?: string }) => Promise<File | null>;
  element: ReactNode;
} {
  const [queue, setQueue] = useState<Pending[]>([]);

  const request = useCallback(async (file: File, spec: ThumbSpec, opts: { title?: string; note?: string } = {}): Promise<File | null> => {
    const { width, height } = await readImageDimensions(file);
    if (matchesThumbSpec(width, height, spec)) return cropToSpec(file, spec);
    return new Promise<File | null>((resolve) => {
      setQueue((q) => [...q, { id: nextId++, file, spec, title: opts.title, note: opts.note, resolve }]);
    });
  }, []);

  const current = queue[0];
  function finish(result: File | null) {
    if (!current) return;
    current.resolve(result);
    setQueue((q) => q.slice(1));
  }

  const element = current ? (
    <ThumbnailCropModal
      key={current.id}
      file={current.file}
      spec={current.spec}
      title={current.title}
      note={current.note}
      onCancel={() => finish(null)}
      onConfirm={(cropped) => finish(cropped)}
    />
  ) : null;

  return { request, element };
}
