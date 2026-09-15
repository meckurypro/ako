import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ThumbsDown,
  Handshake,
  XCircle,
  UserPlus,
  Gift,
  MessageCircle,
  Bell,
  UserCheck,
  UserX,
  Repeat2,
  Quote,
  Redo2,
  Users,
  Tag,
  AtSign,
  ShieldAlert,
  Send,
  Megaphone,
  Wallet2,
  Coins,
  Banknote,
  Briefcase,
  Music2,
} from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "../hooks/useNotifications";
import {
  usePageNotifications,
  useMarkPageNotificationRead,
  useMarkAllPageNotificationsRead,
} from "../hooks/usePageNotifications";
import { usePageById, useActiveIdentity } from "../hooks/usePages";
import { Avatar } from "../components/Avatar";
import { AkoMark } from "../components/AkoMark";
import { BottomNav } from "../components/BottomNav";
import { PageInviteResponseModal } from "../components/PageInviteResponseModal";
import { CollaborationInviteResponseModal } from "../components/CollaborationInviteResponseModal";
import { MusicCreditResponseModal } from "../components/MusicCreditResponseModal";
import type { NotificationWithActor } from "../hooks/useNotifications";

const TYPE_CONFIG: Record<string, { icon: typeof Heart; verb: string }> = {
  // like/dislike/share can target a post OR a project (see
  // notify_on_reaction — projects only ever get like/dislike/share,
  // never support/disagree/pushback) — verb here is the post-target
  // default; verbFor() below swaps in "project" when target_type is.
  like: { icon: Heart, verb: "liked your post" },
  dislike: { icon: ThumbsDown, verb: "disliked your post" },
  support: { icon: Handshake, verb: "supported your post" },
  disagree: { icon: XCircle, verb: "disagreed with your post" },
  pushback: { icon: Handshake, verb: "pushed back on your post" },
  reshare: { icon: Repeat2, verb: "reposted your post" },
  quote: { icon: Quote, verb: "quoted your post" },
  share: { icon: Redo2, verb: "shared your post" },
  comment_like: { icon: Heart, verb: "liked your comment" },
  comment_dislike: { icon: ThumbsDown, verb: "disliked your comment" },
  comment_reply: { icon: MessageCircle, verb: "replied to you" },
  // Sent to the POST's author (not the comment's author) when someone
  // reacts to or replies to a comment underneath their post — a
  // different person from whoever gets comment_like/comment_reply for
  // the same event, so it needs its own copy.
  post_comment_activity: { icon: MessageCircle, verb: "was active in the discussion on your post" },
  follow: { icon: UserPlus, verb: "followed you" },
  gift_received: { icon: Gift, verb: "sent you a gift" },
  message: { icon: MessageCircle, verb: "sent you a message" },
  system: { icon: Bell, verb: "" },
  // Sent by an admin via /admin/notifications/send — actor_id is
  // always null for these (nobody "did" this to the recipient), so
  // it renders with the Akọ. mark instead of a user avatar, same
  // pattern as `system` but with its own sender label.
  admin_message: { icon: Bell, verb: "" },
  follow_request: { icon: UserPlus, verb: "requested to follow you" },
  follow_request_accepted: { icon: UserCheck, verb: "accepted your follow request" },
  page_role_invite: { icon: Users, verb: "invited you to join their team" },
  page_role_accepted: { icon: UserCheck, verb: "accepted your team invite" },
  page_role_declined: { icon: UserX, verb: "declined your team invite" },
  post_tagged: { icon: Tag, verb: "tagged you in a post" },
  project_tagged: { icon: Tag, verb: "tagged you in a project" },
  collaboration_invite: { icon: Users, verb: "invited you to collaborate" },
  collaboration_accepted: { icon: UserCheck, verb: "accepted your collaboration invite" },
  collaboration_declined: { icon: UserX, verb: "declined your collaboration invite" },
  mention: { icon: AtSign, verb: "mentioned you" },
  moderation_notice: { icon: ShieldAlert, verb: "" },
  promotion_approved: { icon: Megaphone, verb: "Your promotion was approved" },
  promotion_declined: { icon: Megaphone, verb: "Your promotion needs changes" },
  post_published: { icon: Send, verb: "Your scheduled post is live" },
  room_meeting_scheduled: { icon: Users, verb: "scheduled a new Room meeting" },
  project_purchased: { icon: Wallet2, verb: "bought your project" },
  affiliate_commission_earned: { icon: Coins, verb: "You earned an affiliate commission" },
  withdrawal_status: { icon: Banknote, verb: "" },
  // System-generated (actor_id null) — see find_or_create_role_gig /
  // auto_create_gig_on_collaboration_accept. target_id is the new
  // Gig's project id, so this already routes to it via the generic
  // target_type==="project" case in notificationLink().
  gig_created_from_collaboration: { icon: Briefcase, verb: "A Gig was started from your collaboration" },
  // publish-music tags a non-publisher contributor 'pending' — see
  // respond_to_music_credit(). Same "needs accept/decline, not a
  // plain link" case as collaboration_invite below.
  music_credit_request: { icon: Music2, verb: "credited you on their song" },
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Where a tap on a notification should land. page_role_invite/
// page_role_accepted are handled entirely inside NotificationRow below
// instead (a modal and an async username lookup respectively, neither
// of which fits this synchronous function), so both are deliberately
// left out here — every other engagement type except gifts (gift_received
// routes through Messages, not here — see TYPE_CONFIG/design notes)
// takes the person to the exact post or comment they were engaged on:
//   - post-level engagement (like/dislike/support/disagree/pushback on
//     a POST) already has target_id === the post id, so /post/{id} is
//     already the exact target.
//   - comment-level engagement (a reply on your post, or on your
//     comment) has target_id === the COMMENT id, which isn't a route on
//     its own — useNotifications() resolves comment_post_id for these,
//     so we route to the parent post with a `#comment-{id}` anchor that
//     PostDetail/CommentThread scroll to and briefly highlight.
// Rooms, courses, books, and meetings each have a dedicated page
// distinct from the generic project detail page — see project_type
// on NotificationWithActor. Anything else (media/file/url/event/gig/
// pitch) still uses the generic page, same as before.
const PROJECT_TYPE_ROUTE: Record<string, (id: string) => string> = {
  room: (id) => `/rooms/${id}`,
  course: (id) => `/courses/${id}`,
  book: (id) => `/books/${id}`,
  meeting: (id) => `/meetings/${id}`,
};

function notificationLink(n: NotificationWithActor): string {
  if (n.type === "follow_request") return "/requests";
  if (n.target_type === "post" && n.target_id) return `/post/${n.target_id}`;
  if (n.target_type === "project" && n.target_id) {
    const route = n.project_type ? PROJECT_TYPE_ROUTE[n.project_type] : undefined;
    return route ? route(n.target_id) : `/projects/${n.target_id}`;
  }
  // Promotions don't have their own detail page — the promoter's own
  // "boosted post/project" state lives on whatever they promoted, so
  // send them back to Wallet, where promotion status/history is
  // already surfaced (see MyAffiliateLinks/Wallet).
  if (n.target_type === "promotion") return "/wallet";
  // No dedicated withdrawal detail page yet — Wallet already surfaces
  // withdrawal history/status, same reasoning as promotion above.
  if (n.target_type === "withdrawal") return "/wallet";
  if (n.target_type === "comment" && n.target_id) {
    // comment_post_id can be null if it couldn't be resolved (e.g. the
    // comment was since deleted) — nothing sensible to link to then.
    return n.comment_post_id ? `/post/${n.comment_post_id}#comment-${n.target_id}` : "#";
  }
  if (n.target_type === "conversation" && n.target_id) return `/messages/${n.target_id}`;
  if (n.target_type === "profile" && n.actor) return `/profile/${n.actor.username}`;
  return "#";
}

// Row content shared by every notification type — pulled out so the
// three different "what happens on tap" behaviors below (plain Link,
// modal-opening button, async-resolved Link) can each wrap it the same
// way instead of triplicating the avatar/text/unread-dot markup.
// Types where actor_id is set for bookkeeping (an admin who reviewed
// something, or — for post_published — the author themself via a
// system job) rather than "this person did something to you". Showing
// their avatar/name next to the message reads wrong (your own face
// next to "Your scheduled post is live"; a moderator's identity next
// to a promotion decision) — these render with the generic icon block
// and just the verb instead, same as system/admin_message already did.
const NO_ACTOR_TYPES = new Set([
  "system",
  "admin_message",
  "moderation_notice",
  "promotion_approved",
  "promotion_declined",
  "post_published",
  // Passive money events — actor_id is null (affiliate_commission_earned)
  // or not applicable (withdrawal_status) already, but explicit here so
  // the icon block always renders even if that ever changes upstream.
  // project_purchased is deliberately NOT in this set — the buyer is a
  // real person who did a real thing, showing them is the whole point.
  "affiliate_commission_earned",
  "withdrawal_status",
  "gig_created_from_collaboration",
]);

const PROJECT_TARGETABLE_TYPES = new Set(["like", "dislike", "share"]);

function verbFor(n: NotificationWithActor, config: { verb: string }): string {
  if (n.target_type === "project" && PROJECT_TARGETABLE_TYPES.has(n.type)) {
    return config.verb.replace("your post", "your project");
  }
  return config.verb;
}

function NotificationRowContent({ n, config }: { n: NotificationWithActor; config: { icon: typeof Heart; verb: string } }) {
  const Icon = config.icon;
  const showActor = !!n.actor && !NO_ACTOR_TYPES.has(n.type);
  return (
    <>
      {showActor ? (
        <Avatar src={n.actor!.avatar_url} name={n.actor!.display_name} size="sm" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-accent" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          {showActor && <span className="font-medium">{n.actor!.display_name}</span>}
          {n.type === "admin_message" && (
            <span className="inline-flex items-center gap-1 font-medium">
              <AkoMark size={16} /> Akọ.
            </span>
          )}{" "}
          {verbFor(n, config)}
        </p>
        {n.preview_text && (
          <p className="text-sm text-ink-muted truncate mt-0.5">"{n.preview_text}"</p>
        )}
        <p className="text-xs text-ink-muted mt-0.5">{timeAgo(n.created_at)}</p>
      </div>

      {!n.read_at && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />}
    </>
  );
}

const ROW_CLASS = (unread: boolean) =>
  `flex items-start gap-3 py-3.5 border-b border-border w-full text-left ${unread ? "bg-highlight -mx-4 px-4" : ""}`;

// A tap on a page_role_accepted OR page_role_declined notification
// should land on the page's team roster — so the inviter can see
// their new teammate, or re-invite someone else after a decline —
// but the notification only carries the page's id, not its username,
// resolved here via usePageById rather than in the synchronous
// notificationLink() above.
function PageResponseRow({ n, onRead }: { n: NotificationWithActor; onRead: () => void }) {
  const { data: page } = usePageById(n.target_id ?? "", !!n.target_id);
  const config = n.type === "page_role_declined" ? TYPE_CONFIG.page_role_declined : TYPE_CONFIG.page_role_accepted;
  return (
    <Link
      to={page ? `/page/${page.username}/team` : "#"}
      onClick={onRead}
      className={ROW_CLASS(!n.read_at)}
    >
      <NotificationRowContent n={n} config={config} />
    </Link>
  );
}

function NotificationRow({
  n,
  onRead,
  onOpenInvite,
  onOpenCollaborationInvite,
  onOpenMusicCreditRequest,
}: {
  n: NotificationWithActor;
  onRead: () => void;
  onOpenInvite: (pageId: string) => void;
  onOpenCollaborationInvite: (target: "post" | "project", targetId: string) => void;
  onOpenMusicCreditRequest: (catalogueId: string) => void;
}) {
  const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;

  if (n.type === "page_role_invite" && n.target_id) {
    return (
      <button
        onClick={() => {
          onRead();
          onOpenInvite(n.target_id!);
        }}
        className={ROW_CLASS(!n.read_at)}
      >
        <NotificationRowContent n={n} config={config} />
      </button>
    );
  }

  if (n.type === "page_role_accepted" || n.type === "page_role_declined") {
    return <PageResponseRow n={n} onRead={onRead} />;
  }

  // Same "needs a synchronous accept/decline step, not a plain link"
  // case as page_role_invite above — the actual response UI lives in
  // CollaborationInviteResponseModal.
  if (n.type === "collaboration_invite" && n.target_id && (n.target_type === "post" || n.target_type === "project")) {
    const target = n.target_type;
    return (
      <button
        onClick={() => {
          onRead();
          onOpenCollaborationInvite(target, n.target_id!);
        }}
        className={ROW_CLASS(!n.read_at)}
      >
        <NotificationRowContent n={n} config={config} />
      </button>
    );
  }

  // Same pattern again for a pending music credit — see
  // MusicCreditResponseModal.
  if (n.type === "music_credit_request" && n.target_id) {
    return (
      <button
        onClick={() => {
          onRead();
          onOpenMusicCreditRequest(n.target_id!);
        }}
        className={ROW_CLASS(!n.read_at)}
      >
        <NotificationRowContent n={n} config={config} />
      </button>
    );
  }

  return (
    <Link to={notificationLink(n)} onClick={onRead} className={ROW_CLASS(!n.read_at)}>
      <NotificationRowContent n={n} config={config} />
    </Link>
  );
}

export function Notifications() {
  const { data: identity } = useActiveIdentity();
  const isPageMode = identity?.mode === "page";
  const pageId = isPageMode ? identity.page.id : undefined;

  // Same shape (NotificationWithActor[]), different source table —
  // see usePageNotifications.ts for why pages get a separate table
  // instead of reusing personal notifications with a page_id column.
  const personal = useNotifications();
  const page = usePageNotifications(pageId);
  const { data: notifications, isLoading } = isPageMode ? page : personal;

  const markReadPersonal = useMarkNotificationRead();
  const markReadPage = useMarkPageNotificationRead(pageId);
  const markAllReadPersonal = useMarkAllRead();
  const markAllReadPage = useMarkAllPageNotificationsRead(pageId);
  const markRead = isPageMode ? markReadPage : markReadPersonal;
  const markAllRead = isPageMode ? markAllReadPage : markAllReadPersonal;

  const [openInvitePageId, setOpenInvitePageId] = useState<string | null>(null);
  const [openCollaborationInvite, setOpenCollaborationInvite] = useState<
    { target: "post" | "project"; targetId: string } | null
  >(null);
  const [openMusicCreditCatalogueId, setOpenMusicCreditCatalogueId] = useState<string | null>(null);

  const hasUnread = notifications?.some((n) => !n.read_at);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">
          {isPageMode ? `${identity.page.name}'s Notifications` : "Notifications"}
        </h2>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm text-accent font-medium"
          >
            Mark all read
          </button>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 pt-2">
        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : !notifications || notifications.length === 0 ? (
          <p className="text-ink-muted text-center py-10 text-sm">Nothing yet.</p>
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onRead={() => !n.read_at && markRead.mutate(n.id)}
              onOpenInvite={setOpenInvitePageId}
              onOpenCollaborationInvite={(target, targetId) => setOpenCollaborationInvite({ target, targetId })}
              onOpenMusicCreditRequest={setOpenMusicCreditCatalogueId}
            />
          ))
        )}
      </div>

      {openInvitePageId && (
        <PageInviteResponseModal
          pageId={openInvitePageId}
          onClose={() => setOpenInvitePageId(null)}
        />
      )}

      {openCollaborationInvite && (
        <CollaborationInviteResponseModal
          target={openCollaborationInvite.target}
          targetId={openCollaborationInvite.targetId}
          onClose={() => setOpenCollaborationInvite(null)}
        />
      )}

      {openMusicCreditCatalogueId && (
        <MusicCreditResponseModal
          catalogueId={openMusicCreditCatalogueId}
          onClose={() => setOpenMusicCreditCatalogueId(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
