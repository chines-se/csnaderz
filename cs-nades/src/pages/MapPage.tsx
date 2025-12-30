/**
 * Map detail page with interactive markers, drawing tools, and modals.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import KonvaMap from "../components/KonvaMap"
import VideoModal from "../components/VideoModal"
import type { NadeType, NadeSpot } from "../data/types"
import { useMapData } from "../hooks/useMapData"
import AdminAuth from "../components/AdminAuth"
import CreateNadeModal from "../components/CreateNadeModal"

type Mode = "browse" | "place" | "edit" | "draw"

/**
 * Combine class names, ignoring falsy values.
 */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

/**
 * A small segmented-button used in the top toolbar.
 * This keeps the "active" mode visually obvious.
 */
function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "px-3 py-2 text-sm font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        active
          ? "bg-white text-zinc-900"
          : "bg-transparent text-zinc-200 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Render the map page with tools, data loading, and modals.
 */
export default function MapPage() {
  type Pending = { x: number; y: number; type: NadeType } | null

  // Read the map name from the route: /maps/:map
  const params = useParams()
  const map = (params.map ?? "").toLowerCase()

  // When user clicks in "place" mode, we store the pending click here and open the modal.
  const [pending, setPending] = useState<Pending>(null)

  if (!params.map) return <main className="p-8">No map provided.</main>

  // Your Supabase-backed data hook
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

  // Which spot is selected (for the VideoModal)
  const [selected, setSelected] = useState<NadeSpot | null>(null)

  // UI state
  const [mode, setMode] = useState<Mode>("browse")
  const [placementType, setPlacementType] = useState<NadeType>("smoke")
  const [snap, setSnap] = useState(true)

  // If you later add filtering, mapSpots is where you'd derive it
  const mapSpots = useMemo(() => spots, [spots])

  /**
   * RESPONSIVE STAGE SIZING
   *
   * We measure the available width inside the "map area" and set the Konva stage
   * width/height accordingly, clamped between MIN and MAX.
   *
   * This is better than CSS `transform: scale()` because:
   * - Konva pointer coordinates stay correct
   * - you don't get weird event scaling issues
   */
  const mapAreaRef = useRef<HTMLDivElement | null>(null)
  // Stage size bounds keep the map readable on small and large screens.
  const MAX_STAGE = 900
  const MIN_STAGE = 320
  const [stageSize, setStageSize] = useState<number>(MAX_STAGE)

  useEffect(() => {
    const el = mapAreaRef.current
    if (!el) return

    // ResizeObserver fires whenever this element's size changes
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? MAX_STAGE

      // Leave a little room so the stage doesn't touch the card edges.
      // (This accounts for padding/border in our layout.)
      const usable = Math.floor(width)

      // Clamp stage size between MIN and MAX
      const next = Math.max(MIN_STAGE, Math.min(MAX_STAGE, usable))

      setStageSize(next)
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar: sticky so it feels like an app toolbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          {/* Left side: map name + status chips */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                Map
              </div>
              <div className="text-base font-semibold capitalize">{map}</div>
            </div>

            <div className="hidden sm:block h-10 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <AdminAuth />

              {/* Spot count / loading chip */}
              {loading ? (
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                  Loading…
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                  {spots.length} nades
                </span>
              )}

              {/* Pending placement chip */}
              {pending ? (
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                  Pending placement
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex-1" />

          {/* Right side: mode segmented control */}
          <div className="inline-flex overflow-hidden rounded-xl border border-white/10 bg-zinc-900 p-1">
            <ModeButton active={mode === "browse"} onClick={() => setMode("browse")}>
              Browse
            </ModeButton>
            <ModeButton active={mode === "place"} onClick={() => setMode("place")}>
              Place
            </ModeButton>
            <ModeButton active={mode === "edit"} onClick={() => setMode("edit")}>
              Edit
            </ModeButton>
            <ModeButton active={mode === "draw"} onClick={() => setMode("draw")}>
              Draw
            </ModeButton>
          </div>
        </div>
      </header>

      {/* Main content area:
          - On large screens: 2 columns (left controls + right map)
          - On small screens: stacks into 1 column
      */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[320px_1fr]">
        {/* Left panel: controls */}
        <aside className="rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)]">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-100">Controls</div>
            <div className="mt-1 text-sm text-zinc-400">
              Choose a mode and manage placements/drawings.
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* Error state */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-950 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Place controls */}
            <div className={cx("space-y-2", mode !== "place" && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Placement type</div>
                {mode === "place" && (
                  <span className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                    active
                  </span>
                )}
              </div>

              <select
                className={cx(
                  "w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  mode !== "place" && "pointer-events-none"
                )}
                value={placementType}
                onChange={(e) => setPlacementType(e.target.value as NadeType)}
              >
                <option value="smoke">Smoke</option>
                <option value="flash">Flash</option>
                <option value="molotov">Molotov</option>
                <option value="he">HE</option>
              </select>

              <div className="text-xs text-zinc-500">
                In <span className="text-zinc-300">Place</span> mode, click the map to add a marker.
              </div>
            </div>

            {/* Edit controls */}
            <div className={cx("space-y-2", mode !== "edit" && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Edit options</div>
                {mode === "edit" && (
                  <span className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                    active
                  </span>
                )}
              </div>

              <label
                className={cx(
                  "flex items-center gap-2 text-sm text-zinc-300",
                  mode !== "edit" && "pointer-events-none"
                )}
              >
                <input
                  type="checkbox"
                  checked={snap}
                  onChange={(e) => setSnap(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-white"
                />
                Snap to grid
                <span className="ml-auto rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                  {snap ? "on" : "off"}
                </span>
              </label>

              <div className="text-xs text-zinc-500">
                Drag markers in <span className="text-zinc-300">Edit</span> mode.
              </div>
            </div>

            {/* Draw controls */}
            <div className={cx("space-y-3", mode !== "draw" && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Drawings</div>
                {mode === "draw" && (
                  <span className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                    active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={cx(
                    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800",
                    "transition active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                    mode !== "draw" && "pointer-events-none"
                  )}
                  onClick={() => setStrokes(strokes.slice(0, -1))}
                >
                  Undo
                </button>

                <button
                  type="button"
                  className={cx(
                    "rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800",
                    "transition active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                    mode !== "draw" && "pointer-events-none"
                  )}
                  onClick={() => setStrokes([])}
                >
                  Clear
                </button>

                <button
                  type="button"
                  className={cx(
                    "rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100",
                    "transition active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                    mode !== "draw" && "pointer-events-none"
                  )}
                  onClick={async () => {
                    await saveDrawings(strokes)
                  }}
                >
                  Save
                </button>
              </div>

              <div className="text-xs text-zinc-500">
                Stroke count: <span className="text-zinc-300">{strokes.length}</span>
              </div>
            </div>

            {/* Tips card */}
            <div className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
              <div className="font-medium text-zinc-200">Tips</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
                <li>Browse mode: click a marker to watch the lineup.</li>
                <li>Place mode: click to open the create form.</li>
                <li>Edit mode: drag to reposition (snap optional).</li>
                <li>Draw mode: sketch routes and save them.</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Right panel: map */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Tactical map</div>
              <div className="text-sm text-zinc-400">
                Mode: <span className="text-zinc-200">{mode}</span>
                <span className="mx-2 text-white/10">•</span>
                Grid: <span className="text-zinc-200">{snap ? "on" : "off"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                {placementType}
              </span>
              <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                Stage: {stageSize}×{stageSize}
              </span>
            </div>
          </div>

          <div className="p-5">
            {/* Modal for creating nades */}
            <CreateNadeModal
              open={!!pending}
              map={map}
              type={(pending?.type ?? "smoke") as NadeType}
              x={pending?.x ?? 0}
              y={pending?.y ?? 0}
              onClose={() => setPending(null)}
              onCreated={async ({ title, videoPath, x, y, type }) => {
                // Save spot to DB
                await addSpot({
                  map,
                  type,
                  title,
                  videoPath,
                  x,
                  y,
                })
                setPending(null)
              }}
            />

            {/* This ref measures available width for responsive sizing */}
            <div ref={mapAreaRef} className="w-full">
              {/* Centered map "frame" */}
              <div className="mx-auto w-fit rounded-2xl border border-white/10 bg-zinc-900 p-3">
                <KonvaMap
                  mapImageUrl={`/maps/${map}.png`}
                  // Responsive stage size (scales down on smaller screens)
                  width={stageSize}
                  height={stageSize}
                  // Keep nativeSize constant so stored coords remain consistent.
                  nativeSize={1200}
                  spots={mapSpots}
                  mode={mode}
                  placementType={placementType}
                  snapToGrid={snap}
                  // Grid size in native map units for snapping markers.
                  gridSize={20}
                  strokes={strokes}
                  setStrokes={setStrokes}
                  onSelectSpot={(s) => {
                    if (mode === "browse") setSelected(s)
                  }}
                  onPlaceSpot={({ x, y, type }) => {
                    // In Place mode, clicking opens your Create modal
                    console.log("place click received:", { x, y, type })
                    setPending({ x, y, type })
                  }}
                  onMoveSpot={async (id, x, y) => {
                    await updateSpot(id, { x, y })
                  }}
                  onDeleteSpot={async (id) => {
                    await deleteSpot(id)
                  }}
                />
              </div>
            </div>

            {/* Footer helper */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
              <div>
                Click markers to view videos in Browse mode. Use Place to add new lineups.
              </div>
              <div className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                Pending: <span className="text-zinc-200">{pending ? "yes" : "no"}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Video playback modal */}
      <VideoModal spot={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
