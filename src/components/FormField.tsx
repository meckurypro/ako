import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="mb-6">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2.5"
      >
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className={`w-full bg-transparent px-0 pb-3 pt-1 text-base text-ink placeholder:text-ink-muted/45
          border-0 border-b-2 focus:outline-none transition-colors duration-200
          ${error ? "border-danger" : "border-ink-muted/20 hover:border-ink-muted/40 focus:border-accent"}`}
      />
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
