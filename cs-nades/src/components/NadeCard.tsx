/**
 * Card UI for presenting a single nade entry.
 */
import type { Nade } from "../data/nades"

/**
 * Render a nade preview with basic metadata.
 */
export default function NadeCard({ nade }: { nade: Nade }) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <div className="h-40 bg-zinc-800 flex items-center justify-center text-zinc-500">
        Image
      </div>

      <div className="p-4">
        <span className="text-xs uppercase text-zinc-400">
          {nade.type}
        </span>
        <h3 className="font-semibold">{nade.name}</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {nade.description}
        </p>
      </div>
    </div>
  )
}
