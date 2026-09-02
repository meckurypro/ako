import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, FileUp } from "lucide-react";
import {
  useCreateProject,
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "../hooks/useProjects";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { useUploadProjectFile } from "../hooks/useUploadProjectFile";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { TopicPicker } from "../components/TopicPicker";

export function CreateProject() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const uploadThumbnail = useUploadProjectThumbnail();
  const uploadFile = useUploadProjectFile();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("other");
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set());
  const [externalUrl, setExternalUrl] = useState("");
  const [priceUsd, setPriceUsd] = useState("0");
  const [showPromo, setShowPromo] = useState(false);
  const [promoPriceUsd, setPromoPriceUsd] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailRatio, setThumbnailRatio] = useState<{ width: number; height: number } | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTopic(interestId: string) {
    setTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        next.add(interestId);
      }
      return next;
    });
  }

  async function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { url, width, height } = await uploadThumbnail.mutateAsync(file);
      setThumbnailUrl(url);
      setThumbnailRatio({ width, height });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail upload failed.");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const path = await uploadFile.mutateAsync(file);
      setFilePath(path);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!externalUrl.trim() && !filePath) {
      setError("Add a link or upload a file — at least one is required.");
      return;
    }

    const price = parseFloat(priceUsd) || 0;
    if (price > 0 && !filePath && !externalUrl.trim()) {
      setError("Paid projects need something to unlock — a link or a file.");
      return;
    }

    let promoPrice: number | null = null;
    if (showPromo && promoPriceUsd.trim() !== "") {
      promoPrice = parseFloat(promoPriceUsd);
      if (Number.isNaN(promoPrice) || promoPrice < 0) {
        setError("Promo price must be a valid amount.");
        return;
      }
      if (promoPrice >= price) {
        setError("Promo price must be lower than the actual price.");
        return;
      }
    }

    try {
      await createProject.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
        external_url: externalUrl.trim() || undefined,
        file_path: filePath ?? undefined,
        thumbnail_url: thumbnailUrl ?? undefined,
        thumbnail_width: thumbnailRatio?.width,
        thumbnail_height: thumbnailRatio?.height,
        price_usd: price,
        promo_price_usd: promoPrice,
        topic_ids: Array.from(topicIds),
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create project.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">New project</h2>

        <form onSubmit={handleSubmit}>
          {/* Thumbnail — aspect ratio matches whatever was actually
              uploaded, not a hardcoded 16:9. Falls back to 16:9 only
              as the empty-state placeholder before anything is chosen. */}
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            style={{
              aspectRatio: thumbnailRatio
                ? `${thumbnailRatio.width} / ${thumbnailRatio.height}`
                : "16 / 9",
            }}
            className="w-full bg-surface border border-border rounded-xl flex items-center justify-center mb-4 overflow-hidden"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-ink-muted flex flex-col items-center gap-1">
                <ImageIcon size={24} />
                <span className="text-sm">
                  {uploadThumbnail.isPending ? "Uploading…" : "Add thumbnail"}
                </span>
              </div>
            )}
          </button>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleThumbnailSelect}
            className="hidden"
          />

          <FormField
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Project type — dropdown on mobile is friendliest for 8
              options; a radio group of this size gets unwieldy. */}
          <div className="mb-4">
            <label htmlFor="project_type" className="block text-sm font-medium text-ink-muted mb-1.5">
              Project type
            </label>
            <select
              id="project_type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              {PROJECT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink resize-none
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Topics <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <TopicPicker selected={topicIds} onToggle={toggleTopic} />
            <p className="text-xs text-ink-muted mt-1.5">
              Helps people browsing find this project, and powers "similar projects" for it.
            </p>
          </div>

          <FormField
            id="external_url"
            label="Link (video, book, article, etc.)"
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://"
          />

          {/* Optional hosted file */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Hosted file (optional — for digital products)
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFile.isPending}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink-muted disabled:opacity-50"
            >
              <FileUp size={16} />
              {uploadFile.isPending ? "Uploading…" : fileName ?? "Choose file"}
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <p className="text-xs text-ink-muted mt-1">
              Stored privately — only unlocked for buyers or if the project is free.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Price (USD)</label>
            <input
              type="number"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              min={0}
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <p className="text-xs text-ink-muted mt-1">Set to 0 for a free project.</p>
          </div>

          {/* Promo price — optional. Leaving it off shows only the
              main price with no strikethrough, exactly as before. */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-muted mb-2">
              <input
                type="checkbox"
                checked={showPromo}
                onChange={(e) => {
                  setShowPromo(e.target.checked);
                  if (!e.target.checked) setPromoPriceUsd("");
                }}
                className="rounded border-border"
              />
              Add a promo price
            </label>

            {showPromo && (
              <>
                <input
                  type="number"
                  value={promoPriceUsd}
                  onChange={(e) => setPromoPriceUsd(e.target.value)}
                  min={0}
                  step="0.01"
                  placeholder="Promo price"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                <p className="text-xs text-ink-muted mt-1">
                  Shown next to the actual price, which will appear crossed out. Must be lower than the actual price.
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={createProject.isPending}>
            Publish project
          </Button>
        </form>
      </div>
    </div>
  );
}
