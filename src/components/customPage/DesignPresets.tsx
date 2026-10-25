// src/components/customPage/DesignPresets.tsx
// The Design tab's presets dropdown. A preset remembers the tab's choices (style, template, animation, share button) so a
// creator who experiments and loses track of what they had can get it back in one tap. Presets belong to the person, so
// they are available on all their pages. Mirrors the native one in Ako.native.
import { useState } from "react";
import { Check, ChevronDown, Loader2, Trash2 } from "lucide-react";
import {
  PRESET_LIMIT,
  PRESET_NAME_MAX,
  applyPresetToConfig,
  describePreset,
  designOfConfig,
  presetMatchesConfig,
  type CustomPageConfig,
  type DesignPreset,
} from "../../lib/customPage";
import { useDeleteDesignPreset, useMyDesignPresets, useSaveDesignPreset } from "../../hooks/useCustomPages";
import { friendlyError } from "../../lib/friendlyError";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { INPUT } from "./EditorParts";

export function DesignPresets({ config, onChange }: { config: CustomPageConfig; onChange: (fn: (c: CustomPageConfig) => CustomPageConfig) => void }) {
  const toast = useToast();
  const presets = useMyDesignPresets();
  const save = useSaveDesignPreset();
  const remove = useDeleteDesignPreset();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<DesignPreset | null>(null);

  const list = presets.data ?? [];
  const current = list.find((p) => presetMatchesConfig(config, p.design)) ?? null;
  const trimmed = name.trim();
  const sameName = list.find((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null;
  const full = list.length >= PRESET_LIMIT && !sameName;

  function apply(p: DesignPreset) {
    onChange((c) => applyPresetToConfig(c, p.design));
    setOpen(false);
    toast(`Applied “${p.name}”`);
  }

  async function saveCurrent() {
    if (!trimmed || full) return;
    try {
      // The same name replaces that preset — the way to update one after tweaking it.
      await save.mutateAsync({ name: trimmed, design: designOfConfig(config), id: sameName?.id });
      toast(sameName ? `Updated “${trimmed}”` : `Saved “${trimmed}”`, { variant: "success" });
      setName("");
    } catch (err) {
      toast(friendlyError(err, "Couldn't save that preset. Please try again."), { variant: "error" });
    }
  }

  async function confirmDelete() {
    const p = toDelete;
    setToDelete(null);
    if (!p) return;
    try {
      await remove.mutateAsync(p.id);
      toast(`Deleted “${p.name}”`);
    } catch (err) {
      toast(friendlyError(err, "Couldn't delete that preset. Please try again."), { variant: "error" });
    }
  }

  return (
    <div className="mb-6">
      <p className="text-[13px] font-medium text-ink mb-1.5">Presets</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="design-presets-panel"
        className="w-full flex items-center justify-between gap-3 rounded-xl bg-surface border border-border px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[15px] text-ink truncate">{current ? current.name : "Choose a preset"}</span>
          <span className="block text-xs text-ink-muted truncate">
            {current ? describePreset(current.design) : list.length ? "This design isn't saved as a preset" : "Save the look you like and bring it back any time"}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div id="design-presets-panel" className="mt-2 rounded-2xl bg-surface border border-border overflow-hidden">
          {presets.isLoading ? (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-ink-muted">
              <Loader2 size={16} className="animate-spin" /> Loading your presets…
            </p>
          ) : presets.isError ? (
            <p className="px-4 py-4 text-sm text-ink-muted">
              Couldn't load your presets.{" "}
              <button type="button" onClick={() => void presets.refetch()} className="underline underline-offset-2 text-ink">
                Try again
              </button>
            </p>
          ) : list.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-muted leading-snug">No presets yet. Set up your style, template and animation below, then save it here.</p>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {list.map((p) => {
                const active = current?.id === p.id;
                return (
                  <li key={p.id} className="flex items-stretch">
                    <button type="button" onClick={() => apply(p)} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left hover:bg-ink/5">
                      <span className="w-5 shrink-0 text-accent">{active && <Check size={18} aria-label="Current design" />}</span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-ink truncate">{p.name}</span>
                        <span className="block text-xs text-ink-muted truncate">{describePreset(p.design)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(p)}
                      aria-label={`Delete preset ${p.name}`}
                      className="px-4 text-ink-muted hover:text-danger"
                    >
                      <Trash2 size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-border p-3">
            <label className="block text-xs text-ink-muted mb-1.5" htmlFor="design-preset-name">
              Save this design as a preset
            </label>
            <div className="flex gap-2">
              <input
                id="design-preset-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, PRESET_NAME_MAX))}
                onKeyDown={(e) => e.key === "Enter" && void saveCurrent()}
                placeholder="e.g. Night poster"
                maxLength={PRESET_NAME_MAX}
                className={`${INPUT} !py-2.5 flex-1 min-w-0`}
              />
              <button
                type="button"
                onClick={() => void saveCurrent()}
                disabled={!trimmed || full || save.isPending}
                className="shrink-0 rounded-xl bg-ink text-canvas text-sm font-medium px-4 disabled:opacity-40"
              >
                {save.isPending ? <Loader2 size={16} className="animate-spin" /> : sameName ? "Replace" : "Save"}
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-1.5 leading-snug">
              {full
                ? `You can keep up to ${PRESET_LIMIT} presets. Delete one to save another.`
                : sameName
                  ? `This will replace “${sameName.name}” with your current design.`
                  : "Saves your style, template, animation and share button. Colours and content aren't included."}
            </p>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this preset?"
          description={`“${toDelete.name}” will be removed from your presets. Pages already using this design aren't changed.`}
          confirmLabel="Delete"
          themed
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
