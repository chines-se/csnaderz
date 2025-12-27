import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import KonvaMap from "../components/KonvaMap"
import VideoModal from "../components/VideoModal"
import { spots } from "../data/spots"
import type { NadeSpot } from "../data/spots"

export default function MapPage() {
  const params = useParams()
  const map = (params.map ?? "").toLowerCase()
  const [selected, setSelected] = useState<NadeSpot | null>(null)



  useEffect(() => {   
  console.log("selected state changed:", selected)
  }, [selected])


  const mapSpots = useMemo(
    () => spots.filter(s => s.map.toLowerCase() === map),
    [map]
  )
  
  if (!params.map) return <main className="p-8">No map provided.</main>

  return (
     <main className="p-8 space-y-4">
      {/* ✅ DEBUG BLOCK GOES RIGHT HERE */}
      <div className="p-2 rounded bg-zinc-800 text-zinc-100">
        MapPage loaded. param map = {String(params.map)} / normalized = {map}
      </div>

      <div className="text-sm text-zinc-400">
        spots found: {mapSpots.length}
      </div>

      <h1 className="text-2xl font-bold capitalize">{map}</h1>

      <div className="text-sm text-zinc-300">
        Selected: {selected ? selected.id : "none"}
      </div>

      <KonvaMap
        mapImageUrl={`/maps/${map}.png`}
        width={900}
        height={900}
        spots={mapSpots}
        onSelectSpot={(s) => {
            console.log("Selected spot (MapPage):", s)
            setSelected(s)
        }}
     />

      {/* <VideoModal spot={selected} onClose={() => setSelected(null)} /> */}

      <VideoModal spot={selected} onClose={() => setSelected(null)} />

    </main>
  )
}
