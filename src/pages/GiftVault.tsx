// src/pages/GiftVault.tsx
//
// The Gift Vault: a trophy cabinet for every gift the user has received.
//   • Plaque — the collection at a glance: gift/artifact counts and your prized piece (worth is a small caption).
//   • Artifacts — one tile per gift type with an ×count badge; tapping opens that artifact's full history.
//   • Latest — newest gifts first (artwork, sender, date/time, price), filterable All / Today / This week.
// Wallet is for money you can move; the Vault is for things you were given. Keep them from borrowing each other's look.
// Rarity (Everyday → Legendary) is driven by the price of a single gift.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Gem, Sparkles } from "lucide-react";
import { useGiftVault } from "../hooks/useGiftVault";
import { useAuth } from "../hooks/useAuth";
import { BottomNav } from "../components/BottomNav";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import { formatUsd } from "../lib/money";
import {
  RARITY_META,
  filterByRange,
  formatReceivedAt,
  groupArtifacts,
  rarityFor,
  senderLabel,
  vaultTotals,
  type Artifact,
  type VaultRange,
} from "../lib/giftVault";

const RANGES: { id: VaultRange; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
];

const LATEST_PAGE = 8;

// Kente-inspired strip: gold, red, deep green, black.
const KENTE =
  "repeating-linear-gradient(90deg,#D9A857 0 16px,#A8341F 16px 24px,#14291E 24px 32px,#3D8B63 32px 48px,#14291E 48px 56px)";

