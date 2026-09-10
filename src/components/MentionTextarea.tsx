// src/components/MentionTextarea.tsx
import { forwardRef, useRef, type Ref } from "react";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { useMentionSuggestions } from "../hooks/useMentions";
import { FormatToolbar } from "./FormatToolbar";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
  id?: string;
  // Opt-in since not every MentionTextarea usage wants the bold/italic/
  // strikethrough/underline toolbar rendered above it.
  showFormatToolbar?: boolean;
}

// Matches an "@" that starts a mention right up to the cursor —
// either at the very start of the text or after whitespace, with
// no space between the @ and the cursor yet (so "email@x.com" or a
// finished "@user " doesn't re-trigger the dropdown).
const MENTION_TRIGGER = /(?:^|\s)@(\w*)$/;

/** Keeps two refs to the same node in sync — used below so callers
 *  (e.g. StanceComposer, which needs to imperatively .focus() the
 *  textarea after switching stance tabs) can get a real ref to the
 *  underlying <textarea> DOM node, while this component still keeps
 *  its own internal ref for selectMention's cursor-position logic. */
function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(function MentionTextarea(
  { value, onChange, placeholder, rows = 8, maxLength, className, autoFocus, id, showFormatToolbar },
  forwardedRef
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const suggestionsQuery = useMentionSuggestions(mentionQuery ?? "");
  const suggestions = mentionQuery !== null ? suggestionsQuery.data ?? [] : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart ?? newValue.length;
    const upToCursor = newValue.slice(0, cursor);
    const match = upToCursor.match(MENTION_TRIGGER);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(username: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(MENTION_TRIGGER);
    if (!match) return;

    const startOfMention = cursor - match[0].length + (match[0].startsWith("@") ? 0 : 1);
    const newValue = `${value.slice(0, startOfMention)}@${username} ${value.slice(cursor)}`;
    onChange(newValue);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const newCursor = startOfMention + username.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    });
  }

  return (
    <div className="relative">
      {showFormatToolbar && (
        <FormatToolbar textareaRef={textareaRef} value={value} onChange={onChange} className="mb-1.5" />
      )}
      <textarea
        id={id}
        ref={mergeRefs(textareaRef, forwardedRef)}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={className}
      />

      {mentionQuery !== null && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-canvas border border-border rounded-xl shadow-lg py-1 z-20 max-h-56 overflow-y-auto">
          {suggestions.map((person) => (
            <button
              key={`${person.kind}-${person.id}`}
              onClick={() => selectMention(person.username)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface"
              type="button"
            >
              <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="block text-sm text-ink truncate">{person.display_name}</span>
                  {/* Only pages get a marker — profiles are the default/
                      unmarked case, since they're the far more common
                      mention target and a badge on every single row
                      would just be noise. */}
                  {person.kind === "page" && (
                    <Building2 size={12} className="text-ink-muted shrink-0" aria-label="Organization or brand page" />
                  )}
                </span>
                <span className="block text-xs text-ink-muted truncate">@{person.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
