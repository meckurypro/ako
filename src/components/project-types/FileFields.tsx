// src/components/project-types/FileFields.tsx
//
// A File project holds one or more files, laid out like tracks on an album upload: each file is a "slot" — upload
// the file, and (optionally) type the name you want the downloaded copy to bear. Leave the name blank and the
// download is named after the uploaded file. Price and privacy are the project's, not the file's, so they aren't
// here. How many slots: 1, or up to 6 for verified accounts (the database enforces it; `maxFiles` decides what to
// show).
import { useRef } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { useUploadProjectFile } from "../../hooks/useUploadProjectFile";
import type { ProjectFile, ProjectFileInput } from "../../hooks/useProjectFiles";
import {
  MAX_PROJECT_FILES_VERIFIED,
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_FILE_LABEL,
  formatFileSize,
  stripExtension,
} from "../../lib/fileProject";
import { supabase } from "../../lib/supabase";

export interface FileSlot {
  /** Local React key only — never sent anywhere. */
  key: string;
  /** project_files.id once the file is saved on the project; null for a file uploaded in this session. */
  id: string | null;
  /** private-content path; null while the slot is still empty. */
  file_path: string | null;
  /** The uploaded file's own name, with extension. */
  original_name: string | null;
  /** The title typed for the downloaded copy. "" = use the uploaded file's name. */
  display_name: string;
  size_bytes: number | null;
}

export interface FileFieldsValue {
  files: FileSlot[];
}

// No slots in state = one empty slot is shown but nothing has been entered. (So an untouched form compares equal to
// this and never counts as unsaved progress.)
export const EMPTY_FILE_FIELDS: FileFieldsValue = { files: [] };

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newFileSlot(): FileSlot {
  return { key: newKey(), id: null, file_path: null, original_name: null, display_name: "", size_bytes: null };
}

/** The Edit form's starting value: one slot per saved file, in order. */
export function fileFieldsFromProjectFiles(files: ProjectFile[]): FileFieldsValue {
  return {
    files: files.map((f) => ({
      key: f.id,
      id: f.id,
      file_path: f.file_path,
      original_name: f.original_name,
      // Only a title somebody typed is shown as one; the rest fall back to the placeholder.
      display_name: f.display_name ?? "",
      size_bytes: f.size_bytes,
    })),
  };
}

/**
 * Makes any stored value safe to use. A "New project" draft saved before multi-file support held a single
 * { file_path, file_name }; it comes back as one filled slot instead of crashing the form.
 */
export function normalizeFileFields(raw: unknown): FileFieldsValue {
  const v = raw as { files?: unknown; file_path?: unknown; file_name?: unknown } | null | undefined;
  if (v && Array.isArray(v.files)) {
    return {
      files: (v.files as Partial<FileSlot>[]).map((s) => ({
        key: s.key || newKey(),
        id: s.id ?? null,
        file_path: s.file_path ?? null,
        original_name: s.original_name ?? null,
        display_name: s.display_name ?? "",
        size_bytes: s.size_bytes ?? null,
      })),
    };
  }
  if (v && typeof v.file_path === "string" && v.file_path) {
    const path = v.file_path;
    return {
      files: [
        {
          key: newKey(),
          id: null,
          file_path: path,
          original_name: typeof v.file_name === "string" && v.file_name ? v.file_name : path.split("/").pop() ?? "file",
          display_name: "",
          size_bytes: null,
        },
      ],
    };
  }
  return EMPTY_FILE_FIELDS;
}

/** Has anything actually been uploaded? (Empty slots and typed titles alone aren't progress.) */
export function fileFieldsHaveProgress(v: FileFieldsValue): boolean {
  return v.files.some((s) => !!s.file_path);
}

/** null when the files are ready to save; otherwise what to tell the person. */
export function fileFieldsError(v: FileFieldsValue): string | null {
  if (v.files.length === 0) return "Upload a file to continue.";
  if (v.files.some((s) => !s.file_path)) return "Upload a file for every slot, or remove the empty one.";
  return null;
}

/** The ordered list set_project_files expects. */
export function fileFieldsToInputs(v: FileFieldsValue): ProjectFileInput[] {
  return v.files
    .filter((s) => !!s.file_path)
    .map((s) => ({
      id: s.id,
      file_path: s.file_path as string,
      original_name: s.original_name || (s.file_path as string).split("/").pop() || "file",
      display_name: s.display_name.trim() || null,
      size_bytes: s.size_bytes,
    }));
}

