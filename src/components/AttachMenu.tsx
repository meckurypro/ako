// src/components/AttachMenu.tsx
// WhatsApp's attach popover: round, colour-coded icons with a label under each —
// Document · Camera · Gallery. Opens above the composer; click away or Esc closes it.
import { useEffect, type ReactNode } from "react";
import { Camera, FileText, Image as ImageIcon } from "lucide-react";

interface AttachMenuProps {
  onGallery: () => void;
  onCamera: () => void;
  onDocument: () => void;
  onClose: () => void;
}

function Item({ icon, label, color, onClick }: { icon: ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 w-20 py-2 active:opacity-70" aria-label={label}>
      <span className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
        {icon}
      </span>
      <span className="text-[13px] text-ink-muted">{label}</span>
    </button>
  );
}

export function AttachMenu({ onGallery, onCamera, onDocument, onClose }: AttachMenuProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div role="menu" aria-label="Attach" className="absolute bottom-full left-3 mb-2 z-50 bg-surface border border-border rounded-3xl shadow-lg px-3 py-2 flex">
        <Item icon={<FileText size={24} />} label="Document" color="#5B6BD6" onClick={pick(onDocument)} />
        <Item icon={<Camera size={24} />} label="Camera" color="#D6536F" onClick={pick(onCamera)} />
        <Item icon={<ImageIcon size={24} />} label="Gallery" color="#8E5BD6" onClick={pick(onGallery)} />
      </div>
    </>
  );
}
