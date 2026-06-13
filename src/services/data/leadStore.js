const LEADS_KEY = 'nexus.leads'

export function loadLocalLeads() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(window.localStorage.getItem(LEADS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveLocalLeads(leads = []) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
}
