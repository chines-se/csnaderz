/**
 * Konva-based map viewport with marker placement, editing, and drawing support.
 */
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Rect,
  Text,
  Group,
  Label,
  Tag,
  RegularPolygon,
  Line,
} from "react-konva"
import type Konva from "konva"
import type { NadeSpot, Stroke, NadeType } from "../data/types"
import useDrawing from "./useDrawing"

/**
 * Load an image element and expose both the element and error state.
 */
function useImage(url: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    setError(null)

    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.src = url
    image.onload = () => setImg(image)
    image.onerror = () => {
      setImg(null)
      setError(`Failed to load: ${url}`)
    }
  }, [url])

  return { img, error }
}

type Mode = "browse" | "place" | "edit" | "draw"

type TooltipState =
  | { visible: true; x: number; y: number; title: string; type: NadeType }
  | { visible: false }

/**
 * Clamp a number into an inclusive range.
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Convert a nade type into a short uppercase label for UI rendering.
 */
function typeLabel(t: NadeType) {
  switch (t) {
    case "smoke":
      return "SMOKE"
    case "flash":
      return "FLASH"
    case "molotov":
      return "MOLOTOV"
    case "he":
      return "HE"
  }
}

/**
 * Snap a numeric value to the nearest grid intersection.
 */
function snapValue(v: number, grid: number) {
  return Math.round(v / grid) * grid
}

/**
 * Choose a marker shape based on the nade type.
 */
function MarkerShape({ type, size }: { type: NadeType; size: number }) {
  if (type === "smoke") return <Circle radius={size} fill="white" stroke="black" strokeWidth={2} />
  if (type === "flash")
    return (
      <RegularPolygon
        sides={4}
        radius={size}
        rotation={45}
        fill="white"
        stroke="black"
        strokeWidth={2}
      />
    )
  if (type === "molotov")
    return (
      <RegularPolygon
        sides={3}
        radius={size + 1}
        rotation={-90}
        fill="white"
        stroke="black"
        strokeWidth={2}
      />
    )
  return (
    <Rect
      x={-size}
      y={-size}
      width={size * 2}
      height={size * 2}
      fill="white"
      stroke="black"
      strokeWidth={2}
      cornerRadius={3}
    />
  )
}

/**
 * Render an interactive map with markers and drawing overlays.
 *
 * Inputs:
 * - mapImageUrl: URL to the map image asset
 * - width/height: stage size in pixels
 * - nativeSize: map coordinate space size (used for normalization)
 * - spots: marker list to render
 * - callbacks: selection, placement, movement, and deletion handlers
 */
