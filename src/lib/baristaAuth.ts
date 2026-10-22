import { supabase } from './supabase'
import { OrderError } from './orders'
import type { Session } from '@supabase/supabase-js'

export type StaffRole = 'admin' | 'barista'

function requireClient() {
  if (!supabase) {
    throw new OrderError('تسجيل دخول الموظفين غير متاح حاليًا', 'Supabase is not configured')
  }
  return supabase
}

export async function signInStaff(email: string, password: string): Promise<Session> {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new OrderError(
      error ? 'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.' : 'تعذر إنشاء جلسة الدخول',
      error?.message,
    )
  }
  return data.session
}

export async function signOutStaff(): Promise<void> {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw new OrderError('تعذر تسجيل الخروج', error.message)
}

/** Roles come only from trusted Supabase app_metadata, never user-editable user_metadata. */
export function getStaffRole(session: Session | null): StaffRole | null {
  const role = session?.user.app_metadata?.role
  return role === 'admin' || role === 'barista' ? role : null
}

/** Fires on initialization, sign in/out, and token refresh. */
export function onStaffAuthChange(callback: (session: Session | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
