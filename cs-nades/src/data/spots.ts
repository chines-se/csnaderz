/**
 * Sample spot data for local development and fallback UI.
 */
export type NadeSpot = {
  id: string
  map: string
  type: "smoke" | "flash" | "molotov" | "he"
  title: string
  x: number
  y: number
  // Video path relative to the storage bucket (e.g. "mirage/window-smoke.mp4").
  videoPath: string
}

// Placeholder spots used when not loading from Supabase.
export const spots: NadeSpot[] = [
  {
    id: "mirage-smoke",
    map: "mirage",
    type: "smoke",
    title: "Mirage Smoke",
    x: 612,
    y: 330,
    videoPath: "mirage/mirage.mp4",
  },
]
