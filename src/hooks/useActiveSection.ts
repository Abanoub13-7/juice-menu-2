import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks which registered section is currently most visible near the top of
 * the viewport, so the category nav can highlight it as the user scrolls.
 */
export function useActiveSection(defaultId: string) {
  const [activeId, setActiveId] = useState(defaultId)
  const sectionsRef = useRef(new Map<string, HTMLElement>())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const suppressUntil = useRef(0)

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    const sections = sectionsRef.current
    if (el) {
      sections.set(id, el)
      observerRef.current?.observe(el)
    } else {
      const existing = sections.get(id)
      if (existing && observerRef.current) observerRef.current.unobserve(existing)
      sections.delete(id)
    }
  }, [])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressUntil.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id.replace(/^cat-/, ''))
        }
      },
      { rootMargin: '-116px 0px -70% 0px', threshold: 0 },
    )
    sectionsRef.current.forEach((el) => observerRef.current?.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  /** Smoothly scrolls to a section and briefly suppresses the observer so the click target "wins". */
  const scrollToSection = useCallback((id: string) => {
    const el = sectionsRef.current.get(id)
    if (!el) return
    suppressUntil.current = Date.now() + 700
    setActiveId(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return { activeId, registerSection, scrollToSection }
}
