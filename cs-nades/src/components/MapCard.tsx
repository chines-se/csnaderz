/**
 * Card-style link to a specific map page.
 */
import { Link } from "react-router-dom"

/**
 * Render a map card with a route to the map page.
 */
export default function MapCard({ map }: { map: string }) {
  return (
    <Link
      to={`/maps/${map}`}
      className="bg-zinc-900 rounded-xl p-6 hover:bg-zinc-800 transition"
    >
      <h2 className="capitalize text-lg font-semibold">{map}</h2>
    </Link>
  )
}
