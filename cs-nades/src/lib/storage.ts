/**
 * Helper utilities for retrieving public storage URLs.
 */
import { supabase } from "./supabase"

// Storage bucket for lineup videos.
const BUCKET = "nade-videos"

/**
 * Build a public URL for a video asset stored in Supabase.
 */
export function getPublicVideoUrl(videoPath: string) {
  if (!supabase) return ""
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(videoPath)
  return data.publicUrl
}
