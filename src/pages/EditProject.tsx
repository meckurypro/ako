import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, FileUp } from "lucide-react";
import {
  useProject,
  useProjectTopics,
  useUpdateProject,
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_LABELS,
  type ProjectType,
  type ProjectStatus,
} from "../hooks/useProjects";
import { useUploadProjectThumbnail } from "../hooks/useUploadProjectThumbnail";
import { useUploadProjectFile } from "../hooks/useUploadProjectFile";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { TopicPicker } from "../components/TopicPicker";

const STATUS_OPTIONS: { value: ProjectStatus; label: string; hint: string }[] = [
  { value: "active", label: "Published", hint: "Visible to everyone" },
  { value: "draft", label: "Draft", hint: "Only visible to you, not published yet" },
  { value: "archived", label: "Archived", hint: "Hidden — was published before" },
];

export function EditProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useProject(projectId);
  const { data: existingTopicIds } = useProjectTopics(projectId);
  const updateProject = useUpdateProject();
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
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailRatio, setThumbnailRatio] = useState<{ width: number; height: number } | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [topicsHydrated, setTopicsHydrated] = useState(false);

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

  // Topics load via a separate query from the project itself, so
  // they get their own hydration guard rather than piggybacking on
  // `hydrated` — otherwise whichever query resolves first would
  // block the other's prefil.
  useEffect(() => {
    if (existingTopicIds && !topicsHydrated) {
      setTopicIds(new Set(existingTopicIds));
      setTopicsHydrated(true);
    }
  }, [existingTopicIds, topicsHydrated]);

  // Prefill the form once the project loads — guarded by `hydrated`
  // so a background refetch (e.g. after saving) doesn't stomp on
  // whatever the user is currently typing.
  useEffect(() => {
    if (project && !hydrated) {
      setTitle(project.title);
      setDescription(project.description ?? "");
      setProjectType(project.project_type);
      setExternalUrl(project.external_url ?? "");
      setPriceUsd(String(project.price_usd));
      setStatus(project.status);
      setThumbnailUrl(project.thumbnail_url);
      if (project.thumbnail_width && project.thumbnail_height) {
        setThumbnailRatio({ width: project.thumbnail_width, height: project.thumbnail_height });
      }
      setFilePath(project.file_path);
      if (project.promo_price_usd !== null) {
        setShowPromo(true);
        setPromoPriceUsd(String(project.promo_price_usd));
      }
      setHydrated(true);
    }
  }, [project, hydrated]);

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

    if (!projectId) return;

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
      await updateProject.mutateAsync({
        id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        project_type: projectType,
        external_url: externalUrl.trim() || null,
        file_path: filePath,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: thumbnailRatio?.width ?? null,
        thumbnail_height: thumbnailRatio?.height ?? null,
        price_usd: price,
        promo_price_usd: promoPrice,
        status,
        topic_ids: Array.from(topicIds),
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    }
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-6">Edit project</h2>

        <form onSubmit={handleSubmit}>
          {/* Status — publish / unpublish (draft) / archive, all from
              one control, in addition to the quick actions available
              directly from the project card's menu. */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Status</label>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer ${
                    status === opt.value ? "border-accent bg-accent-soft" : "border-border bg-canvas"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    className="accent-current"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{opt.label}</span>
                    <span className="block text-xs text-ink-muted">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Thumbnail — aspect ratio matches the stored dimensions */}
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
              {uploadFile.isPending ? "Uploading…" : fileName ?? (filePath ? "Replace file" : "Choose file")}
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

          <Button type="submit" loading={updateProject.isPending}>
            Save changes
          </Button>
        </form>
      </div>
    </div>
  );
}