function GiftArt({ url, size, glow }: { url: string | null; size: number; glow?: string }) {
  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-ink/5 text-ink-muted"
        style={{ width: size, height: size }}
      >
        <Sparkles size={size / 2.5} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="object-contain"
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 6px 14px ${glow})` : undefined,
      }}
    />
  );
}

export function GiftVaultPage() {
  const { data: gifts, isLoading, isError } = useGiftVault();
  const { profile } = useAuth();
  const [range, setRange] = useState<VaultRange>("all");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<Artifact | null>(null);

  const filtered = useMemo(() => filterByRange(gifts ?? [], range), [gifts, range]);
  const artifacts = useMemo(() => groupArtifacts(filtered), [filtered]);
  const totals = useMemo(() => vaultTotals(filtered), [filtered]);
  const latest = showAll ? filtered : filtered.slice(0, LATEST_PAGE);

  const rangeLabel = RANGES.find((r) => r.id === range)!.label.toLowerCase();

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="max-w-xl md:max-w-3xl mx-auto px-4 md:px-8 pt-5 md:pt-10">
        <Link to="/wallet" className="inline-flex items-center gap-1.5 text-ink-muted mb-4" aria-label="Back to wallet">
          <ArrowLeft size={20} />
        </Link>

        {/* ── Plaque ──
            A display case, not a balance: the hero is the collection (a centrepiece and two counts). The money
            figure is a small caption in gold, so nothing here reads as spendable like the Wallet's balance. */}
        <div
          className="relative overflow-hidden rounded-[28px]"
          style={{
            background: "linear-gradient(160deg,#10231A 0%,#1B3626 55%,#2A1F12 100%)",
            boxShadow: "0 0 0 1.5px #B8862E, 0 22px 44px -14px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ height: 10, background: KENTE }} aria-hidden="true" />
          <div className="relative px-6 pt-5 pb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "#D9A857" }}>
                {profile?.username ? `@${profile.username}'s` : "Your"} collection
              </p>
              <h1 className="font-display text-4xl mt-1" style={{ color: "#F6E7C1" }}>
                Gift Vault
              </h1>
              <p className="text-sm mt-4 tabular-nums" style={{ color: "#F6E7C1" }}>
                {isLoading ? "…" : `${totals.giftCount} ${totals.giftCount === 1 ? "gift" : "gifts"} · ${totals.artifactCount} ${totals.artifactCount === 1 ? "artifact" : "artifacts"}`}
              </p>
              {!isLoading && totals.totalWorth > 0 && (
                <p className="text-xs mt-1 tabular-nums" style={{ color: "rgba(246,231,193,0.65)" }}>
                  worth {formatUsd(totals.totalWorth)}
                  {range === "all" ? "" : ` · ${rangeLabel}`}
                </p>
              )}
            </div>

            {totals.topArtifact && (
              <div className="shrink-0 w-28 text-center">
                <div
                  className="relative mx-auto w-24 h-24 rounded-[28px] flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, ${RARITY_META[totals.topArtifact.rarity].glow} 0%, transparent 70%)`,
                    boxShadow: `inset 0 0 0 1.5px ${RARITY_META[totals.topArtifact.rarity].color}`,
                  }}
                >
                  <Crown size={16} className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ color: "#D9A857" }} aria-hidden="true" />
                  <GiftArt url={totals.topArtifact.iconUrl} size={68} glow={RARITY_META[totals.topArtifact.rarity].glow} />
                </div>
                <p className="text-xs font-medium truncate mt-2" style={{ color: "#F6E7C1" }}>
                  {totals.topArtifact.name}
                </p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(246,231,193,0.6)" }}>
                  Prized piece
                </p>
              </div>
            )}
          </div>
          <div style={{ height: 6, background: KENTE }} aria-hidden="true" />
        </div>

        {/* ── Range switch ── */}
        <div className="flex gap-2 mt-6" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => {
                setRange(r.id);
                setShowAll(false);
              }}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                range === r.id ? "bg-cta text-white border-cta" : "bg-surface text-ink-muted border-border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {isError && <p className="text-sm text-danger mt-6">Couldn't load your vault. Pull to refresh or try again.</p>}

        {!isLoading && !isError && (gifts?.length ?? 0) === 0 && (
          <div className="text-center py-14">
            <Gem size={40} className="mx-auto text-ink-muted mb-3" />
            <p className="font-display text-xl text-ink">Your vault is waiting</p>
            <p className="text-sm text-ink-muted mt-1">
              When someone gifts you on Akọ, the treasure lands here — with who sent it and when.
            </p>
          </div>
        )}

        {!isLoading && (gifts?.length ?? 0) > 0 && filtered.length === 0 && (
          <p className="text-sm text-ink-muted text-center py-10">No gifts {rangeLabel} yet.</p>
        )}

        {/* ── Artifacts ── */}
        {artifacts.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg text-ink">Artifacts</h2>
            <p className="text-xs text-ink-muted mb-3">Tap one to see everyone who sent it.</p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {artifacts.map((a) => {
                const r = RARITY_META[a.rarity];
                return (
                  <button
                    key={a.key}
                    onClick={() => setOpen(a)}
                    className={`relative rounded-2xl p-2.5 pb-3 text-center bg-surface dark:bg-[#121114] ${
                      a.rarity === "legendary" ? "vault-shimmer" : ""
                    }`}
                    style={{ boxShadow: `0 0 0 1.5px ${r.color}, 0 10px 22px -12px ${r.glow}` }}
                    aria-label={`${a.name}, received ${a.count} time${a.count === 1 ? "" : "s"}`}
                  >
                    <span
                      className="absolute -top-2 -right-1.5 min-w-[26px] h-[26px] px-1.5 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                      style={{ background: "linear-gradient(135deg,#F6D98C,#B8862E)", color: "#2A1F12", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}
                    >
                      ×{a.count}
                    </span>
                    <div className="aspect-square flex items-center justify-center">
                      <GiftArt url={a.iconUrl} size={72} glow={r.glow} />
                    </div>
                    <p className="text-xs font-medium text-ink truncate mt-1">{a.name}</p>
                    <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: r.color }}>
                      {r.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Latest ── */}
        {filtered.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg text-ink mb-3">Latest</h2>
            <div className="bg-surface dark:bg-[#121114] rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {latest.map((g) => {
                const rarity = RARITY_META[rarityFor(g.amount)];
                return (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: rarity.glow, boxShadow: `inset 0 0 0 1px ${rarity.color}` }}
                    >
                      <GiftArt url={g.gift_icon_url} size={42} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{g.gift_name ?? "Gift"}</p>
                      <p className="text-xs text-ink-muted truncate">from {senderLabel(g)}</p>
                      <p className="text-xs text-ink-muted">{formatReceivedAt(g.created_at)}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums flex-shrink-0" style={{ color: "#B8862E" }}>
                      {formatUsd(g.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
            {filtered.length > LATEST_PAGE && (
              <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm text-accent font-medium">
                {showAll ? "Show fewer" : `Show all ${filtered.length}`}
              </button>
            )}
          </section>
        )}
      </div>

      {open && <ArtifactModal artifact={open} onClose={() => setOpen(null)} />}
      <BottomNav />
    </div>
  );
}

function ArtifactModal({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const r = RARITY_META[artifact.rarity];
  return (
    <Modal onClose={onClose} ariaLabel={`${artifact.name} history`} maxWidthClass="max-w-md">
      <div className="text-center">
        <div
          className="mx-auto w-36 h-36 rounded-[32px] flex items-center justify-center"
          style={{ background: `radial-gradient(circle, ${r.glow} 0%, transparent 70%)`, boxShadow: `inset 0 0 0 1.5px ${r.color}` }}
        >
          <GiftArt url={artifact.iconUrl} size={104} glow={r.glow} />
        </div>
        <h3 className="font-display text-2xl mt-4 text-overlay-ink">{artifact.name}</h3>
        <p className="text-[11px] uppercase tracking-[0.18em] mt-1" style={{ color: r.color }}>
          {r.label} · {formatUsd(artifact.unitPrice)} each
        </p>
        <div className="flex justify-center gap-8 mt-4">
          <div>
            <p className="font-display text-2xl text-overlay-ink tabular-nums">×{artifact.count}</p>
            <p className="text-[11px] uppercase tracking-wider text-overlay-ink-muted">Received</p>
          </div>
          <div>
            <p className="font-display text-2xl tabular-nums" style={{ color: "#D9A857" }}>
              {formatUsd(artifact.totalWorth)}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-overlay-ink-muted">Worth</p>
          </div>
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-overlay-ink-muted mt-6 mb-2">History</p>
      <ul className="divide-y divide-overlay-border">
        {artifact.history.map((g) => (
          <li key={g.id} className="flex items-center gap-3 py-2.5">
            <Avatar src={g.sender_avatar_url} name={senderLabel(g).replace(/^@/, "")} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-overlay-ink truncate">{senderLabel(g)}</p>
              <p className="text-xs text-overlay-ink-muted">{formatReceivedAt(g.created_at)}</p>
            </div>
            <p className="text-sm tabular-nums" style={{ color: "#D9A857" }}>
              {formatUsd(g.amount)}
            </p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
