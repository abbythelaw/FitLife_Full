import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LayoutContext = createContext(null)

export const FITLIFE_BREAKPOINTS = {
  phone: 0,
  phoneWide: 480,
  tabletPortrait: 768,
  tabletLandscape: 1024,
  desktop: 1366,
  desktopWide: 1720,
}

function classify(width, height) {
  const landscape = width > height
  if (width < FITLIFE_BREAKPOINTS.tabletPortrait) return { mode: 'phone', columns: 1, landscape }
  if (width < FITLIFE_BREAKPOINTS.tabletLandscape) return { mode: 'tabletPortrait', columns: 2, landscape }
  if (width < FITLIFE_BREAKPOINTS.desktop) return { mode: 'tabletLandscape', columns: 3, landscape }
  if (width < FITLIFE_BREAKPOINTS.desktopWide) return { mode: 'desktop', columns: 4, landscape }
  return { mode: 'desktopWide', columns: 5, landscape }
}

export function ResponsiveLayoutProvider({ children }) {
  const [viewport, setViewport] = useState(() => classify(window.innerWidth, window.innerHeight))
  useEffect(() => {
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport(classify(window.innerWidth, window.innerHeight)))
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  const value = useMemo(() => ({
    ...viewport,
    isPhone: viewport.mode === 'phone',
    isTablet: viewport.mode === 'tabletPortrait' || viewport.mode === 'tabletLandscape',
    isDesktop: viewport.mode === 'desktop' || viewport.mode === 'desktopWide',
  }), [viewport])
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useResponsiveLayout() {
  return useContext(LayoutContext) || classify(window.innerWidth, window.innerHeight)
}
