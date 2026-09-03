// src/components/project-types/CourseFields.tsx
import { Info } from "lucide-react";

// A Course's modules/lessons are built afterward in the Course
// builder, saved as a draft until the host explicitly publishes it —
// buyers can't purchase a course before then (enforced server-side
// in the purchase edge function). This creation step just reserves
// the project and always starts it as a draft, regardless of
// whatever "status" the parent form would otherwise send.
export function CourseFields() {
  return (
    <div className="mb-4 flex gap-2.5 p-4 rounded-xl bg-accent-soft/60 text-sm text-ink-muted">
      <Info size={16} className="shrink-0 mt-0.5 text-accent" />
      <p>
        This creates a draft. Build your modules and lessons next, then publish when it's ready —
        no one can buy it until you do.
      </p>
    </div>
  );
}
