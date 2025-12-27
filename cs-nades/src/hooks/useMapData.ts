import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import type { NadeSpot, Stroke, NadeType } from "../data/types"

export function useMapData(map: string) {
  const [spots, setSpots] = useState<NadeSpot[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const isReady = useMemo(() => !!supabase && !!map, [map])

  useEffect(() => {
    let alive = true
    async function run() {
      if (!isReady) return
      setLoading(true)
      setError("")

      const { data: spotRows, error: spotErr } = await supabase!
        .from("nade_spots")
        .select("id,map,type,title,video_path,x,y")
        .eq("map", map)

      if (!alive) return
      if (spotErr) {
        setError(spotErr.message)
        setLoading(false)
        return
      }

      setSpots(
        (spotRows ?? []).map((r: any) => ({
          id: r.id,
          map: r.map,
          type: r.type,
          title: r.title,
          videoPath: r.video_path,
          x: r.x,
          y: r.y,
        }))
      )

      const { data: drawingRow, error: drawErr } = await supabase!
        .from("map_drawings")
        .select("strokes")
        .eq("map", map)
        .maybeSingle()

      if (!alive) return
      if (drawErr) {
        setError(drawErr.message)
        setLoading(false)
        return
      }

      setStrokes((drawingRow?.strokes as Stroke[]) ?? [])
      setLoading(false)
    }

    run()
    return () => {
      alive = false
    }
  }, [isReady, map])

  async function addSpot(payload: {
    map: string
    type: NadeType
    title: string
    videoPath: string
    x: number
    y: number
  }) {
    if (!supabase) return
    const { data, error } = await supabase
      .from("nade_spots")
      .insert({
        map: payload.map,
        type: payload.type,
        title: payload.title,
        video_path: payload.videoPath,
        x: payload.x,
        y: payload.y,
      })
      .select("id,map,type,title,video_path,x,y")
      .single()

    if (error) throw error

    const spot: NadeSpot = {
      id: data.id,
      map: data.map,
      type: data.type,
      title: data.title,
      videoPath: data.video_path,
      x: data.x,
      y: data.y,
    }
    setSpots((prev) => [...prev, spot])
    return spot
  }

  async function updateSpot(id: string, patch: Partial<Omit<NadeSpot, "id">>) {
    if (!supabase) return
    const dbPatch: any = {}
    if (patch.map !== undefined) dbPatch.map = patch.map
    if (patch.type !== undefined) dbPatch.type = patch.type
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.videoPath !== undefined) dbPatch.video_path = patch.videoPath
    if (patch.x !== undefined) dbPatch.x = patch.x
    if (patch.y !== undefined) dbPatch.y = patch.y

    const { error } = await supabase.from("nade_spots").update(dbPatch).eq("id", id)
    if (error) throw error

    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } as NadeSpot : s)))
  }

  async function deleteSpot(id: string) {
    if (!supabase) return
    const { error } = await supabase.from("nade_spots").delete().eq("id", id)
    if (error) throw error
    setSpots((prev) => prev.filter((s) => s.id !== id))
  }

  async function saveDrawings(nextStrokes: Stroke[]) {
    if (!supabase) return
    // upsert by map
    const { error } = await supabase
      .from("map_drawings")
      .upsert({ map, strokes: nextStrokes }, { onConflict: "map" })

    if (error) throw error
    setStrokes(nextStrokes)
  }

  return {
    loading,
    error,
    spots,
    strokes,
    setStrokes, // local edits (draw)
    addSpot,
    updateSpot,
    deleteSpot,
    saveDrawings,
  }
}
