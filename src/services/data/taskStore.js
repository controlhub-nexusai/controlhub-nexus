const TASKS_KEY = 'nexus.tasks'

export function loadLocalTasks() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(window.localStorage.getItem(TASKS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveLocalTasks(tasks = []) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}
