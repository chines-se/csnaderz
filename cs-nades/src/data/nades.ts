/**
 * Static nade definitions used in the sample UI.
 */
export type NadeType = "smoke" | "flash" | "molotov" | "he"

export type Nade = {
  id: string
  map: string
  type: NadeType
  name: string
  description: string
  image: string
}

// Example data for display-only lists.
export const nades: Nade[] = [
  {
    id: "mirage-window",
    map: "mirage",
    type: "smoke",
    name: "Window Smoke",
    description: "Jumpthrow from T spawn.",
    image: "/images/window.png",
  },
  {
    id: "mirage-ct",
    map: "mirage",
    type: "flash",
    name: "CT Flash",
    description: "Pop flash for A execute.",
    image: "/images/ct-flash.png",
  },
]
