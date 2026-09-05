// src/pages/CreateChoice.tsx
import { useNavigate } from "react-router-dom";
import { X, PenSquare, FolderPlus, ChevronRight } from "lucide-react";

// The "+" on Feed's header opens this. Styled as a bottom sheet
// (backdrop + rounded-top panel) to match the Instagram-style
// "Create" reference — two options for now (Post, Project); more
// creation types can be appended to CHOICES later without touching
// the layout.
const CHOICES = [
  {
    to: "/compose",
    icon: PenSquare,
    label: "Post",
    description: "Share a thought with your followers",
  },
  {
    to: "/projects/new",
    icon: FolderPlus,
    label: "Project",
    description: "List a file, event, course, or paid link",
  },
] as const;

export function CreateChoice() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-end justify-center"
      onClick={() => navigate(-1)}
    >
      <div
        className="w-full max-w-xl bg-canvas rounded-t-[28px] pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <span className="w-10 h-1.5 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="font-display text-xl text-ink">Create</h2>
          <button onClick={() => navigate(-1)} aria-label="Close" className="text-ink-muted p-1">
            <X size={22} />
          </button>
        </div>

        <div className="px-3 pb-2">
          {CHOICES.map(({ to, icon: Icon, label, description }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-surface active:bg-surface text-left"
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-accent-soft text-accent shrink-0">
                <Icon size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-ink">{label}</span>
                <span className="block text-xs text-ink-muted truncate">{description}</span>
              </span>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
