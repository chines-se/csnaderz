/**
 * Error boundary for MapPage and related routes.
 */
import React from "react"

/**
 * Catches rendering errors and displays a fallback UI.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  /**
   * Update state so the next render shows the fallback UI.
   */
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  /**
   * Render children or a crash summary if an error occurred.
   */
  render() {
    if (this.state.hasError) {
      return (
        <main className="p-8">
          <div className="text-xl font-bold mb-2">Map page crashed</div>
          <pre className="bg-zinc-900 border border-zinc-800 rounded p-4 overflow-auto">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
        </main>
      )
    }
    return this.props.children
  }
}
