// src/hooks/useChangePulse.ts
// True for a short moment right after `value` changes — never on first render. Drives the quiet follow / count
// animations (.ako-follow-swap, .ako-count-tick in index.css): put the class on the element while this is true.
import { useEffect, useRef, useState } from "react";

export function useChangePulse(value: unknown, ms = 220): boolean {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return pulse;
}
