import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from "../supabase"; 

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setAllowed(!!user)
    }
    check()
  }, [])

  if (allowed === null) return null
  if (!allowed) return <Navigate to="/login" />

  return children
}