interface FileFieldsProps {
  value: FileFieldsValue;
  onChange: (value: FileFieldsValue) => void;
  onError: (message: string) => void;
  /** 1 for most accounts, up to 6 for verified ones (see maxProjectFiles). */
  maxFiles: number;
}

// File projects only ever store uploaded files — no redirect/marketing link — so there is no link-or-upload toggle.
export function FileFields({ value, onChange, onError, maxFiles }: FileFieldsProps) {
  const slots = value.files.length > 0 ? value.files : [{ ...newFileSlot(), key: "first" }];
  const canAddMore = maxFiles > 1 && slots.length < maxFiles;

  function update(next: FileSlot[]) {
    onChange({ files: next });
  }

  function patchSlot(key: string, patch: Partial<FileSlot>) {
    update(slots.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSlot(slot: FileSlot) {
    // An upload that was never saved on the project has nothing pointing at it — don't leave it in storage.
    if (slot.file_path && !slot.id) {
      void supabase.storage.from("private-content").remove([slot.file_path]);
    }
    update(slots.filter((s) => s.key !== slot.key));
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink-muted mb-1.5">{maxFiles > 1 ? "Files" : "File"}</label>

      {slots.map((slot, index) => (
        <FileSlotRow
          key={slot.key}
          index={index}
          slot={slot}
          showNumber={maxFiles > 1}
          canRemove={slots.length > 1}
          onPatch={(patch) => patchSlot(slot.key, patch)}
          onRemove={() => removeSlot(slot)}
          onError={onError}
        />
      ))}

      {canAddMore && (
        <button
          type="button"
          onClick={() => update([...slots, newFileSlot()])}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
        >
          <Plus size={16} />
          Add another file
          <span className="text-ink-muted font-normal">
            ({slots.length}/{maxFiles})
          </span>
        </button>
      )}

      <p className="text-xs text-ink-muted mt-2">
        Up to {MAX_PROJECT_FILE_LABEL} per file.
        {maxFiles > 1
          ? " Downloads are named after the uploaded file unless you type a name."
          : ` Verified accounts can add up to ${MAX_PROJECT_FILES_VERIFIED} files.`}
      </p>
    </div>
  );
}

interface FileSlotRowProps {
  index: number;
  slot: FileSlot;
  showNumber: boolean;
  canRemove: boolean;
  onPatch: (patch: Partial<FileSlot>) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}

// One slot owns its own uploader so each file shows its own progress.
function FileSlotRow({ index, slot, showNumber, canRemove, onPatch, onRemove, onError }: FileSlotRowProps) {
  const uploadFile = useUploadProjectFile({ maxBytes: MAX_PROJECT_FILE_BYTES });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const path = await uploadFile.mutateAsync(file);
      // Replacing a file that was only uploaded in this session: the old object is now unreferenced.
      if (slot.file_path && !slot.id) void supabase.storage.from("private-content").remove([slot.file_path]);
      // id: null — a different file is a new file; the old saved row (if any) is dropped when the project saves.
      onPatch({ id: null, file_path: path, original_name: file.name, size_bytes: file.size });
    } catch (err) {
      onError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  const sizeLabel = formatFileSize(slot.size_bytes);

  return (
    <div className="rounded-xl border border-border bg-surface p-3 mb-3">
      <div className="flex items-center gap-2">
        {showNumber && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-canvas border border-border text-xs font-medium text-ink-muted flex items-center justify-center">
            {index + 1}
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-canvas text-sm text-ink-muted disabled:opacity-50"
        >
          <FileUp size={16} className="flex-shrink-0" />
          <span className="truncate text-left">
            {uploadFile.isPending
              ? `Uploading… ${uploadFile.progress}%`
              : slot.original_name
                ? `${slot.original_name}${sizeLabel ? ` · ${sizeLabel}` : ""}`
                : "Choose file"}
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={uploadFile.isPending}
            aria-label={`Remove file ${index + 1}`}
            className="flex-shrink-0 p-2 text-ink-muted disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />

      {slot.file_path && (
        <input
          type="text"
          value={slot.display_name}
          maxLength={100}
          onChange={(e) => onPatch({ display_name: e.target.value })}
          placeholder={slot.original_name ? stripExtension(slot.original_name) : "Name of the downloaded file"}
          aria-label={`Download name for file ${index + 1}`}
          className="w-full mt-2 px-3 py-2.5 rounded-lg border border-border bg-canvas text-sm text-ink placeholder:text-ink-muted/70"
        />
      )}
    </div>
  );
}
