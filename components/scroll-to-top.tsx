'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

function resetScrollPosition() {
  const scrollingElement = document.scrollingElement ?? document.documentElement
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior

  // The global stylesheet enables smooth scrolling for anchor links. Override it
  // for this route reset so the old position cannot animate back into view.
  root.style.scrollBehavior = 'auto'
  scrollingElement.scrollTop = 0
  root.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

  for (const element of document.querySelectorAll<HTMLElement>('[data-scroll-container]')) {
    element.scrollTop = 0
  }

  root.style.scrollBehavior = previousBehavior
}

export function ScrollToTop() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
    resetScrollPosition()
  }, [pathname])

  return null
}
