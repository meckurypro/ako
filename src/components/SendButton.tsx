// src/components/SendButton.tsx
import { ArrowUp } from "lucide-react";

interface SendButtonProps {
  /** Nothing to send yet (empty draft) — the circle goes quiet and can't be tapped. */
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  label?: string;
}

/**
 * The send control: a plain up arrow in a circle, the same shape Claude uses. Brand-orange with a white arrow;
 * dimmed (and untappable) when there is nothing to send. Same 44px footprint as the mic button it swaps with, so the composer
 * never shifts when the draft goes from empty to typed.
 */
export function SendButton({ disabled = false, type = "submit", onClick, label = "Send" }: SendButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90 disabled:active:scale-100 ${
        disabled ? "bg-brand-orange text-white opacity-50" : "bg-brand-orange text-white shadow-sm hover:brightness-95"
      }`}
    >
      <ArrowUp size={22} strokeWidth={2.4} />
    </button>
  );
}
