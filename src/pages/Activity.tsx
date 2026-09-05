// src/pages/Activity.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Heart, History, CalendarClock, ChevronRight } from "lucide-react";
import { BottomNav } from "../components/BottomNav";

const ROWS = [
  {
    to: "/activity/saved",
    icon: Bookmark,
    label: "Saved",
    description: "Posts and projects you've bookmarked",
  },
  {
    to: "/activity/liked",
    icon: Heart,
    label: "Liked",
    description: "Posts and projects you've liked",
  },
  {
    to: "/activity/history",
    icon: History,
    label: "History",
    description: "Posts and projects you've viewed",
  },
  {
    to: "/activity/events",
    icon: CalendarClock,
    label: "Events & meetings",
    description: "Tickets, meetings, and rooms you're part of",
  },
] as const;

// Landing page for the Activity icon in BottomNav — replaces the old
// per-feature destinations (Feed's "Saved" tab, ProfilePage's
// "Activity" tab, standalone Bookmarks/SavedProjects pages) with one
// hub that fans out to each.
export function Activity() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-muted">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-display text-2xl text-ink">Activity</h2>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {ROWS.map(({ to, icon: Icon, label, description }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 py-3.5 border-b border-border text-left"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent shrink-0">
              <Icon size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-ink-muted truncate">{description}</span>
            </span>
            <ChevronRight size={18} className="text-ink-muted shrink-0" />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
