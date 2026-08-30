import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

// Must match PRODUCT_CREDIT_MAP in edge_functions/verify-iap-receipt/index.ts —
// these are the actual App Store Connect / Play Console product IDs once
// they're configured there.
const PACKAGES = [
  { productId: "ako_credit_1", label: "$1", usd: 1 },
  { productId: "ako_credit_5", label: "$5", usd: 5 },
  { productId: "ako_credit_10", label: "$10", usd: 10 },
  { productId: "ako_credit_25", label: "$25", usd: 25 },
  { productId: "ako_credit_50", label: "$50", usd: 50 },
];

/**
 * IMPORTANT — this is a WEB page, and Apple/Google in-app purchases
 * only exist inside their native app runtimes (StoreKit on iOS,
 * Play Billing on Android). A pure web page cannot legally or
 * technically trigger a real IAP purchase — that only works once
 * this app is wrapped natively (e.g. via Capacitor) and the native
 * purchase SDKs are wired up to call this same verify-iap-receipt
 * function with a real receipt.
 *
 * This page is intentionally left functional in structure (real
 * fetch to verify-iap-receipt) so the plumbing is provably correct,
 * but it WILL fail here because there's no real receipt to send —
 * exactly the known gap flagged when this was built.
 */
export function FundWallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isNativeShell = typeof (window as any).Capacitor !== "undefined";

  // Real platform detection via Capacitor's API once wrapped natively —
  // this only resolves meaningfully inside isNativeShell, which is
  // exactly when it's used below.
  function detectProvider(): "apple_iap" | "google_play" {
    const platform = (window as any).Capacitor?.getPlatform?.();
    return platform === "android" ? "google_play" : "apple_iap";
  }

  async function handlePurchase(productId: string) {
    setSelectedProduct(productId);
    setStatus("processing");
    setErrorMessage(null);

    if (!isNativeShell) {
      // No native purchase SDK available in a plain web context —
      // this is the expected, documented gap. Don't fake a receipt;
      // that would just fail against Apple/Google's real servers
      // anyway, and a fake success would be worse (silently wrong).
      setStatus("error");
      setErrorMessage(
        "In-app purchases require the iOS or Android app. This web preview can't complete a real purchase yet."
      );
      return;
    }

    // --------------------------------------------------------
    // Real path once wrapped natively: the native purchase SDK
    // (StoreKit / Play Billing) returns a receipt after a successful
    // purchase, which gets sent here for verification + wallet credit.
    // --------------------------------------------------------
    try {
      // const receipt = await NativeIAP.purchase(productId); // native bridge call
      const receipt = null; // placeholder until native bridge exists

      const { data, error } = await supabase.functions.invoke("verify-iap-receipt", {
        body: {
          user_id: user!.id,
          provider: detectProvider(),
          receipt_data: receipt,
          product_id: productId,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error ?? error?.message ?? "Verification failed");
      }

      navigate("/wallet");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Purchase failed.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-4">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-2">Fund your wallet</h2>
        <p className="text-ink-muted text-sm mb-6">
          Choose an amount to add. Payment is handled by the App Store / Google Play.
        </p>

        {!isNativeShell && (
          <div className="flex gap-2 bg-accent-soft text-accent text-sm rounded-xl p-3 mb-6">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p>
              You're viewing this in a web browser. Real purchases only work inside the
              published iOS/Android app once App Store and Play Console products are set up.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.productId}
              onClick={() => handlePurchase(pkg.productId)}
              disabled={status === "processing" && selectedProduct === pkg.productId}
              className="bg-surface border border-border rounded-xl py-5 text-center hover:border-accent/50 disabled:opacity-50"
            >
              <p className="font-display text-2xl text-ink">{pkg.label}</p>
            </button>
          ))}
        </div>

        {status === "error" && errorMessage && (
          <p className="text-danger text-sm mt-5 text-center">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
