'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker aktif pada scope:', reg.scope))
        .catch((err) => console.error('Service Worker gagal:', err))
    }
  }, [])

  return null
}