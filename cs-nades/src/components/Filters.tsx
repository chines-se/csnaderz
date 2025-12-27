import type { NadeType } from "../data/nades"

const types: (NadeType | "all")[] = [
  "all",
  "smoke",
  "flash",
  "molotov",
  "he",
]

export default function Filters({
  active,
  setActive,
}: {
  active: string
  setActive: (v: string) => void
}) {
  return (
    <div className="flex gap-2 mb-6">
      {types.map(type => (
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
