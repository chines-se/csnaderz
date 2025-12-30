/**
 * Modal for creating a new nade spot with video upload and metadata.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { NadeType } from "../data/types"
import { supabase } from "../lib/supabase"

// Storage bucket holding lineup videos.
const BUCKET = "nade-videos"

// Focusable selector for focus trap.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Render a modal workflow for creating and uploading a nade video.
 */
export default function CreateNadeModal({
  open,
  map,
  type,
  x,
  y,
  onClose,
  onCreated,
}: {
  open: boolean
  map: string
  type: NadeType
  x: number
  y: number
  onClose: () => void
  onCreated: (created: {
    title: string
    videoPath: string
    x: number
    y: number
    type: NadeType
  }) => Promise<void> | void
}) {
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  // ---- animation mount/unmount (so exit animation plays) ----
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const closeTimer = useRef<number | null>(null)

  // ---- refs for focus management ----
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const restoreFocusTimer = useRef<number | null>(null)

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !!file && !saving,
    [title, file, saving]
  )

  // Mount logic + visible state for animate-in/out
  useEffect(() => {
    if (open) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      // Align the unmount with the exit animation duration.
      closeTimer.current = window.setTimeout(() => {
        setMounted(false)
      }, 220) // match duration below
    }

    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [open])

  // Body scroll lock (no background scroll + no layout jump)
  useEffect(() => {
    if (!open) return

    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight

    // Prevent layout shift when the scrollbar disappears.
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [open])

  // Focus trap + Escape to close + restore focus on close
  useEffect(() => {
    if (!open) return

    // save last focused element
    lastFocusedRef.current = document.activeElement as HTMLElement | null

    // focus first good target (prefer the name input)
    const focusInitial = () => {
      const panel = panelRef.current
      if (!panel) return

      const preferred =
        panel.querySelector<HTMLInputElement>('input[placeholder="e.g. Window Smoke"]') ??
        panel.querySelector<HTMLInputElement>("input:not([disabled])")

      if (preferred) preferred.focus()
      else {
        const first = panel.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      }
    }
    // wait a tick so element exists
    requestAnimationFrame(focusInitial)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!saving) onClose()
        return
      }

      if (e.key !== "Tab") return

      const panel = panelRef.current
      if (!panel) return

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
      )

      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (!e.shiftKey) {
        // Tab forward
        if (active === last || !panel.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      } else {
        // Shift+Tab backward
        if (active === first || !panel.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)

      // restore focus AFTER the exit animation finishes (so focus doesn't jump behind the fading modal)
      if (restoreFocusTimer.current) window.clearTimeout(restoreFocusTimer.current)
      restoreFocusTimer.current = window.setTimeout(() => {
        lastFocusedRef.current?.focus?.()
      }, 220)
    }
  }, [open, onClose, saving])

  if (!mounted) return null

  /**
   * Upload the video file and call the creation callback with payload data.
   */
  async function handleSubmit() {
    setErr("")
    if (!supabase) {
      setErr("Supabase is not initialized (check env vars).")
      return
    }
    if (!file) {
      setErr("Please choose an MP4 file.")
      return
    }
    if (!(file.type || "").includes("mp4")) {
      setErr("Please upload an MP4 file.")
      return
    }

    try {
      setSaving(true)

      // Encode the file name to avoid spaces in storage paths.
      const safeName = file.name.replace(/\s+/g, "-")
      const path = `${map}/${type}/${Date.now()}-${safeName}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "video/mp4",
        upsert: false,
      })

      if (upErr) throw upErr

      await onCreated({
        title: title.trim(),
        videoPath: path,
        x,
        y,
        type,
      })

      setTitle("")
      setFile(null)
      onClose()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  const positionText = `x=${Math.round(x)} y=${Math.round(y)}`

  return (
    <div
      className="fixed inset-0 z-[999999] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-nade-title"
      aria-describedby="create-nade-desc"
      onMouseDown={(e) => {
        if (saving) return
        // Allow clicking the overlay to close the modal.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-black/80 backdrop-blur-md",
          visible
            ? "animate-in fade-in duration-200"
            : "animate-out fade-out duration-200",
        ].join(" ")}
      />

      <div className="relative flex min-h-full items-center justify-center p-4">
        {/* Panel */}
        <div
          ref={panelRef}
          className={[
            "w-full max-w-xl overflow-hidden rounded-2xl",
            "border border-white/10 bg-zinc-950",
            "shadow-[0_24px_90px_-30px_rgba(0,0,0,0.95)]",
            // feels “springy” without JS: slightly longer, ease-out, combined transforms
            visible
              ? "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-out"
              : "animate-out fade-out zoom-out-95 slide-out-to-bottom-2 duration-220 ease-in",
          ].join(" ")}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* subtle top sheen */}
          <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Header (sticky so it feels app-like when body scrolls) */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-zinc-950/95 px-6 py-5 backdrop-blur">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Create lineup
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 id="create-nade-title" className="text-lg font-semibold text-zinc-100">
                  {map}
                </h2>
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200">
                  {type}
                </span>
              </div>

              <p id="create-nade-desc" className="mt-1 text-sm text-zinc-400">
                Drop a name + attach an MP4.{" "}
                <span className="text-zinc-500">Position: {positionText}</span>
              </p>
            </div>

            <button
              className={[
                "shrink-0 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2",
                "text-sm font-medium text-zinc-200 hover:bg-zinc-800",
                "transition active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
              onClick={onClose}
              type="button"
              disabled={saving}
            >
              Close
            </button>
          </div>

          {/* Body (scrollable if needed) */}
          <div className="max-h-[75vh] space-y-5 overflow-auto px-6 py-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Name</label>
              <input
                className={[
                  "w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5",
                  "text-zinc-100 placeholder:text-zinc-500",
                  "transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  "disabled:opacity-60",
                ].join(" ")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Window Smoke"
                autoFocus
                disabled={saving}
              />
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">MP4 video</label>

              <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-white disabled:opacity-60"
                    disabled={saving}
                  />

                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      disabled={saving}
                      className={[
                        "rounded-lg border border-white/10 bg-zinc-950 px-3 py-2",
                        "text-sm font-medium text-zinc-200 hover:bg-zinc-800",
                        "transition active:scale-[0.98]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                      ].join(" ")}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-3 text-xs text-zinc-400">
                  Tip: keep clips short + compressed for instant playback.
                </div>

                {file && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2">
                    <div className="truncate text-sm text-zinc-200">{file.name}</div>
                    <div className="text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                )}
              </div>
            </div>

            {err && (
              <div className="rounded-xl border border-red-500/20 bg-red-950 px-4 py-3 text-sm text-red-200">
                {err}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className={[
                  "rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5",
                  "font-medium text-zinc-200 hover:bg-zinc-800",
                  "transition active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
                onClick={onClose}
                type="button"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className={[
                  "rounded-xl bg-white px-5 py-2.5 font-semibold text-zinc-900 hover:bg-zinc-100",
                  "transition active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  "disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500",
                ].join(" ")}
                disabled={!canSubmit}
                onClick={handleSubmit}
                type="button"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                    Uploading &amp; saving…
                  </span>
                ) : (
                  "Create nade"
                )}
              </button>
            </div>
          </div>

          {/* Bottom micro-accent */}
          <div className="h-1 w-full bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
        </div>
      </div>
    </div>
  )
}
