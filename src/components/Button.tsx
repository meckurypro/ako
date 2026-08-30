import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "w-full py-3 px-6 rounded-xl font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

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
      {loading ? "Please wait…" : children}
    </button>
  );
}
