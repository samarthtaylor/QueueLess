'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollToTop() {
  const pathname = usePathname()
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    for (const element of document.querySelectorAll<HTMLElement>('[data-scroll-container], main, .site-nav')) {
      if (element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY !== 'visible') {
        element.scrollTop = 0
      }
    }

    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [pathname])

  return null
}
