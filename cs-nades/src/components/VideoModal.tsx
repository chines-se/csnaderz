import { useMemo } from "react"
import type { NadeSpot } from "../data/spots"
import { getPublicVideoUrl } from "../lib/storage"

export default function VideoModal({
  spot,
  onClose,
}: {
  spot: NadeSpot | null
  onClose: () => void
}) {
  const videoUrl = useMemo(
    () => (spot ? getPublicVideoUrl(spot.videoPath) : ""),
    [spot]
  )

  if (!spot) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0b0b0b",
          border: "1px solid #333",
          borderRadius: 12,
          color: "white",
          width: "min(900px, 96vw)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase" }}>{spot.type}</div>
            <div style={{ fontWeight: 700 }}>{spot.title}</div>
          </div>
          <button
            style={{
              background: "#222",
              border: "1px solid #444",
              borderRadius: 8,
              padding: "6px 10px",
              color: "white",
              cursor: "pointer",
              height: "fit-content",
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Debug: show url */}
        <div style={{ padding: "0 14px 10px", fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
          {videoUrl ? `URL: ${videoUrl}` : "No video URL (check Supabase env/bucket/path)."}
        </div>

        {videoUrl && (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            style={{ width: "100%", height: 480, background: "black", objectFit: "contain" }}
            onError={() => console.error("Video failed to load:", videoUrl)}
          />
        )}
      </div>
    </div>
  )
}
