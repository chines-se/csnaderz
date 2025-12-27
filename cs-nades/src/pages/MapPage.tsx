import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import KonvaMap from "../components/KonvaMap"
import VideoModal from "../components/VideoModal"
import type { NadeType, NadeSpot, Stroke } from "../data/types"
import { useMapData } from "../hooks/useMapData"
import AdminAuth from "../components/AdminAuth"


type Mode = "browse" | "place" | "edit" | "draw"

export default function MapPage() {
  const params = useParams()
  const map = (params.map ?? "").toLowerCase()
  if (!params.map) return <main className="p-8">No map provided.</main>

  const {
    loading,
    error,
    spots,
    strokes,
    setStrokes,
    addSpot,
    updateSpot,
    deleteSpot,
    saveDrawings,
  } = useMapData(map)

  const [selected, setSelected] = useState<NadeSpot | null>(null)
  const [mode, setMode] = useState<Mode>("browse")
  const [placementType, setPlacementType] = useState<NadeType>("smoke")
  const [snap, setSnap] = useState(true)

  // Optional: filter by type later; for now use all
  const mapSpots = useMemo(() => spots, [spots])

  return (
    <main className="p-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* inside toolbar */}
        <AdminAuth />
        <h1 className="text-2xl font-bold capitalize mr-4">{map}</h1>
        <button className="px-3 py-1 rounded bg-zinc-800" onClick={() => setMode("browse")}>
          Browse
        </button>
        <button className="px-3 py-1 rounded bg-zinc-800" onClick={() => setMode("place")}>
          Place
        </button>
        <button className="px-3 py-1 rounded bg-zinc-800" onClick={() => setMode("edit")}>
          Edit
        </button>
        <button className="px-3 py-1 rounded bg-zinc-800" onClick={() => setMode("draw")}>
          Draw
        </button>

        {mode === "place" && (
          <>
            <select
              className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800"
              value={placementType}
              onChange={(e) => setPlacementType(e.target.value as NadeType)}
            >
              <option value="smoke">Smoke</option>
              <option value="flash">Flash</option>
              <option value="molotov">Molotov</option>
              <option value="he">HE</option>
            </select>
          </>
        )}

        {mode === "edit" && (
          <label className="ml-2 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Snap to grid
          </label>
        )}

        {mode === "draw" && (
          <>
            <button
              className="px-3 py-1 rounded bg-zinc-800"
              onClick={() => {
                const next = strokes.slice(0, -1)
                setStrokes(next)
              }}
            >
              Undo
            </button>
            <button className="px-3 py-1 rounded bg-zinc-800" onClick={() => setStrokes([])}>
              Clear
            </button>
            <button
              className="px-3 py-1 rounded bg-zinc-800"
              onClick={async () => {
                await saveDrawings(strokes)
              }}
            >
              Save drawing
            </button>
          </>
        )}
      </div>

      {loading && <div className="text-zinc-400">Loading…</div>}
      {error && <div className="text-red-400">{error}</div>}

      <KonvaMap
        mapImageUrl={`/maps/${map}.png`}
        width={900}
        height={900}
        nativeSize={1200}
        spots={mapSpots}
        mode={mode}
        placementType={placementType}
        snapToGrid={snap}
        gridSize={20}
        strokes={strokes}
        setStrokes={setStrokes}
        onSelectSpot={(s) => {
          if (mode === "browse") setSelected(s)
        }}
        onPlaceSpot={async ({ x, y, type }) => {
          try {
            await addSpot({
              map,
              type,
              title: `${map} ${type}`,
              videoPath: `${map}/${map}.mp4`,
              x,
              y,
            })
          } catch (e: any) {
            console.error(e)
            alert(`Could not add spot: ${e.message ?? e}`)
          }
        }}
        onMoveSpot={async (id, x, y) => {
          await updateSpot(id, { x, y })
        }}
        onDeleteSpot={async (id) => {
          await deleteSpot(id)
        }}
      />

      <VideoModal spot={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
