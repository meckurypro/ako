// src/components/PasswordField.tsx
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export function PasswordField({ label, error, id, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-6">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted mb-2.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          {...inputProps}
          className={`w-full bg-transparent px-0 pb-3 pt-1 pr-8 text-base text-ink placeholder:text-ink-muted/45
            border-0 border-b-2 focus:outline-none transition-colors duration-200
            ${error ? "border-danger" : "border-ink-muted/20 hover:border-ink-muted/40 focus:border-accent"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0 bottom-3 text-ink-muted hover:text-ink transition-colors"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
