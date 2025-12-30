/**
 * Top-level navigation bar for the app.
 */
import { Link } from "react-router-dom"

/**
 * Render the app navigation header.
 */
export default function Navbar() {
  return (
    <nav className="px-6 py-4 bg-zinc-900 border-b border-zinc-800">
      <Link to="/" className="text-xl font-bold">
        csnader
      </Link>
    </nav>
  )
}
