// src/components/AttachMenu.tsx
// Attach options for the message composer — Document · Camera · Gallery — as the shared centred options list.
import { Camera, FileText, Image as ImageIcon } from "lucide-react";
import { OptionsModal, type OptionItem } from "./OptionsModal";

interface AttachMenuProps {
  onGallery: () => void;
  onCamera: () => void;
  onDocument: () => void;
  onClose: () => void;
}

export function AttachMenu({ onGallery, onCamera, onDocument, onClose }: AttachMenuProps) {
  const items: OptionItem[] = [
    { key: "document", label: "Document", icon: <FileText />, onSelect: onDocument },
    { key: "camera", label: "Camera", icon: <Camera />, onSelect: onCamera },
    { key: "gallery", label: "Gallery", icon: <ImageIcon />, onSelect: onGallery },
  ];
  // immediate: these open a file picker / the camera, which has to happen inside the tap's own user gesture.
  return <OptionsModal title="Attach" items={items} onClose={onClose} immediate />;
}
