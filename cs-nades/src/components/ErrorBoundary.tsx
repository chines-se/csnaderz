import React from "react"

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

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
