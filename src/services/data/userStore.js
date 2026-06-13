const USER_KEY = 'nexus.userProfile'

export function loadLocalUser() {
  if (typeof window === 'undefined') return null

  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveLocalUser(user) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}
