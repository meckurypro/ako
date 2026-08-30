import { Link } from "react-router-dom";
import { Tag, Gift, Flag, ShieldAlert } from "lucide-react";
import { usePendingReports } from "../../hooks/useAdmin";

const SECTIONS = [
  { to: "/admin/categories", icon: Tag, label: "Categories" },
  { to: "/admin/gift-types", icon: Gift, label: "Gift types" },
  { to: "/admin/report-reasons", icon: Flag, label: "Report reasons" },
];

export function AdminHome() {
  const { data: reports } = usePendingReports();
  const pendingCount = reports?.length ?? 0;

  return (
    <div className="min-h-screen bg-canvas px-4 pt-8 pb-10">
      <div className="max-w-md mx-auto">
        <h1 className="font-display text-2xl text-ink mb-6">Admin</h1>

        <Link
          to="/admin/reports"
          className="flex items-center justify-between bg-surface rounded-xl p-4 mb-4 border border-border"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-accent" />
            <span className="font-medium text-ink">Moderation queue</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-danger text-canvas text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Link>

        <div className="space-y-2">
          {SECTIONS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 bg-surface rounded-xl p-4 border border-border"
            >
              <Icon size={20} className="text-ink-muted" />
              <span className="font-medium text-ink">{label}</span>
            </Link>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-4">
          Interests are managed inline under each category.
        </p>
      </div>
    </div>
  );
}
