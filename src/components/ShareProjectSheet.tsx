// src/components/ShareProjectSheet.tsx
//
// In-app "share to another user or community" for a project on Connect / Library. It sends the project's public page
// link (the /:slug page, or /projects/:id when it has no slug yet) as a normal chat message, so whoever opens it lands
// on the project's own page, where access is decided the usual way. A shared link never hands over the ticket, the
// reader or the files themselves.
//
// People are the person's existing conversations (same list the forward sheet uses); communities are the groups they
// are in or run, reached through the group's own chat.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Send, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getProjectUrl } from "../lib/projectLinks";
import { useAuth } from "../hooks/useAuth";
import { useConversations, useForwardMessages } from "../hooks/useMessaging";
import { useBackDismiss } from "../hooks/useBackDismiss";
import { useScrollLock } from "../hooks/useScrollLock";
import { Avatar } from "./Avatar";

interface ShareProjectSheetProps {
  projectId: string;
  title: string;
  slug: string | null;
  onClose: () => void;
  onSent: () => void;
}

interface MyGroup {
  id: string;
  title: string;
  thumbnail_url: string | null;
  thumbnail_shape?: string | null;
}

// The groups this person is a member of, owns or helps host.
function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["share-target-groups", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyGroup[]> => {
      const [members, owned, mods] = await Promise.all([
        supabase.from("room_members").select("project_id").eq("user_id", user!.id),
        supabase.from("projects").select("id").eq("owner_id", user!.id).eq("project_type", "room"),
        supabase.from("room_moderators").select("project_id").eq("user_id", user!.id),
      ]);
      const ids = new Set<string>();
      for (const r of (members.data as { project_id: string }[] | null) ?? []) ids.add(r.project_id);
      for (const r of (owned.data as { id: string }[] | null) ?? []) ids.add(r.id);
      for (const r of (mods.data as { project_id: string }[] | null) ?? []) ids.add(r.project_id);
      if (!ids.size) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, title, thumbnail_url, thumbnail_shape")
        .in("id", [...ids])
        .eq("is_active", true)
        .order("title", { ascending: true });
      return (data as MyGroup[] | null) ?? [];
    },
  });
}

export function ShareProjectSheet({ projectId, title, slug, onClose, onSent }: ShareProjectSheetProps) {
  useBackDismiss(onClose);
  useScrollLock();
  const { data: conversations, isLoading: loadingPeople } = useConversations();
  const { data: groups, isLoading: loadingGroups } = useMyGroups();
  const forwardMessages = useForwardMessages();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const people = useMemo(() => {
    const direct = (conversations ?? []).filter((c) => !c.is_group);
    if (!q) return direct;
    return direct.filter(
      (c) =>
        c.other_participant.display_name.toLowerCase().includes(q) || c.other_participant.username.toLowerCase().includes(q)
    );
  }, [conversations, q]);

  // A group's own page is not something to share into itself.
  const communities = useMemo(() => {
    const list = (groups ?? []).filter((g) => g.id !== projectId);
    return q ? list.filter((g) => g.title.toLowerCase().includes(q)) : list;
  }, [groups, q, projectId]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSend() {
    if (!selected.size) return;
    setError(null);
    try {
      const conversationIds: string[] = [];
      for (const key of selected) {
        if (key.startsWith("dm:")) {
          conversationIds.push(key.slice(3));
        } else {
          // A group's chat is created the first time it is needed, so resolve it now.
          const { data, error: rpcError } = await supabase.rpc("get_or_create_room_conversation", {
            p_project_id: key.slice(6),
          });
          if (rpcError || !data) throw rpcError ?? new Error("no conversation");
          conversationIds.push(data as string);
        }
      }
      const url = getProjectUrl({ id: projectId, slug });
      await forwardMessages.mutateAsync({
        messages: [{ content: `${title}\n${url}` }],
        targetConversationIds: conversationIds,
      });
      onSent();
    } catch {
      setError("Couldn't share that. Check your connection and try again.");
    }
  }

  const loading = loadingPeople || loadingGroups;
  const empty = !loading && !people.length && !communities.length;

  function Row({ rowKey, name, src }: { rowKey: string; name: string; src: string | null }) {
    const isSelected = selected.has(rowKey);
    return (
      <button type="button" onClick={() => toggle(rowKey)} className="w-full flex items-center gap-3 px-2 py-2.5 text-left">
        <Avatar src={src} name={name} size="sm" />
        <span className="flex-1 min-w-0 text-sm text-ink truncate">{name}</span>
        <span
          className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
            isSelected ? "bg-accent border-accent" : "border-border"
          }`}
        >
          {isSelected && <span className="w-2 h-2 rounded-full bg-canvas" />}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 ako-keyboard-aware z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-canvas/70 backdrop-blur-overlay" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-[28px] border border-border max-h-[calc(100dvh-10rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-medium text-ink truncate pr-3">Share {title}</p>
          <button onClick={onClose} className="text-ink-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people and communities…"
              className="w-full pl-10 pr-3 py-2.5 rounded-full border border-border bg-canvas text-ink text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2">
          {loading ? (
            <p className="text-ink-muted text-center py-8 text-sm">Loading…</p>
          ) : empty ? (
            <p className="text-ink-muted text-center py-8 text-sm">Nobody to share with yet.</p>
          ) : (
            <>
              {people.length > 0 && (
                <>
                  <p className="px-2 pt-2 pb-1 text-xs font-medium text-ink-muted">People</p>
                  {people.map((c) => (
                    <Row
                      key={c.id}
                      rowKey={`dm:${c.id}`}
                      name={c.other_participant.display_name}
                      src={c.other_participant.avatar_url}
                    />
                  ))}
                </>
              )}
              {communities.length > 0 && (
                <>
                  <p className="px-2 pt-3 pb-1 text-xs font-medium text-ink-muted">Communities</p>
                  {communities.map((g) => (
                    <Row key={g.id} rowKey={`group:${g.id}`} name={g.title} src={g.thumbnail_url} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <div className="px-4 pt-2 pb-4">
          <p className="text-xs text-ink-muted text-center pb-2">They get a link to its page.</p>
          {error && <p className="text-xs text-danger text-center pb-2">{error}</p>}
          <button
            onClick={handleSend}
            disabled={!selected.size || forwardMessages.isPending}
            className="w-full flex items-center justify-center gap-2 bg-cta text-white rounded-full py-3 text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} />
            {forwardMessages.isPending ? "Sending…" : selected.size ? `Send to ${selected.size}` : "Select who to send to"}
          </button>
        </div>
      </div>
    </div>
  );
}
