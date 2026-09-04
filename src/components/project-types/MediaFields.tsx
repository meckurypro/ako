// src/components/project-types/MediaFields.tsx
import { useRef, useState } from "react";
import { FileUp, Link as LinkIcon, Music, Video as VideoIcon } from "lucide-react";
import { FormField } from "../FormField";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";

export interface MediaChannelValue {
  enabled: boolean;
  source: "link" | "upload";
  url: string;
  file_path: string | null;
  file_name: string | null; // display-only, not sent to the server
}

const EMPTY_CHANNEL: MediaChannelValue = {
  enabled: false,
  source: "link",
  url: "",
  file_path: null,
  file_name: null,
};

export interface MediaFieldsValue {
  audio: MediaChannelValue;
  video: MediaChannelValue;
}

export const EMPTY_MEDIA_FIELDS: MediaFieldsValue = {
  audio: { ...EMPTY_CHANNEL },
  video: { ...EMPTY_CHANNEL },
};

// A Media project can hold a song's audio and its music video side by
// side — each channel is independent, but within a channel it's link
// XOR upload, same rule as before: a link takes you elsewhere
// (Spotify, YouTube), an upload streams straight from Ako with no
// redirect or download option at all.
export function mediaFieldsAreValid(value: MediaFieldsValue): boolean {
  if (!value.audio.enabled && !value.video.enabled) return false;
  const channelValid = (c: MediaChannelValue) =>
    !c.enabled || (c.source === "link" ? c.url.trim() !== "" : !!c.file_path);
  return channelValid(value.audio) && channelValid(value.video);
}

interface ChannelConfig {
  key: "audio" | "video";
  label: string;
  icon: typeof Music;
  linkLabel: string;
  linkPlaceholder: string;
  uploadLabel: string;
  accept: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    key: "audio",
    label: "Audio",
    icon: Music,
    linkLabel: "Link to stream (Spotify, Apple Music, etc.)",
    linkPlaceholder: "https://open.spotify.com/...",
    uploadLabel: "Upload the audio file to stream here",
    accept: "audio/*",
  },
  {
    key: "video",
    label: "Video",
    icon: VideoIcon,
    linkLabel: "Link to stream (YouTube, Vimeo, etc.)",
    linkPlaceholder: "https://youtube.com/...",
    uploadLabel: "Upload the video file to stream here",
    accept: "video/*",
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
        What's included <span className="font-normal">(pick one or both)</span>
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

      {!value.audio.enabled && !value.video.enabled && (
        <p className="text-xs text-ink-muted">Turn on Audio, Video, or both to continue.</p>
      )}
    </div>
  );
}

// One channel's own link-or-upload sub-form — same toggle pattern the
// old DeliverableFields used, scoped to a single channel now that a
// Media project can carry two of these independently.
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

  function switchSource(next: "link" | "upload") {
    if (next === value.source) return;
    onChange(
      next === "link"
        ? { ...value, source: next, file_path: null, file_name: null }
        : { ...value, source: next, url: "" }
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setTick((t) => t + 1);
      const path = await uploadFile.mutateAsync(file);
      onChange({ ...value, source: "upload", url: "", file_path: path, file_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  return (
    <div className="mb-3 pl-3 border-l-2 border-border">
      <div className="flex gap-2 mb-2.5" role="tablist" aria-label={`${config.label} delivery method`}>
        <button
          type="button"
          role="tab"
          aria-selected={value.source === "link"}
          onClick={() => switchSource("link")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value.source === "link" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
          }`}
        >
          <LinkIcon size={14} />
          Link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value.source === "upload"}
          onClick={() => switchSource("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value.source === "upload" ? "bg-accent text-canvas border-accent" : "bg-surface text-ink-muted border-border"
          }`}
        >
          <FileUp size={14} />
          Upload
        </button>
      </div>

      {value.source === "link" ? (
        <FormField
          id={`${config.key}_url`}
          label={config.linkLabel}
          type="url"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder={config.linkPlaceholder}
        />
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-muted mb-1.5">{config.uploadLabel}</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFile.isPending}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
          >
            <FileUp size={16} />
            {uploadFile.isPending ? "Uploading…" : value.file_name ?? "Choose file"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-ink-muted mt-1">
            Streams right here on Ako — no download or redirect, just playback.
          </p>
        </div>
      )}
    </div>
  );
}
