import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-ink-muted mb-1.5">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className={`w-full px-4 py-3 rounded-xl border bg-canvas text-ink placeholder:text-ink-muted/60
          focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
          transition-colors ${error ? "border-danger" : "border-border"}`}
      />
      {error && <p className="text-danger text-sm mt-1.5">{error}</p>}
    </div>
  );
}
