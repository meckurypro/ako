// src/pages/BookReader.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Settings2, X } from "lucide-react";
import { useProject, useHasPurchased, isProjectFree, useGetProjectFile } from "../hooks/useProjects";
import { useBookDetails, usePdfReadingProgress, useSavePdfReadingProgress } from "../hooks/useProjectTypeDetails";
import { useIsProjectMember } from "../hooks/useProjectMembers";
import { useAuth } from "../hooks/useAuth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

type ReaderTheme = "light" | "sepia" | "dark";

// Classic PDF "night mode" trick — since pages render as raster
// images (see the header note on why: content is a scanned/exported
// PDF, not structured text), theme/brightness are applied as CSS
// filters on the canvas rather than real color changes. invert+hue-
// rotate flips a white page dark while keeping (most) colors sane;
// sepia warms it without inverting.
const THEME_FILTER: Record<ReaderTheme, string> = {
  light: "none",
  sepia: "sepia(0.35) brightness(0.97) contrast(0.97)",
  dark: "invert(0.92) hue-rotate(180deg) brightness(0.92) contrast(0.88)",
};

const THEME_BG: Record<ReaderTheme, string> = {
  light: "#F7F4EF",
  sepia: "#EFE4CC",
  dark: "#0C0C0B",
};

const THEME_CHROME_BG: Record<ReaderTheme, string> = {
  light: "rgba(247, 244, 239, 0.92)",
  sepia: "rgba(239, 228, 204, 0.92)",
  dark: "rgba(12, 12, 11, 0.92)",
};

const THEME_INK: Record<ReaderTheme, string> = {
  light: "#1F1D1A",
  sepia: "#3A2E1F",
  dark: "#F9F8F5",
};

