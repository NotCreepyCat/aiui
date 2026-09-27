import { registerSW } from 'virtual:pwa-register'

/**
 * Installed PWAs (added to home screen) are often resumed from a frozen
 * background state by the OS instead of being freshly navigated — so the
 * normal "check for updates on page load" lifecycle can be missed for days,
 * leaving the app stuck on a stale/broken cached build. Registering the SW
 * manually (instead of the auto-injected script) lets us force an update
 * check whenever the app is actually looked at again, and apply any found
 * update immediately rather than leaving it silently waiting.
 */
export function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const checkForUpdate = () => {
        registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      window.addEventListener('focus', checkForUpdate)
      setInterval(checkForUpdate, 60 * 60 * 1000)
    },
  })
}
