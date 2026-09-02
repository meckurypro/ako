// src/components/MentionTextarea.tsx
import { useRef, useState } from "react";
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
  // Opt-in since not every MentionTextarea usage wants the bold/italic/
  // strikethrough/underline toolbar rendered above it.
  showFormatToolbar?: boolean;
}

// Matches an "@" that starts a mention right up to the cursor —
// either at the very start of the text or after whitespace, with
// no space between the @ and the cursor yet (so "email@x.com" or a
// finished "@user " doesn't re-trigger the dropdown).
const MENTION_TRIGGER = /(?:^|\s)@(\w*)$/;

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
  maxLength,
  className,
  autoFocus,
  showFormatToolbar,
}: MentionTextareaProps) {
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
        ref={textareaRef}
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
              key={person.id}
              onClick={() => selectMention(person.username)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface"
              type="button"
            >
              <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm text-ink truncate">{person.display_name}</span>
                <span className="block text-xs text-ink-muted truncate">@{person.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
