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
} from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "../hooks/useNotifications";
import { usePageById } from "../hooks/usePages";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import { PageInviteResponseModal } from "../components/PageInviteResponseModal";
import type { NotificationWithActor } from "../hooks/useNotifications";

const TYPE_CONFIG: Record<string, { icon: typeof Heart; verb: string }> = {
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
function notificationLink(n: NotificationWithActor): string {
  if (n.type === "follow_request") return "/requests";
  if (n.target_type === "post" && n.target_id) return `/post/${n.target_id}`;
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
function NotificationRowContent({ n, config }: { n: NotificationWithActor; config: { icon: typeof Heart; verb: string } }) {
  const Icon = config.icon;
  return (
    <>
      {n.actor ? (
        <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size="sm" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-accent" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          {n.actor && <span className="font-medium">{n.actor.display_name}</span>}
          {n.type === "admin_message" && <span className="font-medium">Akọ.</span>}{" "}
          {config.verb}
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
}: {
  n: NotificationWithActor;
  onRead: () => void;
  onOpenInvite: (pageId: string) => void;
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

  return (
    <Link to={notificationLink(n)} onClick={onRead} className={ROW_CLASS(!n.read_at)}>
      <NotificationRowContent n={n} config={config} />
    </Link>
  );
}

export function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [openInvitePageId, setOpenInvitePageId] = useState<string | null>(null);

  const hasUnread = notifications?.some((n) => !n.read_at);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">Notifications</h2>
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

      <BottomNav />
    </div>
  );
}
