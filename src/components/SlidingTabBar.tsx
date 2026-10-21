// src/components/SlidingTabBar.tsx
//
// The text tab strip shared by Library, Connect and Discover's search results —
// same look and motion as Feed's and the Profile's tab rows: equal-width columns
// and one sliding indicator bar that tracks a swipe (see SwipeableTabs) instead
// of each tab drawing its own underline.
interface SlidingTabBarProps {
  tabs: readonly { id: string; label: string }[];
  activeIndex: number;
  /** Live position from SwipeableTabs' onProgress (e.g. 1.4 mid-swipe). */
  progress: number;
  dragging: boolean;
  onSelect: (index: number) => void;
  ariaLabel: string;
  className?: string;
}

export function SlidingTabBar({
  tabs,
  activeIndex,
  progress,
  dragging,
  onSelect,
  ariaLabel,
  className = "",
}: SlidingTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-stretch border-b border-border ${className}`}
    >
      {tabs.map((t, i) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={i === activeIndex}
          onClick={() => i !== activeIndex && onSelect(i)}
          className={`flex-1 whitespace-nowrap text-sm font-semibold h-11 text-center transition-colors ${
            i === activeIndex ? "text-accent" : "text-ink-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
      <div
        className={`ako-tab-indicator absolute bottom-0 left-0 h-[3px] flex justify-center ${
          dragging ? "ako-tab-indicator--dragging" : ""
        }`}
        style={{
          width: `${100 / tabs.length}%`,
          transform: `translateX(${progress * 100}%)`,
        }}
      >
        <span className="block w-9 h-full rounded-full bg-accent" />
      </div>
    </div>
  );
}
