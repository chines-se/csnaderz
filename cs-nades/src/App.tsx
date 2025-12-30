/**
 * Root app shell with routing, lazy loading, and error boundaries.
 */
import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import { ErrorBoundary } from "./components/ErrorBoundary"

// Lazy-load the map page to keep initial bundle size small.
const MapPage = lazy(() => import("./pages/MapPage"))

/**
 * Render the top-level route layout.
 */
export default function App() {
  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <Suspense fallback={<main className="p-8">Loading…</main>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/maps/:map" element={<MapPage />} />
            <Route path="*" element={<main className="p-8">Route not found</main>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
