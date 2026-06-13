let hasLoggedMvpMode = false

export function logMvpMode() {
  if (hasLoggedMvpMode) return

  console.log('[Nexus] MVP Mode Active')
  console.log('[Nexus] Using Local Mock Data')
  hasLoggedMvpMode = true
}
