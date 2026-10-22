import { useCallback, useEffect, useState } from 'react'
import { menu } from '../data/menu'
import { buildLiveCategories, getCatalog, getMenuCategories, type MenuCategory } from '../lib/catalog'
import { isSupabaseConfigured } from '../lib/supabase'

export function useLiveMenu() {
  const [categories, setCategories] = useState(menu)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      // Category metadata is optional: a missing RPC (for example when the
      // migration is not applied yet) must not take down the live menu that
      // getCatalog() provides.
      const [rows, managedCategories] = await Promise.all([
        getCatalog(),
        getMenuCategories().catch((err: unknown) => {
          if (import.meta.env.DEV) console.warn('get_menu_categories is unavailable, falling back to the static categories:', err)
          return [] as MenuCategory[]
        }),
      ])
      setCategories(buildLiveCategories(rows, menu, managedCategories))
    } catch (err) {
      if (isSupabaseConfigured) {
        setCategories([])
        setError(err instanceof Error ? err.message : 'تعذر تحميل المنيو الحالية')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return { categories, loading, error, refresh }
}
