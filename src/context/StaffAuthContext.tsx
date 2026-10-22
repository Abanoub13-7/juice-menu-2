import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getStaffRole, type StaffRole } from '../lib/baristaAuth'

interface StaffAuthState {
  session: Session | null
  role: StaffRole | null
  loading: boolean
  error: string | null
  refreshSession: () => Promise<void>
}

const StaffAuthContext = createContext<StaffAuthState | null>(null)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authEventVersion = useRef(0)
  const mounted = useRef(true)

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setSession(null)
      setError(null)
      setLoading(false)
      return
    }

    const requestedVersion = authEventVersion.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!mounted.current || requestedVersion !== authEventVersion.current) return
      if (sessionError) throw sessionError
      setSession(data.session)
    } catch (sessionError) {
      if (!mounted.current || requestedVersion !== authEventVersion.current) return
      setSession(null)
      setError(sessionError instanceof Error ? sessionError.message : 'تعذر التحقق من جلسة الدخول')
    } finally {
      if (mounted.current && requestedVersion === authEventVersion.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!supabase) {
      setLoading(false)
      return () => { mounted.current = false }
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion.current += 1
      setSession(nextSession)
      setError(null)
      setLoading(false)
    })
    void refreshSession()

    return () => {
      mounted.current = false
      data.subscription.unsubscribe()
    }
  }, [refreshSession])

  const value = useMemo(
    () => ({ session, role: getStaffRole(session), loading, error, refreshSession }),
    [session, loading, error, refreshSession],
  )

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext)
  if (!context) throw new Error('useStaffAuth must be used within StaffAuthProvider')
  return context
}
