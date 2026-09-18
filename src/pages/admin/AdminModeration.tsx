import { useEffect, useState } from "react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { ArrowLeft } from "lucide-react";
import { ToggleSwitch } from "../../components/admin/ToggleSwitch";
import { useToast } from "../../components/Toast";
import {
  useModerationSettings,
  useToggleAiModeration,
  useToggleWordFilter,
  useModerationBlocklist,
  useSetModerationBlocklist,
} from "../../hooks/useAdmin";

export function AdminModeration() {
  const smartBack = useSmartBack();
  const toast = useToast();

  const { data: settings, isLoading: settingsLoading } = useModerationSettings();
  const toggleAiModeration = useToggleAiModeration();
  const toggleWordFilter = useToggleWordFilter();

  const { data: blocklistValue, isLoading: blocklistLoading } = useModerationBlocklist();
  const setBlocklist = useSetModerationBlocklist();

  // Local editable copy of the blocklist textarea — kept separate from
  // the query's own value so typing doesn't fight with refetches, and
  // seeded from the query once it loads (see the effect below).
  const [blocklistDraft, setBlocklistDraft] = useState("");
  const [blocklistSeeded, setBlocklistSeeded] = useState(false);

  useEffect(() => {
    if (!blocklistSeeded && blocklistValue !== undefined) {
      setBlocklistDraft(blocklistValue);
      setBlocklistSeeded(true);
    }
  }, [blocklistValue, blocklistSeeded]);

  const blocklistDirty = blocklistSeeded && blocklistDraft !== (blocklistValue ?? "");

  function handleSaveBlocklist() {
    setBlocklist.mutate(blocklistDraft, {
      onSuccess: () => toast("Filtered words updated.", { variant: "success" }),
      onError: () => toast("Couldn't save the filtered words. Try again.", { variant: "error" }),
    });
  }

  const isLoading = settingsLoading || blocklistLoading;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Content moderation</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <div className="space-y-4">
            {/* AI moderation — the Claude-based classifier that judges
                meaning/intent (hate, harassment, sexual content, etc).
                Independent of the word filter below: either can run on
                its own, both together, or both off. */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">AI content moderation</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Uses AI to judge meaning and intent — hate speech, harassment, sexual content,
                    and similar. Posts, comments, and reshares are screened before they're
                    published.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings?.ai_moderation_enabled ?? true}
                  disabled={toggleAiModeration.isPending}
                  onChange={(checked) => toggleAiModeration.mutate(checked)}
                />
              </div>
            </div>

            {/* Word filter — plain, deterministic blocklist match. Runs
                first (it's free) and doesn't need the AI toggle on. */}
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">Word filter</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Blocks exact words or phrases you choose below, with no AI judgment involved.
                    Works whether or not AI moderation is on.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings?.word_filter_enabled ?? true}
                  disabled={toggleWordFilter.isPending}
                  onChange={(checked) => toggleWordFilter.mutate(checked)}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-sm font-medium text-ink block mb-1.5">
                  Filtered words
                </label>
                <p className="text-xs text-ink-muted mb-2">
                  One word or phrase per line (or separate with commas). Not case-sensitive.
                </p>
                <textarea
                  value={blocklistDraft}
                  onChange={(e) => setBlocklistDraft(e.target.value)}
                  placeholder={"e.g.\nspam link\nbad phrase"}
                  rows={6}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSaveBlocklist}
                    disabled={!blocklistDirty || setBlocklist.isPending}
                    className="text-sm font-medium px-4 py-1.5 rounded-full bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {setBlocklist.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-muted px-1">
              When either check blocks a post or comment, the author sees why and their draft
              stays exactly as typed so they can edit and resubmit — nothing is discarded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
