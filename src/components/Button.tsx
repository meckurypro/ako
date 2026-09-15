import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  /** "md" (default) is the original full-width, py-3/px-6 button used
   *  throughout the app — unchanged. "sm" is a compact, pill-shaped
   *  variant for inline row actions (e.g. a Follow button next to a
   *  list item) where the full-size button reads as oversized. */
  size?: "md" | "sm";
}

export function Button({
  variant = "primary",
  loading = false,
  size = "md",
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const sizes = {
    md: "w-full py-3 px-6 rounded-xl",
    sm: "py-1.5 px-4 rounded-full text-sm",
  };

  const base = `${sizes[size]} font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;

  const variants = {
    primary: "bg-accent text-canvas hover:bg-accent-hover",
    secondary: "bg-accent-soft text-accent hover:bg-accent-soft/70",
    ghost: "bg-transparent text-ink-muted hover:text-ink",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? (size === "sm" ? "…" : "Please wait…") : children}
    </button>
  );
}
