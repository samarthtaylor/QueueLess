'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

function resetScrollPosition() {
  const scrollingElement = document.scrollingElement ?? document.documentElement
  scrollingElement.scrollTop = 0
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo(0, 0)

  for (const element of document.querySelectorAll<HTMLElement>('[data-scroll-container]')) {
    element.scrollTop = 0
  }
}

export function ScrollToTop() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
    resetScrollPosition()
  }, [pathname])

  return null
}
