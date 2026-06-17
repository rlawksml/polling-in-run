export function normalizeLocalDevHost() {
  if (import.meta.env.PROD) {
    return
  }

  if (window.location.hostname !== '127.0.0.1') {
    return
  }

  const nextUrl = new URL(window.location.href)
  nextUrl.hostname = 'localhost'
  window.location.replace(nextUrl)
}
