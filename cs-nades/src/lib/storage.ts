import { supabase } from "./supabase"

const BUCKET = "nade-videos"

export function getPublicVideoUrl(videoPath: string) {
  if (!supabase) return ""
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(videoPath)
  return data.publicUrl
}
