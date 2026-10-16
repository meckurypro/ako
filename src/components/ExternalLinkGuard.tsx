// src/components/ExternalLinkGuard.tsx
// One listener for every <a> in the app: a link that leaves Akọ asks first.
// Mounted once in App; individual links need no changes.
import { useEffect, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { externalHost } from "../lib/externalLink";

interface Pending {
  href: string;
  host: string;
  newTab: boolean;
}

export function ExternalLinkGuard() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      const host = externalHost(a.href);
      if (!host) return;
      // Cancel only the navigation. Other click handlers on the link still run.
      e.preventDefault();
      setPending({ href: a.href, host, newTab: a.target === "_blank" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!pending) return null;

  return (
    <ConfirmDialog
      danger={false}
      title="Leaving Akọ"
      description={`This link opens ${pending.host}.`}
      cancelLabel="Stay"
      confirmLabel="Continue"
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const { href, newTab } = pending;
        setPending(null);
        if (newTab) window.open(href, "_blank", "noopener,noreferrer");
        else window.location.assign(href);
      }}
    />
  );
}
