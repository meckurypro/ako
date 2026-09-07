// src/components/project-types/MediaFields.tsx
import { useRef, useState } from "react";
import { FileUp, Music, Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

// A channel no longer picks link XOR upload — it's a hybrid: an
// uploaded file (played as a capped ~20s preview for audio/video, or
// shown in full for image) and/or a redirect URL to the full
// stream/download elsewhere, independently of each other. Image never
// gets a redirect URL at all (see ChannelConfig.allowLink below), so
// its `url` field is simply never rendered or read.
export interface MediaChannelValue {
  enabled: boolean;
  url: string;
  file_path: string | null;
  file_name: string | null; // display-only, not sent to the server
}

const EMPTY_CHANNEL: MediaChannelValue = {
  enabled: false,
  url: "",
  file_path: null,
  file_name: null,
};

export interface MediaFieldsValue {
  audio: MediaChannelValue;
  video: MediaChannelValue;
  image: MediaChannelValue;
}

export const EMPTY_MEDIA_FIELDS: MediaFieldsValue = {
  audio: { ...EMPTY_CHANNEL },
  video: { ...EMPTY_CHANNEL },
  image: { ...EMPTY_CHANNEL },
};

// A Media project can hold a song's audio, its music video, and cover
// art side by side — each channel is independent. Within an
// audio/video channel, the upload and the link are no longer mutually
// exclusive: a host can set either one, or both (upload becomes the
// in-app ~20s preview, the link is where the full thing lives).
// Image only ever takes an upload — there's no "redirect to the full
// image elsewhere" case that makes sense the way it does for a track
// or a video, so image skips the link option entirely.
export function mediaFieldsAreValid(value: MediaFieldsValue): boolean {
  if (!value.audio.enabled && !value.video.enabled && !value.image.enabled) return false;
  const avChannelValid = (c: MediaChannelValue) => !c.enabled || c.url.trim() !== "" || !!c.file_path;
  const imageValid = !value.image.enabled || !!value.image.file_path;
  return avChannelValid(value.audio) && avChannelValid(value.video) && imageValid;
}

interface ChannelConfig {
  key: "audio" | "video" | "image";
  label: string;
  icon: typeof Music;
  allowLink: boolean;
  linkLabel: string;
  linkPlaceholder: string;
  uploadLabel: string;
  uploadNote: string;
  accept: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    key: "audio",
    label: "Audio",
    icon: Music,
    allowLink: true,
    linkLabel: "Link to the full track (Spotify, Apple Music, etc.)",
    linkPlaceholder: "https://open.spotify.com/...",
    uploadLabel: "Upload a preview clip",
    uploadNote: "Plays right here as a ~20-second preview — not the full track.",
    accept: "audio/*",
  },
  {
    key: "video",
    label: "Video",
    icon: VideoIcon,
    allowLink: true,
    linkLabel: "Link to the full video (YouTube, Vimeo, etc.)",
    linkPlaceholder: "https://youtube.com/...",
    uploadLabel: "Upload a preview clip",
    uploadNote: "Plays right here as a ~20-second preview — not the full video.",
    accept: "video/*",
  },
  {
    key: "image",
    label: "Image",
    icon: ImageIcon,
    allowLink: false,
    linkLabel: "",
    linkPlaceholder: "",
    uploadLabel: "Upload the image",
    uploadNote: "Displayed in full here — visitors with access can download it or copy a link to it.",
    accept: "image/*",
  },
];

interface MediaFieldsProps {
  value: MediaFieldsValue;
  onChange: (value: MediaFieldsValue) => void;
  onError: (message: string) => void;
}

export function MediaFields({ value, onChange, onError }: MediaFieldsProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">
        What's included <span className="font-normal">(pick one or more)</span>
      </label>
      <div className="flex gap-2 mb-3">
        {CHANNELS.map(({ key, label, icon: Icon }) => {
          const channel = value[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...value, [key]: { ...channel, enabled: !channel.enabled } })}
              aria-pressed={channel.enabled}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                channel.enabled ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {CHANNELS.filter((c) => value[c.key].enabled).map((config) => (
        <MediaChannelFields
          key={config.key}
          config={config}
          value={value[config.key]}
          onChange={(channel) => onChange({ ...value, [config.key]: channel })}
          onError={onError}
        />
      ))}

      {!value.audio.enabled && !value.video.enabled && !value.image.enabled && (
        <p className="text-xs text-ink-muted">Turn on Audio, Video, Image, or any combination to continue.</p>
      )}
    </div>
  );
}

// One channel's own fields. Audio/video show an upload block AND a
// link block stacked together — a host can fill either or both.
// Image shows the upload block only (config.allowLink is false).
function MediaChannelFields({
  config,
  value,
  onChange,
  onError,
}: {
  config: ChannelConfig;
  value: MediaChannelValue;
  onChange: (value: MediaChannelValue) => void;
  onError: (message: string) => void;
}) {
  const uploadFile = useUploadProjectFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      onChange({ ...value, file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  function handleRemoveFile() {
    onChange({ ...value, file_path: null, file_name: null });
  }

  return (
    <div className="mb-3 pl-3 border-l-2 border-border">
      <div className="mb-4">
        <label className="block text-sm font-medium text-ink-muted mb-1.5">{config.uploadLabel}</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
        >
          <FileUp size={16} />
          {uploadFile.isPending
            ? "Uploading…"
            : value.file_name
              ? value.file_name
              : // Editing an existing channel: file_path came from the
                // project row, but the original filename was never
                // stored, so there's no file_name to show. Say so
                // rather than falling back to "Choose file", which
                // would wrongly read as nothing being uploaded yet.
                value.file_path
                ? "File uploaded — tap to replace"
                : "Choose file"}
        </button>
        {value.file_path && !uploadFile.isPending && (
          <button
            type="button"
            onClick={handleRemoveFile}
            className="text-xs text-danger mt-1.5"
          >
            Remove upload
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-xs text-ink-muted mt-1">{config.uploadNote}</p>
      </div>

      {config.allowLink && (
        <FormField
          id={`${config.key}_url`}
          label={config.linkLabel}
          type="url"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder={config.linkPlaceholder}
        />
      )}
    </div>
  );
}
