// src/components/AffiliateRefCapture.tsx
//
// Same shape as ScrollToTop: mounted once near the root, renders
// nothing, reacts to route changes. Handles the two ends of the
// affiliate attribution flow described in
// AKO_AFFILIATE_FORKING_AND_PERSISTENT_ATTRIBUTION.md §19
// ("referral attribution survives signup/login"):
//
//  1. A visitor lands on ANY page with ?ref=<token> in the URL — not
//     just /projects/:id, since a link can be shared to a profile,
//     a post, anywhere. track_affiliate_click logs the click and, if
//     the visitor already has a session, attributes it immediately.
//  2. If they were signed OUT at click time, the click_token is kept
//     in localStorage and claimed the moment a session shows up
//     (immediately after login, or after finishing signup) via
//     useClaimPendingAffiliateClick.
//
// The ?ref= param is stripped from the URL right after being read so
// it doesn't linger in the address bar or get double-counted on a
// refresh.
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTrackAffiliateClick, useClaimPendingAffiliateClick, storePendingAffiliateClick } from "../hooks/useAffiliates";

export function AffiliateRefCapture() {
  const location = useLocation();
  const navigate = useNavigate();
  const trackClick = useTrackAffiliateClick();
  const handledTokens = useRef(new Set<string>());

  // Resolves anything left over from a previous, signed-out visit.
  useClaimPendingAffiliateClick();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (!ref || handledTokens.current.has(ref)) return;
    handledTokens.current.add(ref);

    trackClick.mutate(ref, {
      onSuccess: (result) => {
        // track_affiliate_click already attributed this immediately
        // if the visitor has a session; storing the token too is
        // harmless — useClaimPendingAffiliateClick's insert is a
        // no-op once an attribution already exists for this buyer+
        // project (first-touch wins, enforced by a DB unique
        // constraint), so there's no risk of double-attribution.
        storePendingAffiliateClick(result.click_token);
      },
      // An invalid/inactive token (typo'd link, revoked affiliate)
      // should never block browsing — just drop it silently.
    });

    params.delete("ref");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return null;
}
