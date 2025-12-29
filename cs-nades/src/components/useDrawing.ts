import { useRef, useState } from "react"
import type Konva from "konva"
import type { Stroke } from "../data/types"

type Pointer = { x: number; y: number }

type UseDrawingOptions = {
  mode: "browse" | "place" | "edit" | "draw"
  nativeSize: number
  toNative: (pointer: Pointer) => Pointer
  strokes: Stroke[]
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>
  minPointDistance?: number
  smoothingWindow?: number
}

export default function useDrawing({
  mode,
  nativeSize,
  toNative,
  strokes,
  setStrokes,
  minPointDistance = 2,
  smoothingWindow = 3,
}: UseDrawingOptions) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null)
  const currentStrokeRef = useRef<{ stroke: Stroke; rawPoints: number[] } | null>(null)

  const startStroke = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const p = toNative(pointer)
    if (p.x < 0 || p.y < 0 || p.x > nativeSize || p.y > nativeSize) return

    setIsDrawing(true)
    const id = crypto.randomUUID()
    const next: Stroke = { id, tool: "pen", width: 4, points: [p.x, p.y] }
    currentStrokeRef.current = { stroke: next, rawPoints: [p.x, p.y] }
    setLiveStroke(next)
  }

  const appendPoint = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const p = toNative(pointer)
    if (p.x < 0 || p.y < 0 || p.x > nativeSize || p.y > nativeSize) return

    const current = currentStrokeRef.current
    if (!current) return

    const { rawPoints, stroke } = current
    const lastX = rawPoints[rawPoints.length - 2]
    const lastY = rawPoints[rawPoints.length - 1]
    const dx = p.x - lastX
    const dy = p.y - lastY
    if (Math.hypot(dx, dy) < minPointDistance) return

    const nextRaw = [...rawPoints, p.x, p.y]
    const windowCount = Math.min(smoothingWindow, nextRaw.length / 2)
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < windowCount; i += 1) {
      const idx = nextRaw.length - 2 - i * 2
      sumX += nextRaw[idx]
      sumY += nextRaw[idx + 1]
    }
    const smoothX = sumX / windowCount
    const smoothY = sumY / windowCount

    const nextStroke = { ...stroke, points: [...stroke.points, smoothX, smoothY] }
    currentStrokeRef.current = { stroke: nextStroke, rawPoints: nextRaw }
    setLiveStroke(nextStroke)
  }

  const finishStroke = () => {
    setIsDrawing(false)
    const current = currentStrokeRef.current
    if (current) {
      setStrokes((prev) => [...prev, current.stroke])
    }
    currentStrokeRef.current = null
    setLiveStroke(null)
  }

  const handlePointerDown = (stage: Konva.Stage | null) => {
    if (mode !== "draw" || !stage) return
    startStroke(stage)
  }

  const handlePointerMove = (stage: Konva.Stage | null) => {
    if (mode !== "draw" || !stage || !isDrawing) return
    appendPoint(stage)
  }

  const handlePointerUp = () => {
    if (mode !== "draw") return
    finishStroke()
  }

  return {
    liveStroke,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
