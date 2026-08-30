import { Link } from "react-router-dom";
import { Heart, ThumbsDown, Handshake, XCircle, UserPlus, Gift, MessageCircle, Bell } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "../hooks/useNotifications";
import { Avatar } from "../components/Avatar";
import { BottomNav } from "../components/BottomNav";
import type { NotificationWithActor } from "../hooks/useNotifications";

const TYPE_CONFIG: Record<string, { icon: typeof Heart; verb: string }> = {
  like: { icon: Heart, verb: "liked your post" },
  dislike: { icon: ThumbsDown, verb: "disliked your post" },
  support: { icon: Handshake, verb: "supported your post" },
  disagree: { icon: XCircle, verb: "disagreed with your post" },
  pushback: { icon: Handshake, verb: "pushed back on your post" },
  comment_reply: { icon: MessageCircle, verb: "replied to you" },
  follow: { icon: UserPlus, verb: "followed you" },
  gift_received: { icon: Gift, verb: "sent you a gift" },
  message: { icon: MessageCircle, verb: "sent you a message" },
  system: { icon: Bell, verb: "" },
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

function notificationLink(n: NotificationWithActor): string {
  if (n.target_type === "post" && n.target_id) return `/post/${n.target_id}`;
  if (n.target_type === "comment" && n.target_id) return `/post/${n.target_id}`; // comments link back through post context
  if (n.target_type === "conversation" && n.target_id) return `/messages/${n.target_id}`;
  if (n.target_type === "profile" && n.actor) return `/profile/${n.actor.username}`;
  return "#";
}

export function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

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
          notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
            const Icon = config.icon;

            return (
              <Link
                key={n.id}
                to={notificationLink(n)}
                onClick={() => !n.read_at && markRead.mutate(n.id)}
                className={`flex items-start gap-3 py-3.5 border-b border-border ${
                  !n.read_at ? "bg-accent-soft/40 -mx-4 px-4" : ""
                }`}
              >
                {n.actor ? (
                  <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-accent" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    {n.actor && <span className="font-medium">{n.actor.display_name}</span>}{" "}
                    {config.verb}
                  </p>
                  {n.preview_text && (
                    <p className="text-sm text-ink-muted truncate mt-0.5">"{n.preview_text}"</p>
                  )}
                  <p className="text-xs text-ink-muted mt-0.5">{timeAgo(n.created_at)}</p>
                </div>

                {!n.read_at && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />}
              </Link>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
