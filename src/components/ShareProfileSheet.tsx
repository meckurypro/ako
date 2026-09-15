// src/components/ShareProfileSheet.tsx
import { useMemo, useState } from "react";
import {
  X,
  Search,
  Check,
  Link2,
  MessageSquare,
  Mail,
  Share2,
  PenSquare,
  Flag,
  FileWarning,
  BellOff,
  Bell,
  Ban,
  Send,
  UserMinus,
  QrCode,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStartConversation, useConversations } from "../hooks/useMessaging";
import { useContactNickname, useSetContactNickname } from "../hooks/useContactNicknames";
import { useReportReasons, useSubmitReport } from "../hooks/useReports";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Portal } from "./Portal";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { WhatsAppGlyph, FacebookGlyph, XGlyph } from "./BrandIcons";

interface ShareProfileSheetProps {
  profile: { id: string; username: string; display_name: string; avatar_url: string | null };
  /** Does the viewed profile follow ME — controls whether "Remove this
   *  follower" makes sense to offer at all. */
  isFollowedByUser: boolean;
  isBlocked: boolean;
  isMuted: boolean;
  onToggleBlock: () => void;
  onToggleMute: () => void;
  onRemoveFollower: () => void;
  onMessage: () => void;
  onOpenQR: () => void;
  /** Opens ReportModal — reporting one of this profile's specific
   *  posts/projects, distinct from this sheet's own "Report" step
   *  (mode="report" below) which reports the profile itself. */
  onReportContent: () => void;
  onClose: () => void;
}

type Mode = "menu" | "nickname" | "report";

/**
 * Everything a visitor might want to do from a profile's "…" — send
 * the profile link straight into a recent chat, hand it off to an
 * outside app, or manage the relationship (mute/block/report/remove
 * follower/nickname) — collected into one sheet instead of scattering
 * them across a plain dropdown. Matches the "Send to" pattern from
 * TikTok/Instagram: a row of people to send to, a row of external
 * destinations, then a grid of profile-management actions.
 */
