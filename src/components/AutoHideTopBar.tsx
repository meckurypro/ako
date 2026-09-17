import type { ReactNode } from "react";
import { useAutoHideOnScroll } from "../hooks/useAutoHideOnScroll";

interface AutoHideTopBarProps {
  children: ReactNode;
  className?: string;
}

// Shared chrome behavior for the sticky block sitting at the top of a
// page (TopHeader, plus whatever tabs a page stacks under it): fades
// and slides up out of the way when scrolling down, and slides right
// back on the first bit of upward scroll — same pattern as BottomNav
// (see useAutoHideOnScroll). Semi-transparent + backdrop blur so
// content scrolling underneath reads as blurred glass rather than a
// hard cut, matching BottomNav's treatment.
export function AutoHideTopBar({ children, className = "" }: AutoHideTopBarProps) {
  const visible = useAutoHideOnScroll();

  return (
    <div
      className={`sticky top-0 z-20 bg-surface/80 backdrop-blur-md shadow-[0_2px_8px_-4px_rgba(var(--shadow-ink-rgb),0.10)] transition-[transform,opacity] duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
