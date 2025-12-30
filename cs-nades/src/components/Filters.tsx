/**
 * Filter button row for selecting nade categories.
 */
import type { NadeType } from "../data/nades"

// Include a synthetic "all" option for the list.
const types: (NadeType | "all")[] = [
  "all",
  "smoke",
  "flash",
  "molotov",
  "he",
]

/**
 * Render filter buttons for nade type selection.
 */
export default function Filters({
  active,
  setActive,
}: {
  active: string
  setActive: (v: string) => void
}) {
  return (
    <div className="flex gap-2 mb-6">
      {types.map((type) => (
        <button
          key={type}
          onClick={() => setActive(type)}
          className={`px-3 py-1 rounded ${
            active === type
              ? "bg-zinc-100 text-zinc-900"
              : "bg-zinc-800"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  )
}
