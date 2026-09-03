// src/components/project-types/RoomFields.tsx
import { Info } from "lucide-react";

// A Room has nothing to configure beyond the shared fields (title,
// thumbnail, price, etc.) — announcements, meetings, and assignments
// are all set up afterward in the Room manage screen, once buyers
// can actually join. That manage screen isn't built yet; this is a
// placeholder note so the create flow isn't misleading about what
// happens next.
export function RoomFields() {
  return (
    <div className="mb-4 flex gap-2.5 p-4 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
      <Info size={16} className="shrink-0 mt-0.5 text-accent" />
      <p>
        You'll set up announcements, meetings, and assignments after creating the Room, from its
        manage screen.
      </p>
    </div>
  );
}
