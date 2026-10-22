// src/components/ProjectFilesList.tsx
//
// The files of a multi-file File project on its own page, like a tracklist: name and size for everyone, a Download
// button per file for people with access (the owner, a buyer, or anyone on a free project), a lock for the rest.
// Price and privacy belong to the project, so access is the same for every file in the list.
import { Download, File as FileIcon, Lock } from "lucide-react";
import type { ProjectFile } from "../hooks/useProjectFiles";
import { formatFileSize } from "../lib/fileProject";

interface ProjectFilesListProps {
  files: ProjectFile[];
  hasAccess: boolean;
  /** True while any file is downloading (only one at a time). */
  busy: boolean;
  /** The file currently downloading, if any, and its progress (0-100, or null while preparing). */
  activeFileId: string | null;
  progress: number | null;
  onDownload: (file: ProjectFile) => void;
}

export function ProjectFilesList({ files, hasAccess, busy, activeFileId, progress, onDownload }: ProjectFilesListProps) {
  return (
    <ul className="mt-3 rounded-2xl border border-border/60 bg-canvas divide-y divide-border/60 overflow-hidden">
      {files.map((file, index) => {
        const active = busy && activeFileId === file.id;
        const size = formatFileSize(file.size_bytes);
        return (
          <li key={file.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-shrink-0 w-6 text-center text-xs font-medium text-ink-muted">{index + 1}</span>
            <FileIcon size={16} className="flex-shrink-0 text-ink-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">{file.download_name}</p>
              {size && <p className="text-xs text-ink-muted">{size}</p>}
            </div>
            {hasAccess ? (
              <button
                type="button"
                onClick={() => onDownload(file)}
                disabled={busy}
                className="flex-shrink-0 flex items-center gap-1.5 text-sm text-accent font-medium disabled:opacity-50"
              >
                <Download size={15} />
                {active ? (progress != null ? `${progress}%` : "Preparing…") : "Download"}
              </button>
            ) : (
              <Lock size={15} className="flex-shrink-0 text-ink-muted" aria-label="Locked" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
