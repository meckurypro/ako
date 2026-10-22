// src/pages/DepositReturn.tsx
//
// Public landing page for deposits started from the NATIVE app.
//
// The native app asks initiate-deposit for a Paystack checkout URL with
// platform: "native"; Paystack then redirects here after payment
// (…/wallet/deposit/return?reference=…&trxref=…). This page needs no web
// login and does no crediting — it only hands the user back to the app via
// the ako:// deep link. The native app then calls verify-deposit with its
// own session (and paystack-charge-webhook credits independently), so the
// wallet is funded when they land back in the app.
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const APP_DEEP_LINK = "ako://wallet/deposit/callback";
const ANDROID_PACKAGE = "com.meckurypro.ako";

export function DepositReturn() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") ?? params.get("trxref");
  const target = reference
    ? `${APP_DEEP_LINK}?reference=${encodeURIComponent(reference)}`
    : APP_DEEP_LINK;

  // Android Chrome / Custom Tabs often ignore a scripted custom-scheme redirect;
  // an intent:// URL is the form they honour.
  const isAndroid = /android/i.test(navigator.userAgent);
  const androidIntent =
    `intent://wallet/deposit/callback${reference ? `?reference=${encodeURIComponent(reference)}` : ""}` +
    `#Intent;scheme=ako;package=${ANDROID_PACKAGE};end`;
  const handoff = isAndroid ? androidIntent : target;

  useEffect(() => {
    // Immediate hand-off; the button below covers browsers that block it.
    window.location.replace(handoff);
  }, [handoff]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <Loader2 size={40} className="animate-spin text-accent mx-auto mb-4" />
        <p className="text-ink font-medium">Returning you to Akọ…</p>
        <p className="text-ink-muted text-sm mt-1 mb-6">
          Your payment is being confirmed. Your wallet will update in the app.
        </p>
        <a
          href={handoff}
          className="inline-block bg-accent text-canvas font-medium rounded-xl px-6 py-3"
        >
          Open the Akọ app
        </a>
      </div>
    </div>
  );
}