export function ShareProfileSheet({
  profile,
  isFollowedByUser,
  isBlocked,
  isMuted,
  onToggleBlock,
  onToggleMute,
  onRemoveFollower,
  onMessage,
  onOpenQR,
  onReportContent,
  onClose,
}: ShareProfileSheetProps) {
  const [mode, setMode] = useState<Mode>("menu");
  useBackDismiss(onClose);
  useBackDismiss(() => setMode("menu"), mode !== "menu");
  useScrollLock();
  const toast = useToast();

  const profileUrl = `${window.location.origin}/profile/${profile.username}`;
  const shareText = `Check out ${profile.display_name} on Akọ`;

  // ---- "Send to" recent chats ----
  const { data: conversations } = useConversations();
  const startConversation = useStartConversation();
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const recentContacts = useMemo(() => {
    const list = (conversations ?? [])
      .filter((c) => !c.is_group && c.other_participant?.id && c.other_participant.id !== profile.id)
      .map((c) => c.other_participant);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (p) => p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
        )
      : list;
    return filtered.slice(0, 12);
  }, [conversations, query, profile.id]);

  async function handleSendTo(userId: string) {
    if (sendingId) return;
    setSendingId(userId);
    try {
      const conversationId = await startConversation.mutateAsync(userId);
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: (await supabase.auth.getUser()).data.user!.id,
        content: profileUrl,
      });
      if (error) throw error;
      setSentIds((prev) => new Set(prev).add(userId));
    } catch {
      toast("Couldn't send — try again.", { variant: "error" });
    } finally {
      setSendingId(null);
    }
  }

  // ---- External destinations ----
  async function handleCopyLink() {
    await navigator.clipboard.writeText(profileUrl);
    toast("Link copied.", { variant: "success" });
  }

  async function handleMore() {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: profile.display_name, url: profileUrl });
    } catch {
      // Native share sheet dismissed — nothing to do.
    }
  }

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ---- Nickname step ----
  const { data: nickname } = useContactNickname(profile.id);
  const setNickname = useSetContactNickname(profile.id);
  const [nicknameInput, setNicknameInput] = useState(nickname ?? "");

  async function handleSaveNickname() {
    try {
      await setNickname.mutateAsync(nicknameInput);
      toast(nicknameInput.trim() ? "Nickname saved." : "Nickname removed.", { variant: "success" });
      setMode("menu");
    } catch {
      toast("Couldn't save that.", { variant: "error" });
    }
  }

  // ---- Report step ----
  const { data: reasons } = useReportReasons();
  const submitReport = useSubmitReport();
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  async function handleSubmitReport() {
    if (!selectedReasonId) return;
    try {
      await submitReport.mutateAsync({
        targetType: "profile",
        targetId: profile.id,
        reasonId: selectedReasonId,
        details: reportDetails,
      });
      setReportSubmitted(true);
    } catch {
      toast("Couldn't submit the report — try again.", { variant: "error" });
    }
  }

  if (mode === "nickname") {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border-t sm:border border-border p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <p className="text-sm font-medium text-ink mb-1">Customise name</p>
            <p className="text-xs text-ink-muted mb-4">
              Only you will see this name for {profile.display_name}.
            </p>
            <input
              autoFocus
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder={profile.display_name}
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl border border-border bg-canvas text-ink
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors duration-150"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 border border-border text-ink-muted py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <Button onClick={() => void handleSaveNickname()} loading={setNickname.isPending} className="flex-1 !w-auto !py-2.5">
                Save
              </Button>
            </div>
          </div>
        </div>
      </Portal>
    );
  }

  if (mode === "report") {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
          <div className="relative w-full max-w-md bg-surface rounded-t-2xl sm:rounded-2xl border-t sm:border border-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {reportSubmitted ? (
              <div className="p-6 text-center">
                <Flag size={28} className="mx-auto text-accent mb-3" />
                <p className="text-sm text-ink font-medium">Report submitted</p>
                <p className="text-xs text-ink-muted mt-1 mb-5">
                  Thanks for letting us know. Our team will review this account.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent text-canvas"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm font-medium text-ink mb-1">Report {profile.display_name}</p>
                <p className="text-xs text-ink-muted mb-4">What's wrong with this account?</p>
                <div className="space-y-1 mb-3">
                  {(reasons ?? []).map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReasonId(reason.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border ${
                        selectedReasonId === reason.id
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-ink"
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Add details (optional)"
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-canvas text-ink text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors duration-150"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setMode("menu")}
                    className="flex-1 border border-border text-ink-muted py-2.5 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSubmitReport()}
                    disabled={!selectedReasonId || submitReport.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-danger text-canvas disabled:opacity-50"
                  >
                    {submitReport.isPending ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Portal>
    );
  }

  const actions: {
    key: string;
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
    onSelect: () => void;
  }[] = [
    { key: "nickname", label: "Customise name", icon: <PenSquare size={20} />, onSelect: () => setMode("nickname") },
    { key: "report", label: "Report", icon: <Flag size={20} />, onSelect: () => setMode("report") },
    {
      key: "report-content",
      label: "Report a post/project",
      icon: <FileWarning size={20} />,
      onSelect: () => {
        onClose();
        onReportContent();
      },
    },
    {
      key: "mute",
      label: isMuted ? "Unmute" : "Mute their updates",
      icon: isMuted ? <Bell size={20} /> : <BellOff size={20} />,
      onSelect: onToggleMute,
    },
    {
      key: "block",
      label: isBlocked ? "Unblock" : "Block",
      icon: <Ban size={20} />,
      danger: !isBlocked,
      onSelect: onToggleBlock,
    },
    {
      key: "message",
      label: "Send message",
      icon: <Send size={20} />,
      onSelect: () => {
        onClose();
        onMessage();
      },
    },
    ...(isFollowedByUser
      ? [
          {
            key: "remove-follower",
            label: "Remove this follower",
            icon: <UserMinus size={20} />,
            danger: true,
            onSelect: onRemoveFollower,
          },
        ]
      : []),
    {
      key: "qr",
      label: "QR code",
      icon: <QrCode size={20} />,
      onSelect: () => {
        onClose();
        onOpenQR();
      },
    },
  ];

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-surface rounded-t-2xl border-t border-border max-h-[88vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="w-7" />
            <p className="text-sm font-medium text-ink">Send to</p>
            <button onClick={onClose} aria-label="Close" className="text-ink-muted p-1">
              <X size={20} />
            </button>
          </div>

          {/* Search over recent chats */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-canvas border border-border rounded-full px-3 py-2">
              <Search size={15} className="text-ink-muted flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Recent chats to send the profile link to directly */}
          {recentContacts.length > 0 && (
            <div className="flex gap-4 overflow-x-auto px-4 pb-4 no-scrollbar">
              {recentContacts.map((contact) => {
                const sent = sentIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => void handleSendTo(contact.id)}
                    disabled={sendingId === contact.id}
                    className="flex flex-col items-center gap-1 w-16 flex-shrink-0"
                  >
                    <div className="relative">
                      <Avatar src={contact.avatar_url} name={contact.display_name} size="lg" />
                      {sent && (
                        <span className="absolute inset-0 rounded-full bg-ink/50 flex items-center justify-center">
                          <Check size={22} className="text-canvas" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink truncate w-full text-center">
                      {contact.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-border" />

          {/* External destinations */}
          <div className="flex gap-4 overflow-x-auto px-4 py-4 no-scrollbar">
            <ExternalTarget
              label="WhatsApp"
              onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${profileUrl}`)}`)}
            >
              <WhatsAppGlyph />
            </ExternalTarget>
            <ExternalTarget label="Copy link" onClick={() => void handleCopyLink()}>
              <div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center flex-shrink-0">
                <Link2 size={20} className="text-ink" />
              </div>
            </ExternalTarget>
            <ExternalTarget
              label="SMS"
              onClick={() => openExternal(`sms:?&body=${encodeURIComponent(`${shareText} ${profileUrl}`)}`)}
            >
              <div className="w-12 h-12 rounded-full bg-[#2FCC66] flex items-center justify-center flex-shrink-0">
                <MessageSquare size={20} className="text-white" />
              </div>
            </ExternalTarget>
            <ExternalTarget
              label="Email"
              onClick={() =>
                openExternal(
                  `mailto:?subject=${encodeURIComponent(profile.display_name)}&body=${encodeURIComponent(`${shareText} ${profileUrl}`)}`
                )
              }
            >
              <div className="w-12 h-12 rounded-full bg-ink/70 flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-canvas" />
              </div>
            </ExternalTarget>
            <ExternalTarget
              label="Facebook"
              onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`)}
            >
              <FacebookGlyph />
            </ExternalTarget>
            <ExternalTarget
              label="X"
              onClick={() =>
                openExternal(
                  `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`
                )
              }
            >
              <XGlyph />
            </ExternalTarget>
            {!!navigator.share && (
              <ExternalTarget label="More" onClick={() => void handleMore()}>
                <div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center flex-shrink-0">
                  <Share2 size={20} className="text-ink" />
                </div>
              </ExternalTarget>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Profile-management actions */}
          <div className="grid grid-cols-4 gap-y-4 px-4 py-4">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={action.onSelect}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    action.danger ? "bg-danger/10 text-danger" : "bg-ink/10 text-ink"
                  }`}
                >
                  {action.icon}
                </div>
                <span className={`text-[11px] text-center leading-tight ${action.danger ? "text-danger" : "text-ink"}`}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function ExternalTarget({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
      {children}
      <span className="text-[11px] text-ink-muted truncate w-full text-center">{label}</span>
    </button>
  );
}
