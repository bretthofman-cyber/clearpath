import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.");
}

// Populated by App.jsx after Clerk loads. The Supabase client uses the "supabase"
// JWT template so RLS policies can read auth.jwt() ->> 'sub' as the user identity.
let _getClerkToken = null;
export function setClerkTokenGetter(fn) { _getClerkToken = fn; }

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
  {
    accessToken: async () => {
      if (!_getClerkToken) return null;
      return await _getClerkToken({ template: "supabase" });
    },
  }
);
