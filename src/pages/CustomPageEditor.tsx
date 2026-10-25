// src/pages/CustomPageEditor.tsx
// /me/custom-pages/:id/edit — the staged editor. Work saves to the page's *draft* automatically; nothing reaches the
// public page until "Publish". The live preview uses the same renderer visitors get.
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Eye, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCustomPage, usePublishCustomPage, useSaveCustomPageDraft } from "../hooks/useCustomPages";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/friendlyError";
import { CustomPageRenderer } from "../components/customPage/CustomPageRenderer";
import { BrandColorFields } from "../components/customPage/ColorPicker";
import { DesignPresets } from "../components/customPage/DesignPresets";
import { FilePicker, Field, ImageList, INPUT, Section, SingleImage } from "../components/customPage/EditorParts";
import { BackgroundEditor, ForegroundEditor, MenuEditor } from "../components/customPage/MediaEditors";
import {
  ANIMATIONS,
  CTA_ACTIONS,
  DEFAULT_COLORS,
  LIMITS,
  STYLES,
  TEMPLATES,
  SHARE_LOOKS,
  SHARE_POSITIONS,
  resolveShare,
  ctaProblem,
  draftProblem,
  publishProblem,
  isHex,
  newCtaId,
  resolveDesign,
  type CtaAction,
  type CustomPageConfig,
  type CustomPageCta,
} from "../lib/customPage";

const STAGES = [
  { id: "identity", label: "Identity" },
  { id: "brand", label: "Brand" },
  { id: "media", label: "Pictures" },
  { id: "content", label: "Content" },
  { id: "buttons", label: "Buttons" },
  { id: "menu", label: "Menu" },
  { id: "contact", label: "Contact" },
  { id: "design", label: "Design" },
] as const;
type StageId = (typeof STAGES)[number]["id"];

type SaveState = "saved" | "saving" | "dirty" | "error";