export default function KonvaMap({
  mapImageUrl,
  width,
  height,
  nativeSize = 1200,
  spots,
  mode,
  placementType,
  snapToGrid = true,
  gridSize = 20,
  strokes,
  setStrokes,
  onSelectSpot,
  onPlaceSpot,
  onMoveSpot,
  onDeleteSpot,
  minZoom = 1,
  maxZoom = 4,
}: {
  mapImageUrl: string
  width: number
  height: number
  nativeSize?: number

  spots: NadeSpot[]
  mode: Mode
  placementType: NadeType

  snapToGrid?: boolean
  gridSize?: number

  strokes: Stroke[]
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>

  onSelectSpot: (spot: NadeSpot) => void
  onPlaceSpot: (payload: { x: number; y: number; type: NadeType }) => void
  onMoveSpot: (id: string, x: number, y: number) => void
  onDeleteSpot: (id: string) => void

  minZoom?: number
  maxZoom?: number
}) {
  const { img, error } = useImage(mapImageUrl)
  const stageRef = useRef<Konva.Stage | null>(null)

  // baseScale makes nativeSize fit width at zoomFactor=1.
  const baseScale = useMemo(() => width / nativeSize, [width, nativeSize])
  const [zoomFactor, setZoomFactor] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const stageScale = baseScale * zoomFactor

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false })

  /**
   * Clamp the stage position so the map never drifts out of view.
   */
  const clampStagePos = (pos: { x: number; y: number }, scale: number) => {
    const mapPx = nativeSize * scale

    const minX = mapPx >= width ? width - mapPx : (width - mapPx) / 2
    const maxX = mapPx >= width ? 0 : (width - mapPx) / 2
    const minY = mapPx >= height ? height - mapPx : (height - mapPx) / 2
    const maxY = mapPx >= height ? 0 : (height - mapPx) / 2

    return { x: clamp(pos.x, minX, maxX), y: clamp(pos.y, minY, maxY) }
  }

  // Center the map initially
  useEffect(() => {
    setStagePos(clampStagePos({ x: 0, y: 0 }, baseScale))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseScale, nativeSize, width, height])

  const setCursor = (cursor: string) => {
    const stage = stageRef.current
    if (!stage) return
    stage.container().style.cursor = cursor
  }

  /**
   * Convert stage coordinates into map-native coordinates.
   */
  const toNative = (pointer: { x: number; y: number }) => {
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    }
  }

  const { liveStroke, handlePointerDown, handlePointerMove, handlePointerUp } = useDrawing({
    mode,
    nativeSize,
    toNative,
    strokes,
    setStrokes,
  })

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = stageScale
    // Subtle zoom step keeps wheel zoom from feeling too aggressive.
    const scaleBy = 1.08
    // Trackpad scroll down should zoom out (deltaY > 0).
    const direction = e.evt.deltaY > 0 ? -1 : 1

    const nextZoom = clamp(direction > 0 ? zoomFactor * scaleBy : zoomFactor / scaleBy, minZoom, maxZoom)
    const newScale = baseScale * nextZoom

    // Calculate the point under the cursor in map space so we can zoom around it.
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    setZoomFactor(nextZoom)
    setStagePos(clampStagePos(newPos, newScale))
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.position()
    // Clamp the stage to avoid blank margins when dragging.
    const clamped = clampStagePos(pos, stageScale)
    stage.position(clamped)
    setStagePos(clamped)
  }

  // Stage pointer handler: place or draw
  const handlePointerDownEvent = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // When drawing, start a stroke anywhere on map background
    if (mode === "draw") {
      handlePointerDown(stage)
      return
    }

    // When placing, only place if clicked background/map (not a marker)
    if (mode === "place") {
      const target = e.target
      const n = (target as any).name?.() as string | undefined
      const isBackground = n
      if (!isBackground) return

      const p = toNative(pointer)
      // Ignore clicks outside of the image bounds.
      if (p.x < 0 || p.y < 0 || p.x > nativeSize || p.y > nativeSize) return
      onPlaceSpot({ x: p.x, y: p.y, type: placementType })
    }
  }

  const handlePointerMoveEvent = () => {
    handlePointerMove(stageRef.current)
  }

  const handlePointerUpEvent = () => {
    handlePointerUp()
  }

  const resetView = () => {
    setZoomFactor(1)
    setStagePos(clampStagePos({ x: 0, y: 0 }, baseScale))
  }

  return (
    <div className="inline-block border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="text-sm text-zinc-300">
          Mode: {mode.toUpperCase()} • Zoom: {zoomFactor.toFixed(2)}x
          {mode === "place" ? ` • Place: ${typeLabel(placementType)}` : ""}
          {mode === "edit" ? (snapToGrid ? ` • Snap: ${gridSize}` : " • Snap: off") : ""}
        </div>
        <button className="text-sm px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700" onClick={resetView} type="button">
          Reset view
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={mode === "browse" || mode === "edit"}
        onDragMove={handleDragMove}
        onWheel={handleWheel}
        onMouseEnter={() => setCursor(mode === "place" ? "crosshair" : mode === "draw" ? "crosshair" : "grab")}
        onMouseLeave={() => setCursor("default")}
        onMouseDown={handlePointerDownEvent}
        onMouseMove={handlePointerMoveEvent}
        onMouseUp={handlePointerUpEvent}
        onTouchStart={handlePointerDownEvent}
        onTouchMove={handlePointerMoveEvent}
        onTouchEnd={handlePointerUpEvent}
      >
        <Layer>
          {/* Background in native coords */}
          <Rect name="bg" x={0} y={0} width={nativeSize} height={nativeSize} fill="#111" />

          {(!img || error) && (
            <Text text={error ? error : `Loading image...\n${mapImageUrl}`} x={16} y={16} fontSize={18} fill="white" listening={false} />
          )}

          <KonvaImage name="map" image={img ?? undefined} x={0} y={0} width={nativeSize} height={nativeSize} />

          {/* Drawings layer */}
          {[...strokes, ...(liveStroke ? [liveStroke] : [])].map((s) => (
            <Line
              key={s.id}
              points={s.points}
              stroke="white"
              strokeWidth={s.width}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              listening={false}
              opacity={0.9}
            />
          ))}

          {/* Markers */}
          {spots.map((spot) => {
            // Marker size in native map units.
            const size = 12

            return (
              <Group
                key={spot.id}
                x={spot.x}
                y={spot.y}
                draggable={mode === "edit"}
                onDragStart={(e) => {
                  e.cancelBubble = true
                  setCursor("grabbing")
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true
                  setCursor("grab")

                  let nx = e.target.x()
                  let ny = e.target.y()

                  if (mode === "edit" && snapToGrid) {
                    nx = snapValue(nx, gridSize)
                    ny = snapValue(ny, gridSize)
                    e.target.position({ x: nx, y: ny })
                  }

                  onMoveSpot(spot.id, nx, ny)
                }}
                onMouseEnter={() => {
                  setCursor(mode === "edit" ? "grab" : "pointer")
                  setTooltip({ visible: true, x: spot.x + 18, y: spot.y - 18, title: spot.title, type: spot.type })
                }}
                onMouseLeave={() => {
                  setCursor(mode === "place" || mode === "draw" ? "crosshair" : "grab")
                  setTooltip({ visible: false })
                }}
                onClick={(e) => {
                  e.cancelBubble = true
                  if (mode === "browse") onSelectSpot(spot)
                }}
                onTap={(e) => {
                  e.cancelBubble = true
                  if (mode === "browse") onSelectSpot(spot)
                }}
                onContextMenu={(e) => {
                  if (mode !== "edit") return
                  e.evt.preventDefault()
                  e.cancelBubble = true
                  onDeleteSpot(spot.id)
                }}
              >
                <MarkerShape type={spot.type} size={size} />
                <Text
                  text={typeLabel(spot.type)[0]}
                  fontSize={12}
                  fontStyle="bold"
                  fill="black"
                  width={30}
                  align="center"
                  offsetX={15}
                  offsetY={6}
                  listening={false}
                />
              </Group>
            )
          })}

          {/* Tooltip */}
          {tooltip.visible && (
            <Label x={tooltip.x} y={tooltip.y} listening={false}>
              <Tag fill="black" opacity={0.85} cornerRadius={6} />
              <Text text={`${typeLabel(tooltip.type)} • ${tooltip.title}`} fill="white" fontSize={14} padding={8} />
            </Label>
          )}
        </Layer>
      </Stage>

      <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-400">
        {mode === "browse" && "Wheel: zoom • Drag: pan • Click marker: open video"}
        {mode === "place" && "Click map: place marker (fills placeholder title/videoPath)."}
        {mode === "edit" && "Drag marker: move • Right-click marker: delete • Wheel/drag still works."}
        {mode === "draw" && "Draw freehand on map. Use Undo/Clear/Save in toolbar above."}
      </div>
    </div>
  )
}
