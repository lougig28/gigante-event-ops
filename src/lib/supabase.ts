import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when real Supabase credentials are present. When false the app runs in
 *  offline/seed mode: the shell, map, and seeded views still render. See SETUP.md. */
export const supabaseConfigured = Boolean(url && anon);

if (!supabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running in offline/seed mode.",
  );
}

export const supabase = createClient<Database>(
  url ?? "http://localhost:54321",
  anon ?? "placeholder-anon-key",
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);
