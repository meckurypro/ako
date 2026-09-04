// src/pages/AppearanceSettings.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, Moon, MonitorSmartphone, Check } from "lucide-react";
import { useTheme, type ThemeSetting } from "../hooks/useTheme";

const OPTIONS: { value: ThemeSetting; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
    icon: <Sun size={18} className="text-ink-muted" />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    icon: <Moon size={18} className="text-ink-muted" />,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device's setting",
    icon: <MonitorSmartphone size={18} className="text-ink-muted" />,
  },
];

export function AppearanceSettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">Appearance</h2>
        </div>

        <div className="bg-surface rounded-xl overflow-hidden">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              aria-pressed={theme === opt.value}
              className={`w-full flex items-center gap-3 p-4 text-left ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              {opt.icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{opt.label}</p>
                <p className="text-xs text-ink-muted">{opt.description}</p>
              </div>
              {theme === opt.value && <Check size={18} className="text-accent flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