export function CustomPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data: row, isLoading, isError } = useCustomPage(id);
  const save = useSaveCustomPageDraft();
  const publish = usePublishCustomPage();

  const [config, setConfig] = useState<CustomPageConfig | null>(null);
  const [stage, setStage] = useState<StageId>("identity");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const latest = useRef<CustomPageConfig | null>(null);
  const timer = useRef<number | null>(null);
  const inFlight = useRef<Promise<unknown> | null>(null);

  // Seed local state once from the server row; after that the editor is the source of truth.
  useEffect(() => {
    if (row && !config) {
      setConfig(row.draft ?? {});
      latest.current = row.draft ?? {};
    }
  }, [row, config]);

  // The preview is the heaviest thing on screen; let inputs (colour drag, typing) win the frame and the preview catch up.
  const deferredConfig = useDeferredValue(config);

  const problem = useMemo(() => (config ? draftProblem(config) : null), [config]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!id || !latest.current) return true;
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const cfg = latest.current;
    const p = draftProblem(cfg);
    if (p) {
      setSaveState("error");
      setSaveError(p);
      return false;
    }
    setSaveState("saving");
    setSaveError(null);
    try {
      const run = save.mutateAsync({ id, config: cfg });
      inFlight.current = run;
      await run;
      // Edits made while that request was in flight are still pending — don't claim they're saved.
      setSaveState(latest.current === cfg ? "saved" : "dirty");
      return true;
    } catch (err) {
      setSaveState("error");
      setSaveError(friendlyError(err, "Couldn't save your changes."));
      return false;
    }
  }, [id, save]);

  const update = useCallback(
    (fn: (c: CustomPageConfig) => CustomPageConfig) => {
      setConfig((prev) => {
        const next = fn(prev ?? {});
        latest.current = next;
        return next;
      });
      setSaveState("dirty");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 1200);
    },
    [flush],
  );

  // Don't lose the last keystrokes when leaving.
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        void flush();
      }
    },
    [flush],
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  async function doPublish() {
    if (!id) return;
    const blocker = config ? publishProblem(config) : null;
    if (blocker) {
      toast(blocker.message, { variant: "error", duration: 3500 });
      setStage(blocker.stage);
      return;
    }
    if (!(await flush())) return;
    try {
      await publish.mutateAsync(id);
      toast("Published. Your page is live.", { variant: "success" });
      navigate(`/me/custom-pages/${id}`, { replace: true });
    } catch (err) {
      toast(friendlyError(err, "Couldn't publish. Please try again."), { variant: "error", duration: 3500 });
    }
  }

  if (isLoading || (row && !config)) {
    return <div className="min-h-screen bg-canvas p-4 text-ink-muted">Loading…</div>;
  }
  if (isError || !row || !config || !user) {
    return (
      <div className="min-h-screen bg-canvas p-6 text-center">
        <p className="text-ink font-medium mt-16">This page couldn't be found.</p>
        <button onClick={() => navigate("/me/custom-pages")} className="mt-4 text-accent text-sm font-medium">
          Back to your pages
        </button>
      </div>
    );
  }

  const ownerId = user.id;
  const pageId = row.id;
  const set = <K extends keyof CustomPageConfig>(key: K, patch: Partial<NonNullable<CustomPageConfig[K]>>) =>
    update((c) => ({ ...c, [key]: { ...(c[key] as object | undefined), ...patch } }));

  const design = resolveDesign(config);
  const ctas = config.ctas ?? [];
  const setCtas = (next: CustomPageCta[]) => update((c) => ({ ...c, ctas: next }));
  const patchCta = (i: number, patch: Partial<CustomPageCta>) => setCtas(ctas.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const statusText =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : saveState === "error" ? "Not saved" : "Draft saved";

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <div className="lg:w-[520px] lg:shrink-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-border pb-28">
        <header className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-border">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <button
              onClick={async () => {
                await flush();
                navigate(`/me/custom-pages/${pageId}`);
              }}
              aria-label="Back"
              className="p-1.5 -ml-1.5 text-ink"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base font-semibold text-ink truncate">{config.identity?.name || row.name}</h1>
              <p className={`text-xs ${saveState === "error" ? "text-danger" : "text-ink-muted"}`}>{saveState === "error" && saveError ? saveError : statusText}</p>
            </div>
            <button onClick={() => setPreviewOpen(true)} className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent text-sm font-medium px-3.5 py-2">
              <Eye size={15} /> Preview
            </button>
            <button
              onClick={() => void doPublish()}
              disabled={publish.isPending || !!problem}
              className="rounded-full bg-cta text-canvas text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {publish.isPending ? "Publishing…" : row.is_published ? "Publish changes" : "Publish"}
            </button>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 no-scrollbar" aria-label="Sections">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${stage === s.id ? "bg-ink text-canvas" : "bg-surface border border-border text-ink-muted"}`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="px-4 pt-6 max-w-xl mx-auto">
          {stage === "identity" && (
            <Section title="Page identity" intro="The name, tagline and message at the top of your page.">
              <Field label="Page name" count={(config.identity?.name ?? "").length} max={LIMITS.name}>
                <input className={INPUT} value={config.identity?.name ?? ""} maxLength={LIMITS.name + 20} onChange={(e) => set("identity", { name: e.target.value })} />
              </Field>
              <Field label="Tagline" hint="Optional. One short line." count={(config.identity?.tagline ?? "").length} max={LIMITS.tagline}>
                <input className={INPUT} value={config.identity?.tagline ?? ""} onChange={(e) => set("identity", { tagline: e.target.value })} />
              </Field>
              <SingleImage label="Icon or logo" hint="Square works best." square path={config.identity?.icon_path} ownerId={ownerId} pageId={pageId} onChange={(p) => set("identity", { icon_path: p })} />
              <Field label="Page message" hint="A welcome note or short description." count={(config.identity?.intro ?? "").length} max={LIMITS.intro}>
                <textarea className={`${INPUT} min-h-[130px] resize-y`} value={config.identity?.intro ?? ""} onChange={(e) => set("identity", { intro: e.target.value })} />
              </Field>
              <Field label="Copyright line" hint="Optional. Shown in the footer." count={(config.identity?.copyright ?? "").length} max={LIMITS.copyright}>
                <input className={INPUT} value={config.identity?.copyright ?? ""} onChange={(e) => set("identity", { copyright: e.target.value })} />
              </Field>
            </Section>
          )}

          {stage === "brand" && (
            <Section title="Brand" intro="Your colours and the images across the top of the page.">
              <BrandColorFields
                colors={{
                  primary: isHex(config.brand?.primary) ? config.brand!.primary! : DEFAULT_COLORS.primary,
                  secondary: isHex(config.brand?.secondary) ? config.brand!.secondary! : DEFAULT_COLORS.secondary,
                  accent: isHex(config.brand?.accent) ? config.brand!.accent! : DEFAULT_COLORS.accent,
                }}
                onChange={(k, hex) => set("brand", { [k]: hex })}
              />
              <ImageList
                label="Hero images"
                hint="These slide across the top. The first one is what people see first."
                items={config.brand?.hero ?? []}
                max={LIMITS.hero}
                ownerId={ownerId}
                pageId={pageId}
                onChange={(hero) => set("brand", { hero })}
              />
            </Section>
          )}

          {stage === "media" && (
            <Section title="Pictures" intro="A background behind your page, and a picture laid over the top of it.">
              <BackgroundEditor
                config={config}
                ownerId={ownerId}
                pageId={pageId}
                onChange={(background) =>
                  update((c) => {
                    const { background: _gone, ...brand } = c.brand ?? {};
                    void _gone;
                    return { ...c, brand: background ? { ...brand, background } : brand };
                  })
                }
              />
              <div className="my-6 border-t border-border" />
              <ForegroundEditor
                config={config}
                ownerId={ownerId}
                pageId={pageId}
                onChange={(foreground) =>
                  update((c) => {
                    const { foreground: _gone, ...rest } = c;
                    void _gone;
                    return foreground ? { ...rest, foreground } : rest;
                  })
                }
              />
            </Section>
          )}

          {stage === "menu" && (
            <Section title="Menu" intro="Links that glide visitors to a part of your page.">
              <MenuEditor config={config} onChange={(nav) => update((c) => ({ ...c, nav }))} />
            </Section>
          )}

          {stage === "content" && (
            <Section title="Content" intro="A document and a gallery. Both are optional.">
              <FilePicker
                label="Document"
                hint="A brochure, programme or menu. Visitors can read it in their browser or download it."
                accept="application/pdf"
                path={config.document?.path}
                fileName={config.document?.file_name}
                ownerId={ownerId}
                pageId={pageId}
                onChange={(f) =>
                  update((c) => {
                    if (!f) {
                      const { document: _removed, ...rest } = c;
                      void _removed;
                      return rest;
                    }
                    return { ...c, document: { ...c.document, path: f.path, file_name: f.name, title: c.document?.title || f.name.replace(/\.[^.]+$/, "") } };
                  })
                }
              />
              {config.document?.path && (
                <Field label="Document title" count={(config.document?.title ?? "").length} max={LIMITS.docTitle}>
                  <input className={INPUT} value={config.document?.title ?? ""} onChange={(e) => set("document", { title: e.target.value })} />
                </Field>
              )}
              <ImageList label="Gallery" captions items={config.gallery ?? []} max={LIMITS.gallery} ownerId={ownerId} pageId={pageId} onChange={(gallery) => update((c) => ({ ...c, gallery }))} />
            </Section>
          )}

          {stage === "buttons" && (
            <Section title="Buttons" intro={`Up to ${LIMITS.ctas} buttons. The first one is the main one.`}>
              <div className="flex flex-col gap-4">
                {ctas.map((cta, i) => {
                  const p = ctaProblem(cta, config);
                  return (
                    <div key={cta.id} className="rounded-2xl bg-surface border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-ink">Button {i + 1}</span>
                        <button type="button" aria-label="Remove button" onClick={() => setCtas(ctas.filter((_, k) => k !== i))} className="p-1.5 text-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Field label="Label" count={cta.label.length} max={LIMITS.ctaLabel}>
                        <input className={INPUT} value={cta.label} maxLength={LIMITS.ctaLabel + 10} onChange={(e) => patchCta(i, { label: e.target.value })} />
                      </Field>
                      <Field label="What it does">
                        <select
                          className={INPUT}
                          value={cta.action}
                          onChange={(e) => patchCta(i, { action: e.target.value as CtaAction, url: undefined, file_path: undefined, file_name: undefined })}
                        >
                          {CTA_ACTIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-ink-muted mt-1.5">{CTA_ACTIONS.find((a) => a.value === cta.action)?.hint}</p>
                      </Field>
                      {(cta.action === "url" || cta.action === "ako") && (
                        <Field label={cta.action === "url" ? "Web address" : "Akọ link"}>
                          <input
                            className={INPUT}
                            inputMode="url"
                            autoCapitalize="none"
                            placeholder={cta.action === "url" ? "https://example.com" : "/your-project"}
                            value={cta.url ?? ""}
                            onChange={(e) => patchCta(i, { url: e.target.value.trim() })}
                          />
                        </Field>
                      )}
                      {cta.action === "download" && (
                        <FilePicker label="File to download" path={cta.file_path} fileName={cta.file_name} ownerId={ownerId} pageId={pageId} onChange={(f) => patchCta(i, { file_path: f?.path, file_name: f?.name })} />
                      )}
                      {p && <p className="text-xs text-danger -mt-2">{p}</p>}
                    </div>
                  );
                })}
              </div>
              {ctas.length < LIMITS.ctas && (
                <button
                  type="button"
                  onClick={() => setCtas([...ctas, { id: newCtaId(ctas), label: "", action: "url" }])}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent text-sm font-medium px-4 py-2.5"
                >
                  <Plus size={16} /> Add a button
                </button>
              )}
            </Section>
          )}

          {stage === "contact" && (
            <Section title="Contact and messages" intro="Everything here is optional.">
              <Field label="Email">
                <input className={INPUT} type="email" value={config.contact?.email ?? ""} onChange={(e) => set("contact", { email: e.target.value.trim() })} />
              </Field>
              <Field label="Phone">
                <input className={INPUT} type="tel" value={config.contact?.phone ?? ""} onChange={(e) => set("contact", { phone: e.target.value })} />
              </Field>
              <Field label="Address" count={(config.contact?.address ?? "").length} max={LIMITS.address}>
                <textarea className={`${INPUT} min-h-[80px] resize-y`} value={config.contact?.address ?? ""} onChange={(e) => set("contact", { address: e.target.value })} />
              </Field>
              <label className="flex items-start gap-3 rounded-2xl bg-surface border border-border p-4 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 accent-[var(--color-accent)]" checked={config.engagement?.inquiry !== false} onChange={(e) => set("engagement", { inquiry: e.target.checked })} />
                <span>
                  <span className="block text-sm font-medium text-ink">Let visitors send a message</span>
                  <span className="block text-xs text-ink-muted mt-0.5 leading-snug">Adds a form. Messages arrive in your page's inbox and you get a notification.</span>
                </span>
              </label>
            </Section>
          )}

          {stage === "design" && (
            <Section title="Design" intro="Pick a style, a layout and how sections appear.">
              <DesignPresets config={config} onChange={update} />
              <Field label="Style">
                <div className="grid gap-2.5">
                  {STYLES.map((s) => (
                    <Choice key={s.id} active={design.style === s.id} title={s.label} blurb={s.blurb} onClick={() => set("design", { style: s.id })} />
                  ))}
                </div>
              </Field>
              <Field label="Template">
                <div className="grid gap-2.5">
                  {TEMPLATES.map((t) => (
                    <Choice key={t.id} active={design.template === t.id} title={t.label} blurb={t.blurb} onClick={() => set("design", { template: t.id })} />
                  ))}
                </div>
              </Field>
              <Field label="Animation" hint="Applied to sections as they scroll into view. Turned off automatically for people who prefer reduced motion.">
                <div className="flex flex-wrap gap-2">
                  {ANIMATIONS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => set("design", { animation: a.id })}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${design.animation === a.id ? "bg-ink text-canvas" : "bg-surface border border-border text-ink-muted"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Share button" hint="A small button on your page that lets visitors send it on.">
                <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface border border-border p-4 cursor-pointer">
                  <span className="text-sm font-medium text-ink">Show a share button</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="w-5 h-5 accent-[var(--color-accent)]"
                    checked={resolveShare(config).enabled}
                    onChange={(e) => set("share", { enabled: e.target.checked })}
                  />
                </label>
                {resolveShare(config).enabled && (
                  <div className="grid gap-2.5 mt-2.5">
                    {SHARE_LOOKS.map((l) => (
                      <Choice key={l.id} active={resolveShare(config).look === l.id} title={l.label} blurb={l.blurb} onClick={() => set("share", { look: l.id })} />
                    ))}
                  </div>
                )}
                {resolveShare(config).enabled && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-ink">Position</p>
                    <p className="text-xs text-ink-muted mt-0.5">Your template places it neatly near that spot, clear of your title and logo.</p>
                    <div className="grid gap-2.5 mt-2.5">
                      {SHARE_POSITIONS.map((x) => (
                        <Choice key={x.id} active={resolveShare(config).position === x.id} title={x.label} blurb={x.blurb} onClick={() => set("share", { position: x.id })} />
                      ))}
                    </div>
                  </div>
                )}
              </Field>
              <SingleImage
                label="Link preview image"
                hint="Shown when the link is shared on WhatsApp and other apps. Leave empty to use your first top image."
                path={config.seo?.share_image_path}
                ownerId={ownerId}
                pageId={pageId}
                onChange={(p) => set("seo", { share_image_path: p })}
              />
            </Section>
          )}
        </main>
      </div>

      {/* Desktop: live preview beside the form. */}
      <aside className="hidden lg:flex flex-1 items-start justify-center bg-ink/5 h-screen overflow-hidden p-8">
        <div className="w-[390px] h-full max-h-[820px] rounded-[2rem] border-[10px] border-ink overflow-y-auto bg-white shadow-2xl">
          <CustomPageRenderer config={deferredConfig ?? config} preview slug={row.slug} />
        </div>
      </aside>

      {/* Mobile: full-screen preview. */}
      {previewOpen && (
        <div className="lg:hidden fixed inset-0 z-[56] bg-canvas flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-ink text-canvas text-sm">
            <span>Preview — links are switched off here</span>
            <button onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="p-1">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CustomPageRenderer config={deferredConfig ?? config} preview slug={row.slug} />
          </div>
        </div>
      )}
    </div>
  );
}

function Choice({ active, title, blurb, onClick }: { active: boolean; title: string; blurb: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 text-left rounded-2xl p-4 border ${active ? "bg-accent-soft border-accent" : "bg-surface border-border"}`}
    >
      <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-accent text-canvas" : "border border-border"}`}>{active && <Check size={13} />}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-muted mt-0.5 leading-snug">{blurb}</span>
      </span>
    </button>
  );
}
