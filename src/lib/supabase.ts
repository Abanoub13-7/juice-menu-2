import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// New Supabase projects issue a "publishable" key (sb_publishable_...); older projects
// issue an "anon" JWT. Both are public, RLS-restricted browser keys. The publishable
// name is preferred; the legacy name is still accepted.
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

/**
 * True once VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY) are set. The rest of
 * the app checks this before touching `supabase` so that running the menu
 * without a database configured (e.g. local preview) fails gracefully
 * instead of throwing on import.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Only the publishable/anon (public) key is ever read here — never a service-role key.
 *  See supabase/migrations/ for the RLS policies that make the anon key safe
 *  to ship to the browser. */
