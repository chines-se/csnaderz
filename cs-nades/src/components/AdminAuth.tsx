import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function AdminAuth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn() {
    setErr("")
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr(error.message)
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <div className="flex items-center gap-2">
      {userEmail ? (
        <>
          <span className="text-sm text-zinc-300">Admin: {userEmail}</span>
          <button className="px-3 py-1 rounded bg-zinc-800" onClick={signOut}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <input
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-sm"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-sm"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="px-3 py-1 rounded bg-zinc-800" onClick={signIn}>
            Sign in
          </button>
          {err && <span className="text-sm text-red-400">{err}</span>}
        </>
      )}
    </div>
  )
}
