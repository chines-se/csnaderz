import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import { ErrorBoundary } from "./components/ErrorBoundary"

const MapPage = lazy(() => import("./pages/MapPage"))

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
