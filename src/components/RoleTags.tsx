import type { ProfileRole } from "../types/database";

export function RoleTags({ roles, className }: { roles: ProfileRole[]; className?: string }) {
  if (!roles || roles.length === 0) return null;
  const sorted = [...roles].sort((a, b) => a.position - b.position);
  return <span className={className}>{sorted.map((r) => r.label).join(" · ")}</span>;
}
