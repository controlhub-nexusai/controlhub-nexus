function getJakartaNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getTaskDateTime(task) {
  if (!task?.dueDate) return null

  const dueTime = task.dueTime || '23:59'
  const dueDateTime = new Date(`${task.dueDate}T${dueTime}:00+07:00`)
  if (Number.isNaN(dueDateTime.getTime())) return null

  return dueDateTime
}

function isActiveTask(task) {
  return task?.status !== 'completed'
}

export function getTodayTasks(tasks = [], options = {}) {
  const { includeCompleted = true } = options
  const today = toDateKey(getJakartaNow())

  return tasks
    .filter((task) => task?.dueDate === today && (includeCompleted || isActiveTask(task)))
    .sort((a, b) => (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59'))
}

export function getUpcomingTasks(tasks = [], options = {}) {
  const { limit = 5, windowHours = 24 } = options
  const now = getJakartaNow()
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000)

  return tasks
    .filter(isActiveTask)
    .map((task) => ({
      task,
      dueAt: getTaskDateTime(task),
    }))
    .filter(({ dueAt }) => dueAt && dueAt.getTime() >= now.getTime() && dueAt.getTime() <= windowEnd.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, limit)
    .map(({ task, dueAt }) => ({
      ...task,
      dueAt,
    }))
}

export function getOverdueTasks(tasks = [], options = {}) {
  const { limit = 5 } = options
  const now = getJakartaNow()

  return tasks
    .filter(isActiveTask)
    .map((task) => ({
      task,
      dueAt: getTaskDateTime(task),
    }))
    .filter(({ dueAt }) => dueAt && dueAt.getTime() < now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, limit)
    .map(({ task, dueAt }) => ({
      ...task,
      dueAt,
    }))
}

export function formatReminderDateLabel(dueDate) {
  const now = getJakartaNow()
  const today = toDateKey(now)
  const tomorrow = toDateKey(addDays(now, 1))

  if (dueDate === today) return 'Today'
  if (dueDate === tomorrow) return 'Tomorrow'

  return dueDate || 'No date'
}

export function formatReminderTime(dueTime) {
  return dueTime || 'No time'
}
