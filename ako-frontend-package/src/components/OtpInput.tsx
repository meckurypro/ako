import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
}

/**
 * 8-digit OTP entry — matches Supabase's email OTP length for this
 * project (configured in Supabase Dashboard > Auth > Emails).
 * If your project's OTP length setting differs from 8, update the
 * `length` default here to match, or verifyOtp calls will always
 * receive an incomplete code.
 */
export function OtpInput({ length = 8, onComplete, error }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    if (!pasted) return;

    const next = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);

    const lastFilledIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();

    if (pasted.length === length) {
      onComplete(pasted);
    }
  }

  return (
    <div>
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => updateDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-10 h-12 text-center text-lg font-medium rounded-lg border bg-canvas text-ink
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
              transition-colors ${error ? "border-danger" : "border-border"}`}
            aria-label={`Digit ${i + 1} of ${length}`}
          />
        ))}
      </div>
      {error && <p className="text-danger text-sm mt-3 text-center">{error}</p>}
    </div>
  );
}
