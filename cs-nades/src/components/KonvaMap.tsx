import React, { useMemo, useState, useEffect } from "react"
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Text } from "react-konva"
import type { NadeSpot } from "../data/spots"

function useImage(url: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  

  React.useEffect(() => {
    if (!url) return

    setError(null)
    const image = new window.Image()
    image.crossOrigin = "anonymous" // helpful later if you host maps on a CDN/Supabase
    image.src = url
    image.onload = () => setImg(image)
    image.onerror = () => {
      setImg(null)
      setError(`Failed to load: ${url}`)
    }
  }, [url])

  return { img, error }
}

export default function KonvaMap({
  mapImageUrl,
  width,
  height,
  spots,
  onSelectSpot,
}: {
  mapImageUrl: string
  width: number
  height: number
  spots: NadeSpot[]
  onSelectSpot: (spot: NadeSpot) => void
}) {
  const { img, error } = useImage(mapImageUrl)

  // match this to whatever coordinate system you used when placing spots
  const nativeSize = 1200
  const scale = useMemo(() => width / nativeSize, [width])

  return (
    <div className="inline-block border border-zinc-800 rounded-xl overflow-hidden">
      <Stage width={width} height={height}>
        <Layer>
          <Rect x={0} y={0} width={width} height={height} fill="#111" />

          {(!img || error) && (
            <Text
              text={error ? error : `Loading image...\n${mapImageUrl}`}
              x={16}
              y={16}
              fontSize={16}
              fill="white"
            />
          )}

          <KonvaImage image={img ?? undefined} x={0} y={0} width={width} height={height} />

          {spots.map((s) => (
            <Circle
              key={s.id}
              x={s.x * scale}
              y={s.y * scale}
              radius={10}
              fill="white"
              stroke="black"
              strokeWidth={2}
              onClick={() => {
                console.log("Spot clicked:", s)
                onSelectSpot(s)
                }}
              onTap={() => {
                console.log("Spot tapped:", s)
                onSelectSpot(s)
                }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
