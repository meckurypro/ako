import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get the current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session-wide realtime sync. As long as the user is signed in, listen
  // for new notification rows addressed to THEM — the DB triggers
  // (notify_on_message, notify_on_follow) already scope these correctly
  // to the recipient — and push cache updates immediately. This is what
  // makes the bell and the message icon update live anywhere in the app,
  // instead of waiting on the bell's 30s poll or the conversation list's
  // 15s poll, or requiring a specific thread to be open.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Bell badge + list
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });

          // Message-type notifications also drive the message icon badge
          // and the conversation list/preview.
          if (payload.new.type === "message") {
            queryClient.invalidateQueries({ queryKey: ["conversations", userId] });

            const conversationId = payload.new.target_id as string | undefined;
            if (conversationId) {
              queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
