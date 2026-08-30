import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project settings — never commit real
// values, use a .env.local file (see .env.example) that's gitignored.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env.local and fill in your project values."
  );
}

// Only the anon key ever lives in frontend code — it's safe to expose
// publicly because RLS policies (defined in the SQL migrations) are
// what actually enforce access control, not this key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
