// src/components/ProfilePrefetch.tsx
// Prefetch on intent: the moment a finger goes down (or a mouse hovers) on a link to someone's profile, start
// fetching that profile row — the first hop every profile query chains off. By the time the tap completes and the
// page mounts, the request is usually already in flight or done, so the first hop isn't waited on in series.
// Respects the query's staleTime, so a profile that is already fresh in cache is not fetched again.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { profileByUsernameOptions } from "../hooks/useProfile";

// Exactly /profile/:username — not /followers, /following or any other sub-route.
const PROFILE_HREF = /^\/profile\/([^/?#]+)\/?(?:[?#].*)?$/;

export function ProfilePrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handle(e: Event) {
      if (e.type === "pointerover" && (e as PointerEvent).pointerType !== "mouse") return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const match = link?.getAttribute("href")?.match(PROFILE_HREF);
      if (!match) return;
      let username: string;
      try {
        username = decodeURIComponent(match[1]);
      } catch {
        return;
      }
      void queryClient.prefetchQuery(profileByUsernameOptions(username));
    }
    document.addEventListener("pointerdown", handle, { passive: true });
    document.addEventListener("pointerover", handle, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handle);
      document.removeEventListener("pointerover", handle);
    };
  }, [queryClient]);

  return null;
}
