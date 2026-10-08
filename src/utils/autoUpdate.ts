declare const __BUILD_ID__: string

// Phones keep the app's page for a while after a new version is published. On launch and
// whenever the app comes back to the front, compare against the published version and
// reload once if this copy is older.
async function check() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { id } = await res.json()
    if (!id || id === __BUILD_ID__) return
    // One attempt per published version, so a stubborn cache can't cause a reload loop
    if (sessionStorage.getItem('updateTried') === id) return
    sessionStorage.setItem('updateTried', id)
    const url = new URL(window.location.href)
    url.searchParams.set('v', id)   // a new address makes the phone fetch the page afresh
    window.location.replace(url.toString())
  } catch { /* offline: keep running the copy we have */ }
}

export function watchForUpdates() {
  if (!import.meta.env.PROD) return
  check()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
}
