/**
 * Supabase client initialization using Vite environment variables.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Read configuration from Vite's injected environment variables.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined

// Export a nullable client so UI can gracefully handle missing config.
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

if (!url || !key) {
  console.warn(
    "Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart Vite."
  )
}
