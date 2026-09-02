import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface MyProfile {
  username: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: MyProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ...keep your existing realtime-notifications effect unchanged...
  // ...keep your existing presence-heartbeat effect unchanged...

  const userId = session?.user?.id;

  // Own username, fetched once per session and cached — shared with
  // MyProfileRedirect via the same query key, and used by BottomNav
  // to detect "am I viewing my own profile" without going through /me.
  const { data: profile } = useQuery({
    queryKey: ["my-username", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: Infinity,
  });

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile: profile ?? null, loading }}
    >
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
