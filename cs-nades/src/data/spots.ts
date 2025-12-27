export type NadeSpot = {
  id: string
  map: string
  type: "smoke" | "flash" | "molotov" | "he"
  title: string
  x: number
  y: number
  videoPath: string // e.g. "mirage/window-smoke.mp4"
}

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
