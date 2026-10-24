// src/components/MediaComposeModal.tsx
// The screen WhatsApp shows between picking media and sending it: a full-bleed preview,
// a thumbnail strip for albums (click to switch, ✕ to remove), an HD toggle for photos, and a
// caption bar with the send button (badged with the item count when sending several).
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileText, Send, X } from "lucide-react";
import { MAX_CAPTION_LENGTH, documentStyle, formatFileSize, type MediaKind } from "../lib/chatMedia";

interface MediaComposeModalProps {
  kind: MediaKind;
  files: File[];
  onClose: () => void;
  onSend: (files: File[], caption: string, hd: boolean) => void;
}

export function MediaComposeModal({ kind, files: initialFiles, onClose, onSend }: MediaComposeModalProps) {
  const [files, setFiles] = useState(initialFiles);
  const [index, setIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [hd, setHd] = useState(false);

  const urls = useMemo(() => (kind === "image" ? files.map((f) => URL.createObjectURL(f)) : []), [files, kind]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = files[Math.min(index, files.length - 1)];
  if (!current) return null;
  const doc = kind === "document" ? documentStyle(current.name, current.type) : null;

  function remove(i: number) {
    if (files.length === 1) {
      onClose();
      return;
    }
    setFiles((prev) => prev.filter((_, n) => n !== i));
    setIndex((prev) => Math.max(0, Math.min(prev, files.length - 2)));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSend(files, caption, hd);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="Send media">
      <div className="flex items-center justify-between px-2 pt-[max(env(safe-area-inset-top),8px)] pb-1">
        <button type="button" onClick={onClose} className="p-3 text-white" aria-label="Close">
          <X size={24} />
        </button>
        {kind === "image" && (
          <button
            type="button"
            onClick={() => setHd((v) => !v)}
            aria-pressed={hd}
            aria-label="Send in HD quality"
            className={`mr-2 rounded-full px-3 py-1.5 text-xs font-bold ${hd ? "bg-white text-black" : "bg-white/20 text-white"}`}
          >
            HD
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        {kind === "image" ? (
          <img src={urls[Math.min(index, urls.length - 1)]} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <div className="w-24 h-24 rounded-3xl flex flex-col items-center justify-center text-white" style={{ backgroundColor: doc?.color }}>
              <FileText size={44} />
              <span className="text-xs font-bold mt-1">{doc?.label}</span>
            </div>
            <p className="text-white text-base break-all line-clamp-3">{current.name}</p>
            <p className="text-white/60 text-sm">{[doc?.label, formatFileSize(current.size)].filter(Boolean).join(" · ")}</p>
          </div>
        )}
      </div>

      {kind === "image" && files.length > 1 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative flex-shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`}>
                <img
                  src={urls[i]}
                  alt=""
                  className={`w-[52px] h-[52px] rounded-lg object-cover ${i === index ? "ring-2 ring-white" : "opacity-70"}`}
                />
              </button>
              {i === index && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove photo"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 px-3 pt-1 pb-[max(env(safe-area-inset-bottom),12px)]">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={MAX_CAPTION_LENGTH}
          rows={1}
          placeholder={files.length > 1 ? "Add a caption to all…" : "Add a caption…"}
          className="flex-1 min-w-0 rounded-3xl bg-white/15 text-white placeholder-white/55 px-4 py-2.5 resize-none max-h-[110px] leading-snug focus:outline-none"
        />
        <button
          type="submit"
          aria-label={files.length > 1 ? `Send ${files.length} items` : "Send"}
          className="relative w-11 h-11 rounded-full bg-cta text-white flex items-center justify-center flex-shrink-0 hover:brightness-90 active:scale-95"
        >
          <Send size={20} />
          {files.length > 1 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">
              {files.length}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
