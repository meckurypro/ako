// src/components/AppShell.tsx
//
// Desktop layout wrapper. Sits once at the router root (see App.tsx) so no
// individual page needs to change to get the sidebar — pages keep their own
// `min-h-screen` root div and TopHeader/BottomNav exactly as before; this
// just reserves left-hand space on md+ viewports and mounts the persistent
// Sidebar there. Below md, this renders children unchanged: BottomNav (now
// `md:hidden`) remains the only navigation.
//
// Routes that already have their own full-bleed layout — auth screens,
// onboarding, and the admin console (which isn't mobile-constrained the
// way the consumer app is, and has never used BottomNav) — are excluded so
// the shell doesn't fight a layout that wasn't designed against it.
import { useState, type ReactNode } from "react";
import { useLocation, type Location } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const SHELL_EXCLUDED_PREFIXES = [
  "/signup",
  "/login",
  "/verify-email",
  "/reset-password",
  "/auth",
  "/admin",
  "/onboarding",
];

const SIDEBAR_PINNED_KEY = "ako:sidebar-expanded";

function shouldShowShell(pathname: string) {
  return !SHELL_EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Defaults to collapsed (icons only) — hovering the rail reveals
  // labels without needing this pinned open (see Sidebar's
  // showLabels). Once a person explicitly pins it one way or the
  // other, that sticks across visits.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_PINNED_KEY);
      return stored === null ? true : stored !== "true";
    } catch {
      return true;
    }
  });

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_PINNED_KEY, String(!next));
      } catch {
        // localStorage unavailable (privacy mode) — falls back to
        // in-memory only for this session, same as elsewhere in the app.
      }
      return next;
    });
  }

  // When /create is open as a modal over a background page (see App.tsx's
  // AppRoutes), decide shell visibility off the page underneath, not the
  // modal route itself — the modal is a sheet, not a real navigation.
  const backgroundLocation = (location.state as { background?: Location } | null)?.background;
  const effectivePathname = (backgroundLocation ?? location).pathname;

  if (!shouldShowShell(effectivePathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      {/* Sidebar is `fixed`, so it's out of flow — this left padding is what
          actually reserves its space on md+ (pure CSS, so it responds to
          viewport width without any JS resize listener). Below md it's 0
          and BottomNav takes over exactly as before. Each page's own
          `min-h-screen` root div still works unchanged inside this padded
          parent — no page file needs to know the sidebar exists. */}
      <div className={`transition-[padding-left] duration-150 ${collapsed ? "md:pl-[76px]" : "md:pl-64"}`}>
        {children}
      </div>
    </>
  );
}