export function BookReader() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project } = useProject(projectId);
  const { data: bookDetails } = useBookDetails(projectId);
  const hasPurchasedQuery = useHasPurchased(projectId ?? "");
  const isMemberQuery = useIsProjectMember(projectId ?? "", project?.is_private ?? false);
  const getBookFile = useGetProjectFile();
  const { data: savedProgress } = usePdfReadingProgress(projectId, user?.id);
  const saveProgress = useSavePdfReadingProgress(projectId ?? "", user?.id);

  const isOwner = !!user && project?.owner_id === user.id;
  const isFree = project ? isProjectFree(project) : false;
  const privacyBlocked = !!project?.is_private && !isOwner && !isMemberQuery.data;
  const hasAccess = !privacyBlocked && (isOwner || !!hasPurchasedQuery.data || isFree);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(
    () => (localStorage.getItem("ako-reader-theme") as ReaderTheme | null) ?? "light"
  );
  const [brightness, setBrightness] = useState<number>(
    () => Number(localStorage.getItem("ako-reader-brightness")) || 100
  );
  const [resumeApplied, setResumeApplied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("ako-reader-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("ako-reader-brightness", String(brightness));
  }, [brightness]);

  // Redirect an authored book here by mistake straight to its own
  // reader/builder — this page only knows how to render a PDF.
  useEffect(() => {
    if (bookDetails?.content_source === "authored" && projectId) {
      navigate(`/books/${projectId}`, { replace: true });
    }
  }, [bookDetails, projectId, navigate]);

  // Load the PDF once access is confirmed and a signed URL can be
  // minted. get-project-file additionally checks allow_read_in_app
  // for kind: "book"/action: "stream" — a host who only turned on
  // Download will get a clean rejection here, surfaced as `error`.
  useEffect(() => {
    if (!projectId || !hasAccess || bookDetails?.content_source === "authored") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = await getBookFile.mutateAsync({ projectId: projectId!, kind: "book", action: "stream" });
        const doc = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't open this book.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, hasAccess, bookDetails?.content_source]);

  // Resume where the reader left off, once (not on every re-render) —
  // clamped in case the file changed and has fewer pages now.
  useEffect(() => {
    if (!resumeApplied && numPages > 0 && savedProgress?.current_page) {
      setPageNum(Math.min(Math.max(1, savedProgress.current_page), numPages));
      setResumeApplied(true);
    } else if (!resumeApplied && numPages > 0) {
      setResumeApplied(true);
    }
  }, [numPages, savedProgress, resumeApplied]);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const unscaled = page.getViewport({ scale: 1 });
    // Fit to container, capped so a landscape page (or a very wide
    // window) doesn't blow past the available height either.
    const scale =
      Math.min(containerWidth / unscaled.width, containerHeight / unscaled.height) * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
    canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [pdf, pageNum]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Re-render on resize/rotate — the canvas is sized to the
  // container, so a viewport change means a fresh render, not just
  // CSS scaling (which would blur it).
  useEffect(() => {
    function onResize() {
      renderPage();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  // Debounced progress save — fires ~900ms after the reader settles
  // on a page, not on every single turn while someone's flipping fast.
  useEffect(() => {
    if (!user || !numPages || !resumeApplied) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveProgress.mutate({ currentPage: pageNum, totalPages: numPages });
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, numPages, user, resumeApplied]);

  function goPrev() {
    setPageNum((p) => Math.max(1, p - 1));
  }
  function goNext() {
    setPageNum((p) => Math.min(numPages, p + 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // not a swipe — let the tap-zone handler below decide
    if (dx < 0) goNext();
    else goPrev();
  }

  // Tap zones — left third/right third turn pages, the middle toggles
  // the top/bottom chrome. Matches Apple Books' tap-to-navigate model.
  function handleTapZone(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goPrev();
    else if (x > third * 2) goNext();
    else setChromeVisible((v) => !v);
  }

  const progressPct = numPages > 0 ? Math.round((pageNum / numPages) * 100) : 0;

  if (!project || !bookDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="text-ink">You don't have access to this book yet.</p>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
          Go to project page
        </button>
      </div>
    );
  }

  if (bookDetails.content_source === "upload" && !bookDetails.allow_read_in_app) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="text-ink">The host only made this available for download, not in-app reading.</p>
        <button onClick={() => navigate(`/projects/${projectId}`)} className="text-accent text-sm font-medium">
          Go to project page
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: THEME_BG[theme] }}>
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-3 transition-transform duration-200 ${
          chromeVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ backgroundColor: THEME_CHROME_BG[theme] }}
      >
        <button onClick={() => navigate(-1)} style={{ color: THEME_INK[theme] }}>
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm font-medium truncate max-w-[60%]" style={{ color: THEME_INK[theme] }}>
          {project.title}
        </p>
        <button onClick={() => setSettingsOpen(true)} style={{ color: THEME_INK[theme] }}>
          <Settings2 size={20} />
        </button>
      </div>

      {/* Page surface */}
      <div
        ref={containerRef}
        onClick={handleTapZone}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
      >
        {loading && <p className="text-ink-muted text-sm">Opening book…</p>}
        {error && <p className="text-danger text-sm px-6 text-center">{error}</p>}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            style={{
              filter: `${THEME_FILTER[theme]} brightness(${brightness}%)`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              borderRadius: "2px",
            }}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-4 pt-2 pb-4 transition-transform duration-200 ${
          chromeVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ backgroundColor: THEME_CHROME_BG[theme] }}
      >
        <div className="flex items-center gap-3">
          <button onClick={goPrev} disabled={pageNum <= 1} style={{ color: THEME_INK[theme] }} className="disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          <input
            type="range"
            min={1}
            max={Math.max(numPages, 1)}
            value={pageNum}
            onChange={(e) => setPageNum(Number(e.target.value))}
            className="flex-1 accent-current"
            style={{ color: THEME_INK[theme] }}
          />
          <button
            onClick={goNext}
            disabled={pageNum >= numPages}
            style={{ color: THEME_INK[theme] }}
            className="disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <p className="text-center text-xs mt-1" style={{ color: THEME_INK[theme], opacity: 0.7 }}>
          Page {pageNum} of {numPages || "…"} · {progressPct}%
        </p>
      </div>

      {/* Settings sheet — theme + brightness */}
      {settingsOpen && (
        <div className="fixed inset-0 z-30 flex items-end" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full bg-surface rounded-t-2xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-ink">Reading settings</p>
              <button onClick={() => setSettingsOpen(false)} className="text-ink-muted">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs font-medium text-ink-muted mb-2">Theme</p>
            <div className="flex gap-2 mb-5">
              {(["light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize ${
                    theme === t ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted"
                  }`}
                  style={{ backgroundColor: theme === t ? undefined : THEME_BG[t] }}
                >
                  {t}
                </button>
              ))}
            </div>

            <p className="text-xs font-medium text-ink-muted mb-2 flex items-center gap-1.5">
              <Sun size={13} /> Brightness
            </p>
            <input
              type="range"
              min={40}
              max={150}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
