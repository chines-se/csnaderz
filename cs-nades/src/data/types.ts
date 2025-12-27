export type NadeType = "smoke" | "flash" | "molotov" | "he"

export type NadeSpot = {
  id: string
  map: string
  type: NadeType
  title: string
  videoPath: string
  x: number
  y: number
}

export type Stroke = {
  id: string
  tool: "pen"
  width: number
  points: number[] // [x1,y1,x2,y2,...] in native coords
}
