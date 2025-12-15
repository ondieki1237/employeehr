'use client'

import * as React from 'react'
import { api } from '@/lib/api'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const applyBranding = async () => {
      try {
        const res = await api.company.getBranding()
        if (res?.success && res.data) {
          const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderRadius, fontFamily, buttonStyle, logo } = res.data as any
          const root = document.documentElement
          if (primaryColor) {
            root.style.setProperty('--brand-primary', primaryColor)
            root.style.setProperty('--primary', primaryColor)
          }
          if (secondaryColor) {
            root.style.setProperty('--brand-secondary', secondaryColor)
          }
          if (accentColor) {
            root.style.setProperty('--brand-accent', accentColor)
            root.style.setProperty('--accent', accentColor)
          }
          if (backgroundColor) {
            root.style.setProperty('--brand-background', backgroundColor)
          }
          if (textColor) {
            root.style.setProperty('--brand-text', textColor)
          }
          if (borderRadius) {
            root.style.setProperty('--brand-radius', borderRadius)
            root.style.setProperty('--radius', borderRadius)
          }
          if (fontFamily) {
            root.style.setProperty('--brand-font', fontFamily)
          }
          if (logo) {
            root.style.setProperty('--company-logo-url', `url('${logo}')`)
          }
        }
      } catch (e) {
        // ignore
      }
    }
    applyBranding()
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
