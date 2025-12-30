/**
 * Landing page showing available maps.
 */
import MapCard from "../components/MapCard"

// Static list of supported maps for the home grid.
const maps = ["mirage", "inferno", "nuke", "ancient"]

/**
 * Render the map selection grid.
 */
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        CS2 Utility Lineups
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {maps.map(map => (
          <MapCard key={map} map={map} />
        ))}
      </div>
    </main>
  )
}
