const CONTENT_KEY = 'nexus.content'

export function loadLocalContent() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(window.localStorage.getItem(CONTENT_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveLocalContent(content = []) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONTENT_KEY, JSON.stringify(content))
}
